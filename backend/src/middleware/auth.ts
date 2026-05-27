import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {prisma} from '../config/database';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({message: 'Authentication token required'});
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {userId: string};
    const user = await prisma.user.findUnique({
      where: {id: decoded.userId},
      select: {id: true, email: true, name: true},
    });

    if (!user) {
      return res.status(401).json({message: 'User not found'});
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({message: 'Invalid or expired token'});
    }
    next(error);
  }
};

