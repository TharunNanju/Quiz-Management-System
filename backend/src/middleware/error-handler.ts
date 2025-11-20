import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import logger from '../config/logger.js';

interface ApiError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  err: unknown,
  _: Request,
  res: Response,
  _next: NextFunction
) => {
  void _next;
  if (err instanceof ZodError) {
    const zodError = err as ZodError;
    const details = zodError.flatten();
    logger.warn({ err: zodError }, 'Validation error');
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      details
    });
  }

  const apiError = err as ApiError;
  const statusCode = apiError.statusCode || 500;
  const message = apiError.message || 'Internal Server Error';

  logger.error({ err: apiError }, 'Request failed');

  res.status(statusCode).json({
    status: 'error',
    message,
    details: apiError.details
  });
};
