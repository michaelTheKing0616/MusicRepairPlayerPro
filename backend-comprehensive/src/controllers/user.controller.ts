import {Request, Response, NextFunction} from 'express';

export const userController = {
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Get profile - to be implemented'});
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Update profile - to be implemented'});
  },

  uploadAvatar: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Upload avatar - to be implemented'});
  },

  getPreferences: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Get preferences - to be implemented'});
  },

  updatePreferences: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Update preferences - to be implemented'});
  },
};

