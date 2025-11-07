import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '../utils/jwt.js';
import { findById } from '../repositories/user.repository.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: 'student' | 'teacher' | 'admin';
    name: string;
    email: string;
  };
  cookies?: Record<string, string>;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const payload = verifyAccessToken(token);
    const user = await findById(payload.sub);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }

    req.user = {
      id: user.userId,
      role: user.role,
      name: user.name,
      email: user.email
    };

    return next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

export const requireRoles = (roles: Array<'student' | 'teacher' | 'admin'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    return next();
  };
};
