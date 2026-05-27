/**
 * Audio controller
 */

import {Request, Response, NextFunction} from 'express';
import multer from 'multer';
import {AuthRequest} from '../middleware/auth';
import {storageService} from '../services/storage.service';
import {audioAnalysisService} from '../services/audioAnalysis.service';
import {logger} from '../utils/logger';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000'), // 100MB default
  },
});

export const audioController = {
  upload: [
    upload.single('audio'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return res.status(400).json({error: {message: 'No file uploaded'}});
        }

        const userId = req.userId!;
        const {originalname, buffer, mimetype} = req.file;

        // Upload to Supabase Storage
        const {path, url} = await storageService.uploadAudio(
          buffer,
          originalname,
          userId,
        );

        // TODO: Save metadata to database
        // const audioFile = await db.audioFiles.create({
        //   userId,
        //   filename: originalname,
        //   fileSize: buffer.length,
        //   mimeType: mimetype,
        //   supabasePath: path,
        //   supabaseUrl: url,
        // });

        res.json({
          id: 'temp-id', // Replace with actual ID from database
          path,
          url,
          filename: originalname,
          fileSize: buffer.length,
          mimeType: mimetype,
        });
      } catch (error) {
        logger.error('Error uploading audio:', error);
        next(error);
      }
    },
  ],

  getAudioFile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {id} = req.params;
      const userId = req.userId!;

      // TODO: Fetch from database
      // const audioFile = await db.audioFiles.findOne({
      //   where: {id, userId},
      // });

      // For now, return placeholder
      res.json({
        id,
        message: 'Get audio file - database integration needed',
      });
    } catch (error) {
      logger.error('Error getting audio file:', error);
      next(error);
    }
  },

  repair: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {id} = req.params;
      const {modelType} = req.body;
      const userId = req.userId!;

      // TODO: Add repair job to queue
      // const job = await repairQueue.add({
      //   audioFileId: id,
      //   userId,
      //   modelType: modelType || 'deepfilternet',
      // });

      res.json({
        jobId: 'temp-job-id',
        status: 'queued',
        message: 'Repair job queued - queue integration needed',
      });
    } catch (error) {
      logger.error('Error starting repair:', error);
      next(error);
    }
  },

  getRepairStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {id} = req.params;

      // TODO: Get job status from queue
      // const job = await repairQueue.getJob(id);

      res.json({
        id,
        status: 'processing',
        progress: 50,
        message: 'Get repair status - queue integration needed',
      });
    } catch (error) {
      logger.error('Error getting repair status:', error);
      next(error);
    }
  },

  analyze: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {id} = req.params;
      const {audioUrl} = req.body;

      if (!audioUrl && !id) {
        return res.status(400).json({error: {message: 'audioUrl or id required'}});
      }

      // Use provided URL or fetch from database
      const url = audioUrl || 'temp-url';

      // Analyze audio
      const analysis = await audioAnalysisService.analyzeAudio(url);

      res.json(analysis);
    } catch (error) {
      logger.error('Error analyzing audio:', error);
      next(error);
    }
  },

  transcribe: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {audioData, language} = req.body;

      if (!audioData) {
        return res.status(400).json({error: {message: 'audioData required'}});
      }

      // TODO: Integrate with Whisper API
      // const transcription = await whisperService.transcribe(audioData, language);

      // For now, return placeholder
      res.json({
        text: 'Transcription placeholder',
        segments: [],
        language: language || 'en',
        message: 'Transcription - Whisper API integration needed',
      });
    } catch (error) {
      logger.error('Error transcribing audio:', error);
      next(error);
    }
  },

  delete: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {id} = req.params;
      const userId = req.userId!;

      // TODO: Get file path from database and delete
      // const audioFile = await db.audioFiles.findOne({where: {id, userId}});
      // await storageService.deleteAudio(audioFile.supabasePath);
      // await db.audioFiles.destroy({where: {id, userId}});

      res.json({message: 'File deleted - database integration needed'});
    } catch (error) {
      logger.error('Error deleting audio:', error);
      next(error);
    }
  },
};

