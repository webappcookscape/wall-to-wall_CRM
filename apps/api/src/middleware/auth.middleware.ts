import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { apiResponse } from '../utils/apiUtils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cookscape_crm_secret';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return apiResponse.error(res, 'Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return apiResponse.error(res, 'Access denied. Invalid token format.', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user payload to request
    next();
  } catch (error) {
    return apiResponse.error(res, 'Invalid or expired token.', 401);
  }
};
