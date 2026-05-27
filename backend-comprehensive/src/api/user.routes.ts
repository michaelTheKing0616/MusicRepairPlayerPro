import {Router} from 'express';
import {authenticate} from '../middleware/auth';
import {userController} from '../controllers/user.controller';

export const userRoutes = Router();

userRoutes.get('/profile', authenticate, userController.getProfile);
userRoutes.put('/profile', authenticate, userController.updateProfile);
userRoutes.post('/avatar', authenticate, userController.uploadAvatar);
userRoutes.get('/preferences', authenticate, userController.getPreferences);
userRoutes.put('/preferences', authenticate, userController.updatePreferences);

