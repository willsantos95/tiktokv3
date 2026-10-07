import { Request, Response, NextFunction } from 'express';
import { videoService } from '../../../modules/video/services/video.service.js';
import { oauthService } from '../../../modules/auth/services/oauth.service.js';
import { logger } from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/error-handler.js';
import { ErrorCode } from '../../../shared/constants/error-codes.js';
import { VideoMetadata, ApiResponse, TikTokPrivacyLevel } from '../../../types/index.js';

const PUBLISH_ID_PATTERN = /^[A-Za-z0-9._~-]{1,64}$/;

// Multipart fields arrive as strings ("true"/"false")
const isTrue = (value: unknown): boolean => value === true || value === 'true';

export class VideoController {
  // Refreshes the TikTok access token (and the session) when it is about to expire
  private async ensureFreshToken(req: Request): Promise<void> {
    if (!req.user || !oauthService.isTokenExpired(req.user.expiresAt)) {
      return;
    }

    logger.info('🔄 Token expired, refreshing before calling TikTok');

    const refreshed = await oauthService.refreshAccessToken(req.user.refreshToken);

    req.user.accessToken = refreshed.access_token;
    req.user.refreshToken = refreshed.refresh_token;
    req.user.expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    if (req.session) {
      req.session.user = req.user;
      await new Promise<void>((resolve, reject) => {
        req.session!.save((err: unknown) => (err ? reject(err) : resolve()));
      });
    }
  }

  private requireUser(req: Request): void {
    if (!req.user) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 401, { message: 'User session not found' });
    }
  }

  async getCreatorInfo(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      this.requireUser(req);
      await this.ensureFreshToken(req);

      const creator = await videoService.getCreatorInfo(req.user!);

      res.json({
        success: true,
        data: { creator },
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }

  async publishVideo(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    const videoFile = req.file;

    try {
      this.requireUser(req);

      videoService.validateVideoFile(videoFile as Express.Multer.File);

      const body = req.body || {};

      // The checkboxes in the UI mean "allow"; TikTok's API takes "disable"
      const metadata: VideoMetadata = {
        title: String(body.title || ''),
        privacyLevel: String(body.privacyLevel || '') as TikTokPrivacyLevel,
        disableComment: !isTrue(body.allowComment),
        disableDuet: !isTrue(body.allowDuet),
        disableStitch: !isTrue(body.allowStitch),
        commercialContentEnabled: isTrue(body.commercialContent),
        brandOrganicToggle: isTrue(body.brandOrganic),
        brandContentToggle: isTrue(body.brandContent),
      };

      await this.ensureFreshToken(req);

      // Re-read the creator info so the choices are validated against the current state
      const creator = await videoService.getCreatorInfo(req.user!);
      videoService.validateMetadata(metadata, creator);

      const { publishId, uploadUrl, plan } = await videoService.initDirectPost(
        req.user!,
        metadata,
        videoFile!.size,
      );

      await videoService.uploadFileInChunks(
        uploadUrl,
        videoFile!.path,
        videoFile!.size,
        videoFile!.mimetype,
        plan,
      );

      logger.info('✅ Video sent to TikTok, waiting for processing', { publishId });

      res.json({
        success: true,
        message: 'Video sent to TikTok',
        data: { publishId },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('❌ Publish failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    } finally {
      // The video is never kept on this server once the upload to TikTok finished or failed
      if (videoFile?.path) {
        videoService.cleanupTempFile(videoFile.path);
      }
    }
  }

  async getPublishStatus(req: Request, res: Response<ApiResponse>, next: NextFunction) {
    try {
      this.requireUser(req);

      const { publishId } = req.params;
      if (!PUBLISH_ID_PATTERN.test(publishId)) {
        throw new AppError(ErrorCode.INVALID_REQUEST, 400, { message: 'Invalid publish id.' });
      }

      await this.ensureFreshToken(req);

      const status = await videoService.fetchPublishStatus(req.user!, publishId);

      res.json({
        success: true,
        data: status,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const videoController = new VideoController();
