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

// Latest creator info (nickname, privacy options, interaction settings, max duration)
videoRoutes.get(
  '/creator-info',
  authMiddleware,
  (req, res, next) => videoController.getCreatorInfo(req, res, next),
);

// Direct post to TikTok
videoRoutes.post(
  '/publish',
  authMiddleware,
  upload.single('video'),
  (req, res, next) => videoController.publishVideo(req, res, next),
);

// Processing / publish status of a post
videoRoutes.get(
  '/status/:publishId',
  authMiddleware,
  (req, res, next) => videoController.getPublishStatus(req, res, next),
);
