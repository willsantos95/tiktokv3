import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../types/index.js';
export declare class VideoController {
    uploadDraft(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void>;
    publishVideo(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void>;
}
export declare const videoController: VideoController;
//# sourceMappingURL=video.controller.d.ts.map