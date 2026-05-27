import {supabase, STORAGE_BUCKET} from '../config/supabase';
import path from 'path';
import fs from 'fs/promises';
import {exec} from 'child_process';
import {promisify} from 'util';
import os from 'os';
import {v4 as uuidv4} from 'uuid';

const execAsync = promisify(exec);

interface AudioRepairResult {
  status: 'success' | 'error';
  url?: string;
  error?: string;
}

interface AudioEnhancementSettings {
  eq?: {
    enabled: boolean;
    bands: Array<{frequency: number; gain: number}>;
  };
  bassBoost?: {
    enabled: boolean;
    level: number;
  };
  trebleEnhancer?: {
    enabled: boolean;
    level: number;
  };
  compressor?: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  normalizer?: {
    enabled: boolean;
    targetLevel: number;
  };
  autoEQ?: {
    enabled: boolean;
    mode: string;
    targetLUFS?: number;
  };
}

/**
 * Audio Repair Service
 * 
 * Pipeline:
 * 1. Denoise using DeepFilterNet
 * 2. Source separation using Demucs
 * 3. Recombine + enhance
 * 4. Normalize using loudness leveling algorithm
 * 5. Export cleaned file to cloud storage
 */
export class AudioRepairService {
  private readonly tempDir: string;
  private readonly pythonScriptPath: string;

  constructor() {
    // Get the ML service path (adjust based on your project structure)
    const projectRoot = path.resolve(__dirname, '../../..');
    this.tempDir = path.join(os.tmpdir(), 'audio-repair');
    this.pythonScriptPath = path.join(projectRoot, 'ml', 'pipeline.py');
  }

  /**
   * Process audio repair pipeline
   * 
   * @param inputFilePath - Path to input file in Supabase storage (e.g., "userId/filename.mp3")
   * @param outputFilePath - Path where output should be saved in Supabase storage
   * @param enhancementSettings - Optional audio enhancement settings
   * @returns Promise with result containing status and URL
   */
  async repairAudio(
    inputFilePath: string,
    outputFilePath: string,
    enhancementSettings?: AudioEnhancementSettings,
  ): Promise<AudioRepairResult> {
    let localInputPath: string | null = null;
    let localOutputPath: string | null = null;

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, {recursive: true});

      // Generate unique temporary file names
      const tempId = uuidv4();
      const inputExtension = path.extname(inputFilePath);
      localInputPath = path.join(this.tempDir, `input_${tempId}${inputExtension}`);
      localOutputPath = path.join(
        this.tempDir,
        `output_${tempId}${inputExtension}`,
      );

      // Step 1: Download file from Supabase
      console.log(`Downloading file from Supabase: ${inputFilePath}`);
      await this.downloadFromSupabase(inputFilePath, localInputPath);

      // Step 2: Run ML pipeline (with enhancement settings if provided)
      console.log('Running audio repair pipeline...');
      await this.runPipeline(
        localInputPath,
        localOutputPath,
        enhancementSettings,
      );

      // Step 3: Upload result to Supabase
      console.log(`Uploading result to Supabase: ${outputFilePath}`);
      const publicUrl = await this.uploadToSupabase(localOutputPath, outputFilePath);

      // Clean up temporary files
      await this.cleanup([localInputPath, localOutputPath]);

      return {
        status: 'success',
        url: publicUrl,
      };
    } catch (error: any) {
      console.error('Audio repair error:', error);

      // Clean up temporary files on error
      if (localInputPath || localOutputPath) {
        await this.cleanup([localInputPath, localOutputPath].filter(Boolean) as string[]);
      }

      return {
        status: 'error',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Download file from Supabase storage
   */
  private async downloadFromSupabase(
    supabasePath: string,
    localPath: string,
  ): Promise<void> {
    const {data, error} = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(supabasePath);

    if (error) {
      throw new Error(`Failed to download from Supabase: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data received from Supabase');
    }

    // Convert Blob to buffer and write to file
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(localPath, buffer);
  }

  /**
   * Run the ML pipeline using Python script
   */
  private async runPipeline(
    inputPath: string,
    outputPath: string,
    enhancementSettings?: AudioEnhancementSettings,
  ): Promise<void> {
    try {
      // Check if Python script exists
      let scriptPath = this.pythonScriptPath;
      
      // Use enhanced pipeline if settings are provided
      if (enhancementSettings) {
        const enhancedPath = path.join(
          path.dirname(this.pythonScriptPath),
          'enhanced_pipeline.py',
        );
        try {
          await fs.access(enhancedPath);
          scriptPath = enhancedPath;
        } catch {
          console.warn(
            'Enhanced pipeline not found, using base pipeline without enhancements',
          );
        }
      }
      
      try {
        await fs.access(scriptPath);
      } catch {
        throw new Error(`Python pipeline script not found at: ${scriptPath}`);
      }

      // Create settings file if enhancements are provided
      let settingsPath: string | null = null;
      if (enhancementSettings) {
        settingsPath = path.join(
          path.dirname(inputPath),
          `settings_${Date.now()}.json`,
        );
        await fs.writeFile(
          settingsPath,
          JSON.stringify(enhancementSettings, null, 2),
        );
      }

      // Run Python pipeline script
      let command = `python "${scriptPath}" "${inputPath}" "${outputPath}"`;
      if (settingsPath) {
        command += ` --settings "${settingsPath}"`;
      }

      const {stdout, stderr} = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        env: {
          ...process.env,
          PYTHONPATH: path.dirname(scriptPath),
        },
      });

      if (stderr && !stderr.includes('WARNING')) {
        console.warn('Python script warnings:', stderr);
      }

      // Clean up settings file
      if (settingsPath) {
        try {
          await fs.unlink(settingsPath);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Verify output file was created
      try {
        await fs.access(outputPath);
      } catch {
        throw new Error(
          `Pipeline did not create output file. stdout: ${stdout}, stderr: ${stderr}`,
        );
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          'Python not found. Please ensure Python 3.8+ is installed and in PATH.',
        );
      }
      throw new Error(`Pipeline execution failed: ${error.message}`);
    }
  }

  /**
   * Upload file to Supabase storage
   */
  private async uploadToSupabase(
    localPath: string,
    supabasePath: string,
  ): Promise<string> {
    // Read file from local path
    const fileBuffer = await fs.readFile(localPath);

    // Upload to Supabase
    const {data, error} = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(supabasePath, fileBuffer, {
        contentType: this.getContentType(localPath),
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Get public URL
    const {
      data: {publicUrl},
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(supabasePath);

    return publicUrl;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
    };

    return contentTypes[ext] || 'audio/mpeg';
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      if (!filePath) continue;

      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Failed to delete temporary file ${filePath}:`, error);
      }
    }
  }

  /**
   * Clean up old temporary files (call periodically)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old temporary file: ${file}`);
          }
        } catch (error) {
          console.warn(`Error checking file ${file}:`, error);
        }
      }
    } catch (error) {
      // Temp directory might not exist yet
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error cleaning up temporary files:', error);
      }
    }
  }
}

// Export singleton instance
export const audioRepairService = new AudioRepairService();

