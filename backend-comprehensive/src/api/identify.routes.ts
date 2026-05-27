import {Router} from 'express';
import {authenticate} from '../middleware/auth';
import {identifyController} from '../controllers/identify.controller';

export const identifyRoutes = Router();

identifyRoutes.post('/audio', authenticate, identifyController.identifyFromAudio);
identifyRoutes.post('/fingerprint', authenticate, identifyController.identifyFromFingerprint);

