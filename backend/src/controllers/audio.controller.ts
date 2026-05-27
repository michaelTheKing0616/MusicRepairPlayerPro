import {Response, NextFunction} from 'express';
import {v4 as uuidv4} from 'uuid';
import {AuthRequest} from '../middleware/auth';
import {prisma} from '../config/database';
import {supabase, STORAGE_BUCKET} from '../config/supabase';
import {audioRepairService} from '../services/audioRepairService';
import {z} from 'zod';

const repairSchema = z.object({
  audioFileId: z.string().uuid(),
  modelType: z.enum(['deepfilternet', 'demucs', 'uvr']),
  enhancementSettings: z
    .object({
      eq: z
        .object({
          enabled: z.boolean(),
          bands: z.array(
            z.object({frequency: z.number(), gain: z.number()}),
          ),
        })
        .optional(),
      bassBoost: z
        .object({
          enabled: z.boolean(),
          level: z.number(),
        })
        .optional(),
      trebleEnhancer: z
        .object({
          enabled: z.boolean(),
          level: z.number(),
        })
        .optional(),
      compressor: z
        .object({
          enabled: z.boolean(),
          threshold: z.number(),
          ratio: z.number(),
          attack: z.number(),
          release: z.number(),
        })
        .optional(),
      normalizer: z
        .object({
          enabled: z.boolean(),
          targetLevel: z.number(),
        })
        .optional(),
      autoEQ: z
        .object({
          enabled: z.boolean(),
          mode: z.string(),
          targetLUFS: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const uploadAudioFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({message: 'No file uploaded'});
    }

    const userId = req.userId!;
    const file = req.file;
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${fileExtension}`;
    const filePath = `${userId}/${filename}`;

    // Upload to Supabase Storage
    const {data: uploadData, error: uploadError} = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({message: 'Failed to upload file to storage'});
    }

    // Get public URL
    const {
      data: {publicUrl},
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

    // Save to database
    const audioFile = await prisma.audioFile.create({
      data: {
        userId,
        filename,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        supabaseUrl: publicUrl,
        supabasePath: filePath,
        status: 'UPLOADED',
      },
    });

    res.status(201).json(audioFile);
  } catch (error) {
    next(error);
  }
};

export const getAudioFiles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId!;
    const audioFiles = await prisma.audioFile.findMany({
      where: {userId},
      orderBy: {createdAt: 'desc'},
    });

    // Convert enum values to lowercase for frontend
    const formattedFiles = audioFiles.map(file => ({
      ...file,
      status: file.status.toLowerCase(),
    }));

    res.json(formattedFiles);
  } catch (error) {
    next(error);
  }
};

export const getAudioFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId!;
    const {id} = req.params;

    const audioFile = await prisma.audioFile.findFirst({
      where: {
        id,
        userId, // Ensure user owns this file
      },
    });

    if (!audioFile) {
      return res.status(404).json({message: 'Audio file not found'});
    }

    // Convert enum values to lowercase for frontend
    const formattedFile = {
      ...audioFile,
      status: audioFile.status.toLowerCase(),
    };

    res.json(formattedFile);
  } catch (error) {
    next(error);
  }
};

export const deleteAudioFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId!;
    const {id} = req.params;

    // Find file and verify ownership
    const audioFile = await prisma.audioFile.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!audioFile) {
      return res.status(404).json({message: 'Audio file not found'});
    }

    // Delete from Supabase Storage
    const {error: deleteError} = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([audioFile.supabasePath]);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      // Continue with database deletion even if storage delete fails
    }

    // Delete from database (cascade will delete repair requests)
    await prisma.audioFile.delete({
      where: {id},
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const repairAudio = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId!;
    const {audioFileId, modelType, enhancementSettings} = repairSchema.parse(
      req.body,
    );

    // Verify audio file exists and user owns it
    const audioFile = await prisma.audioFile.findFirst({
      where: {
        id: audioFileId,
        userId,
      },
    });

    if (!audioFile) {
      return res.status(404).json({message: 'Audio file not found'});
    }

    // Create repair request
    const repairRequest = await prisma.audioRepairRequest.create({
      data: {
        audioFileId,
        userId,
        modelType: modelType.toUpperCase() as 'DEEPFILTERNET' | 'DEMUCS' | 'UVR',
        status: 'PENDING',
      },
    });

    // Update audio file status to processing
    await prisma.audioFile.update({
      where: {id: audioFileId},
      data: {status: 'PROCESSING'},
    });

    // Update repair request status to processing
    await prisma.audioRepairRequest.update({
      where: {id: repairRequest.id},
      data: {status: 'PROCESSING'},
    });

    // Process audio repair asynchronously (fire and forget)
    processAudioRepairAsync(
      repairRequest.id,
      audioFile,
      repairRequest.modelType,
      enhancementSettings,
    ).catch(error => {
      console.error(`Error processing repair request ${repairRequest.id}:`, error);
    });

    // Convert enum values to lowercase for frontend
    const formattedRequest = {
      ...repairRequest,
      modelType: repairRequest.modelType.toLowerCase() as 'deepfilternet' | 'demucs' | 'uvr',
      status: 'processing',
    };

    res.status(201).json(formattedRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const getRepairRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId!;
    const {id} = req.params;

    const repairRequest = await prisma.audioRepairRequest.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        audioFile: true,
      },
    });

    if (!repairRequest) {
      return res.status(404).json({message: 'Repair request not found'});
    }

    // Convert enum values to lowercase for frontend
    const formattedRequest = {
      ...repairRequest,
      modelType: repairRequest.modelType.toLowerCase() as 'deepfilternet' | 'demucs' | 'uvr',
      status: repairRequest.status.toLowerCase(),
      audioFile: {
        ...repairRequest.audioFile,
        status: repairRequest.audioFile.status.toLowerCase(),
      },
    };

    res.json(formattedRequest);
  } catch (error) {
    next(error);
  }
};

export const getRepairRequests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.userId!;
    const {audioFileId} = req.query;

    const where: any = {userId};
    if (audioFileId) {
      where.audioFileId = audioFileId as string;
    }

    const repairRequests = await prisma.audioRepairRequest.findMany({
      where,
      orderBy: {createdAt: 'desc'},
      include: {
        audioFile: true,
      },
    });

    // Convert enum values to lowercase for frontend
    const formattedRequests = repairRequests.map(request => ({
      ...request,
      modelType: request.modelType.toLowerCase() as 'deepfilternet' | 'demucs' | 'uvr',
      status: request.status.toLowerCase(),
      audioFile: {
        ...request.audioFile,
        status: request.audioFile.status.toLowerCase(),
      },
    }));

    res.json(formattedRequests);
  } catch (error) {
    next(error);
  }
};

/**
 * Process audio repair asynchronously
 * This function runs the complete ML pipeline and updates the database
 */
async function processAudioRepairAsync(
  repairRequestId: string,
  audioFile: any,
  modelType: string,
  enhancementSettings?: any,
): Promise<void> {
  try {
    // Generate output file path
    const userId = audioFile.userId;
    const fileExtension = audioFile.filename.split('.').pop();
    const outputFilename = `repaired_${audioFile.id}.${fileExtension}`;
    const outputFilePath = `${userId}/${outputFilename}`;

    // Run the audio repair pipeline with enhancement settings
    const result = await audioRepairService.repairAudio(
      audioFile.supabasePath,
      outputFilePath,
      enhancementSettings,
    );

    if (result.status === 'success' && result.url) {
      // Update repair request with success
      await prisma.audioRepairRequest.update({
        where: {id: repairRequestId},
        data: {
          status: 'COMPLETED',
          repairedAudioUrl: result.url,
          repairedAudioPath: outputFilePath,
        },
      });

      // Update audio file status to completed
      await prisma.audioFile.update({
        where: {id: audioFile.id},
        data: {status: 'COMPLETED'},
      });

      console.log(
        `✅ Repair request ${repairRequestId} completed successfully. Output: ${result.url}`,
      );
    } else {
      // Update repair request with error
      await prisma.audioRepairRequest.update({
        where: {id: repairRequestId},
        data: {
          status: 'FAILED',
          errorMessage: result.error || 'Unknown error occurred',
        },
      });

      // Update audio file status to failed
      await prisma.audioFile.update({
        where: {id: audioFile.id},
        data: {status: 'FAILED'},
      });

      console.error(
        `❌ Repair request ${repairRequestId} failed: ${result.error}`,
      );
    }
  } catch (error: any) {
    console.error(`Error in audio repair processing:`, error);

    // Update repair request with error
    try {
      await prisma.audioRepairRequest.update({
        where: {id: repairRequestId},
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Processing error occurred',
        },
      });

      // Update audio file status to failed
      await prisma.audioFile.update({
        where: {id: audioFile.id},
        data: {status: 'FAILED'},
      });
    } catch (updateError) {
      console.error('Error updating repair request status:', updateError);
    }
  }
}

