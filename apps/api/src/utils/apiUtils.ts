import type { Request, Response, NextFunction } from 'express';

/**
 * Higher-order function to wrap async express routes and handle errors
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Standardized API response structure
 */
export const apiResponse = {
  success: (res: Response, data: any, message = 'Success', status = 200) => {
    return res.status(status).json({
      success: true,
      message,
      data
    });
  },
  error: (res: Response, message = 'Internal Server Error', status = 500, error: any = null) => {
    return res.status(status).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
