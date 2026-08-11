import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { videoService } from '../../../modules/video/services/video.service.js';
import { oauthService } from '../../../modules/auth/services/oauth.service.js';
import { logger } from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/error-handler.js';
import { ErrorCode } from '../../../shared/constants/error-codes.js';
import { VideoMetadata, ApiResponse } from '../../../types/index.js';

export class VideoController {
  async uploadDraft(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    let tempFilePath: string | null = null;

    try {
      if (!req.user) {
        logger.error('❌ Unauthorized upload attempt - no user in session');
        throw new AppError(ErrorCode.UNAUTHORIZED, 401, { message: 'User session not found' });
      }

      logger.info('📤 Upload Draft Request Received', {
        userId: req.user.openId.substring(0, 8) + '...',
      });

      const { title, privacyLevel, disableDuet, disableComment, disableStitch } = req.body;
      const videoFile = req.file;

      // Validate video file
      videoService.validateVideoFile(videoFile as Express.Multer.File);

      tempFilePath = videoFile!.path;

      // Validate metadata
      const metadata: VideoMetadata = {
        title: title || 'Video',
        privacyLevel: privacyLevel || 'SELF_ONLY',
        disableDuet: disableDuet === 'true' || disableDuet === true,
        disableComment: disableComment === 'true' || disableComment === true,
        disableStitch: disableStitch === 'true' || disableStitch === true,
      };

      videoService.validateMetadata(metadata);

      logger.info('📤 Upload Draft Started', {
        title: metadata.title.substring(0, 50),
        privacy: metadata.privacyLevel,
        fileSize: `${(videoFile!.size / 1024 / 1024).toFixed(2)}MB`,
      });

      // Check token expiration and refresh if needed
      if (oauthService.isTokenExpired(req.user.expiresAt)) {
        logger.info('🔄 Token expired, refreshing before upload');

        const refreshedTokenData = await oauthService.refreshAccessToken(
          req.user.refreshToken,
        );

        req.user.accessToken = refreshedTokenData.access_token;
        req.user.refreshToken = refreshedTokenData.refresh_token;
        req.user.expiresAt = new Date(Date.now() + refreshedTokenData.expires_in * 1000);

        if (req.session) {
          req.session.user = req.user;
          await new Promise((resolve, reject) => {
            req.session!.save((err: any) => {
              if (err) reject(err);
              else resolve(null);
            });
          });
          logger.info('✅ Session updated with refreshed token');
        }
      }

      // Initialize upload
      const fileSize = fs.statSync(tempFilePath).size;
      const uploadToken = await videoService.initializeUpload(req.user, fileSize);

      // Upload video - use chunked upload for files > 10MB, simple upload otherwise
      const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10MB
      if (fileSize > CHUNK_THRESHOLD) {
        logger.info('📤 Using chunked upload for large file', {
          fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        });
        await videoService.uploadVideoFile(req.user, uploadToken, tempFilePath);
      } else {
        logger.info('📤 Using simple upload for small file', {
          fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        });
        const videoBuffer = fs.readFileSync(tempFilePath);
        await videoService.uploadVideoChunk(req.user, uploadToken, videoBuffer, 1, fileSize);
      }

      // Finalize upload as draft
      const videoId = await videoService.finalizeUpload(
        req.user,
        uploadToken,
        metadata,
        'DRAFT',
      );

      logger.info('✅ Draft upload completed successfully', {
        videoId,
        title: metadata.title.substring(0, 30),
        privacy: metadata.privacyLevel,
      });

      res.json({
        success: true,
        message: 'Video uploaded as draft successfully',
        data: { videoId },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('❌ Draft upload failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (tempFilePath) {
        videoService.cleanupTempFile(tempFilePath);
      }

      next(error);
    }
  }

  async publishVideo(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    let tempFilePath: string | null = null;

    try {
      if (!req.user) {
        logger.error('❌ Unauthorized publish attempt - no user in session');
        throw new AppError(ErrorCode.UNAUTHORIZED, 401, { message: 'User session not found' });
      }

      logger.info('🚀 Publish Video Request Received', {
        userId: req.user.openId.substring(0, 8) + '...',
      });

      const { title, hashtags, privacyLevel, disableDuet, disableComment, disableStitch } = req.body;
      const videoFile = req.file;

      // Validate video file
      videoService.validateVideoFile(videoFile as Express.Multer.File);

      tempFilePath = videoFile!.path;

      // Validate metadata
      const description = (title || '').trim() + (hashtags ? ' ' + hashtags.trim() : '');
      const metadata: VideoMetadata = {
        title: description.trim() || 'Video',
        privacyLevel: privacyLevel || 'SELF_ONLY',
        disableDuet: disableDuet === 'true' || disableDuet === true,
        disableComment: disableComment === 'true' || disableComment === true,
        disableStitch: disableStitch === 'true' || disableStitch === true,
      };

      videoService.validateMetadata(metadata);

      logger.info('🚀 Publish Started', {
        title: metadata.title.substring(0, 50),
        privacy: metadata.privacyLevel,
        fileSize: `${(videoFile!.size / 1024 / 1024).toFixed(2)}MB`,
      });

      // Check token expiration and refresh if needed
      if (oauthService.isTokenExpired(req.user.expiresAt)) {
        logger.info('🔄 Token expired, refreshing before publish');

        const refreshedTokenData = await oauthService.refreshAccessToken(
          req.user.refreshToken,
        );

        req.user.accessToken = refreshedTokenData.access_token;
        req.user.refreshToken = refreshedTokenData.refresh_token;
        req.user.expiresAt = new Date(Date.now() + refreshedTokenData.expires_in * 1000);

        if (req.session) {
          req.session.user = req.user;
          await new Promise((resolve, reject) => {
            req.session!.save((err: any) => {
              if (err) reject(err);
              else resolve(null);
            });
          });
          logger.info('✅ Session updated with refreshed token');
        }
      }

      // Initialize upload
      const fileSize = fs.statSync(tempFilePath).size;
      const uploadToken = await videoService.initializeUpload(req.user, fileSize);

      // Upload video - use chunked upload for files > 10MB, simple upload otherwise
      const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10MB
      if (fileSize > CHUNK_THRESHOLD) {
        logger.info('📤 Using chunked upload for large file', {
          fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        });
        await videoService.uploadVideoFile(req.user, uploadToken, tempFilePath);
      } else {
        logger.info('📤 Using simple upload for small file', {
          fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        });
        const videoBuffer = fs.readFileSync(tempFilePath);
        await videoService.uploadVideoChunk(req.user, uploadToken, videoBuffer, 1, fileSize);
      }

      // Finalize and publish
      const videoId = await videoService.finalizeUpload(
        req.user,
        uploadToken,
        metadata,
        'PUBLISH_IMMEDIATELY',
      );

      logger.info('✅ Video published successfully', {
        videoId,
        title: metadata.title.substring(0, 30),
        privacy: metadata.privacyLevel,
      });

      res.json({
        success: true,
        message: 'Video published successfully',
        data: { videoId },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('❌ Publish failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (tempFilePath) {
        videoService.cleanupTempFile(tempFilePath);
      }

      next(error);
    }
  }
}

export const videoController = new VideoController();
