import {Request, Response, NextFunction} from 'express';

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Register - to be implemented'});
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Login - to be implemented'});
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Refresh - to be implemented'});
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    res.json({message: 'Logout - to be implemented'});
  },
};

