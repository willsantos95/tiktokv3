import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../../shared/constants/error-codes.js';
import { ApiResponse } from '../../types/index.js';
export declare class AppError extends Error {
    code: ErrorCode;
    statusCode: number;
    details?: unknown;
    constructor(code: ErrorCode, statusCode: number, details?: unknown);
}
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response<ApiResponse>, next: NextFunction) => any;
//# sourceMappingURL=error-handler.d.ts.map