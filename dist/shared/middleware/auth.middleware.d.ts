import { Request, Response, NextFunction } from 'express';
import { SessionUser } from '../../types/index.js';
declare global {
    namespace Express {
        interface Request {
            user?: SessionUser;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map