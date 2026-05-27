import {Request, Response, NextFunction} from 'express';

export const identifyController = {
  identifyFromAudio: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Identify from audio - to be implemented'});
  },

  identifyFromFingerprint: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Identify from fingerprint - to be implemented'});
  },
};

