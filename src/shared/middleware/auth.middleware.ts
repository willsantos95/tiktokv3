import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/middleware/error-handler.js';
import { ErrorCode } from '../../shared/constants/error-codes.js';
import { SessionUser } from '../../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session || !req.session.user) {
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      401,
    );
  }

  req.user = req.session.user;
  next();
};

export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
};
