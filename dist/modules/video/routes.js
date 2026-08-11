import { Router } from 'express';
import multer from 'multer';
import { videoController } from '../../modules/video/controllers/video.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { config } from '../../config/index.js';
const upload = multer({
    dest: config.upload.tempDir,
    limits: { fileSize: config.upload.maxSize },
});
export const videoRoutes = Router();
// Protected routes (requires authentication)
videoRoutes.post('/upload-draft', authMiddleware, upload.single('video'), (req, res, next) => videoController.uploadDraft(req, res, next));
videoRoutes.post('/publish', authMiddleware, upload.single('video'), (req, res, next) => videoController.publishVideo(req, res, next));
//# sourceMappingURL=routes.js.map