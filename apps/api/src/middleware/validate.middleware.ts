import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { apiResponse } from '../utils/apiUtils.js';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
        return apiResponse.error(res, message, 400);
      }
      return apiResponse.error(res, 'Internal Server Error during validation', 500);
    }
  };
};
