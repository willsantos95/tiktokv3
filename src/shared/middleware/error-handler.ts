import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/utils/logger.js';
import { ErrorCode, ERROR_MESSAGES } from '../../shared/constants/error-codes.js';
import { ApiResponse } from '../../types/index.js';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) => {
  logger.error(`Error: ${err.message}`, { url: req.url, method: req.method });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      timestamp: new Date(),
    });
  }

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR],
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    timestamp: new Date(),
  });
};
