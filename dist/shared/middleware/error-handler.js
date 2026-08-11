import { logger } from '../../shared/utils/logger.js';
import { ErrorCode, ERROR_MESSAGES } from '../../shared/constants/error-codes.js';
export class AppError extends Error {
    constructor(code, statusCode, details) {
        super(ERROR_MESSAGES[code]);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
export const errorHandler = (err, req, res, next) => {
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
//# sourceMappingURL=error-handler.js.map