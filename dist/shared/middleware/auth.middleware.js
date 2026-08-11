import { AppError } from '../../shared/middleware/error-handler.js';
import { ErrorCode } from '../../shared/constants/error-codes.js';
export const authMiddleware = (req, res, next) => {
    if (!req.session || !req.session.user) {
        throw new AppError(ErrorCode.UNAUTHORIZED, 401);
    }
    req.user = req.session.user;
    next();
};
export const optionalAuthMiddleware = (req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
};
//# sourceMappingURL=auth.middleware.js.map