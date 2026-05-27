/**
 * Audio processing routes
 */

import {Router} from 'express';
import {authenticate} from '../middleware/auth';
import {audioController} from '../controllers/audio.controller';

export const audioRoutes = Router();

// Audio upload
audioRoutes.post('/upload', authenticate, audioController.upload);

// Get audio file
audioRoutes.get('/:id', authenticate, audioController.getAudioFile);

// Audio repair
audioRoutes.post('/:id/repair', authenticate, audioController.repair);

// Get repair status
audioRoutes.get('/:id/repair/status', authenticate, audioController.getRepairStatus);

// Audio analysis for optimization
audioRoutes.post('/:id/analyze', authenticate, audioController.analyze);

// Audio transcription
audioRoutes.post('/transcribe', authenticate, audioController.transcribe);

// Delete audio file
audioRoutes.delete('/:id', authenticate, audioController.delete);

