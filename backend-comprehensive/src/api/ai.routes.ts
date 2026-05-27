/**
 * AI service routes
 */

import {Router} from 'express';
import {authenticate} from '../middleware/auth';
import {aiController} from '../controllers/ai.controller';

export const aiRoutes = Router();

// Generate AI voice response
aiRoutes.post('/voice-response', authenticate, aiController.generateVoiceResponse);

// Smart playlist generation
aiRoutes.post('/playlist/generate', authenticate, aiController.generatePlaylist);

// Music recommendations
aiRoutes.get('/recommendations', authenticate, aiController.getRecommendations);

