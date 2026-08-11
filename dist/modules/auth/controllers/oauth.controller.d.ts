import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../types/index.js';
export declare class OAuthController {
    getAuthUrl(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void>;
    handleCallback(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<any>;
    getUser(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void>;
    logout(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void>;
}
export declare const oauthController: OAuthController;
//# sourceMappingURL=oauth.controller.d.ts.map