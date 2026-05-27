import {Router} from 'express';
import multer from 'multer';
import {authenticateToken} from '../middleware/auth';
import {
  uploadAudioFile,
  getAudioFiles,
  getAudioFile,
  deleteAudioFile,
  repairAudio,
  getRepairRequest,
  getRepairRequests,
} from '../controllers/audio.controller';

export const audioRoutes = Router();

// Configure multer for file uploads (updated for multer 2.x)
// Multer 2.x is backward compatible with 1.x API but includes security fixes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/flac',
      'audio/aac',
      'audio/ogg',
      'audio/m4a',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// All audio routes require authentication
audioRoutes.use(authenticateToken);

// Audio file routes
audioRoutes.post('/upload', upload.single('file'), uploadAudioFile);
audioRoutes.get('/files', getAudioFiles);
audioRoutes.get('/files/:id', getAudioFile);
audioRoutes.delete('/files/:id', deleteAudioFile);

// Audio repair routes
audioRoutes.post('/repair', repairAudio);
audioRoutes.get('/repair', getRepairRequests);
audioRoutes.get('/repair/:id', getRepairRequest);
