import axios from 'axios';
import fs from 'fs';
import { config } from '../../../config/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/error-handler.js';
import { ErrorCode, VALID_VIDEO_FORMATS, MAX_VIDEO_SIZE, MAX_CAPTION_LENGTH } from '../../../shared/constants/error-codes.js';
import { VideoMetadata, TikTokVideoInit, TikTokVideoFinish, SessionUser } from '../../../types/index.js';

export class VideoService {
  validateVideoFile(file: Express.Multer.File): void {
    if (!file) {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        400,
        { message: 'No video file provided' },
      );
    }

    logger.info('🔍 Validating video file', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });

    // Validate file type - TikTok accepts MP4, MOV, WebM
    if (!VALID_VIDEO_FORMATS.includes(file.mimetype)) {
      logger.warn('❌ Invalid video format', {
        provided: file.mimetype,
        accepted: VALID_VIDEO_FORMATS,
      });

      throw new AppError(
        ErrorCode.INVALID_FILE_FORMAT,
        400,
        {
          message: `Invalid video format. Accepted formats: ${VALID_VIDEO_FORMATS.join(', ')}`,
          provided: file.mimetype,
          allowedFormats: VALID_VIDEO_FORMATS,
        },
      );
    }

    // Validate file size - TikTok limit is 2GB
    if (file.size > MAX_VIDEO_SIZE) {
      logger.warn('❌ Video file too large', {
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        maxSize: `${(MAX_VIDEO_SIZE / 1024 / 1024).toFixed(2)}MB`,
      });

      throw new AppError(
        ErrorCode.FILE_TOO_LARGE,
        413,
        {
          message: `Video file exceeds maximum size of ${(MAX_VIDEO_SIZE / 1024 / 1024 / 1024).toFixed(1)}GB`,
          maxSize: MAX_VIDEO_SIZE,
          provided: file.size,
        },
      );
    }

    // Minimum file size check - video should be at least 1KB
    const MIN_FILE_SIZE = 1024;
    if (file.size < MIN_FILE_SIZE) {
      logger.warn('❌ Video file too small', {
        size: file.size,
        minSize: MIN_FILE_SIZE,
      });

      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        400,
        { message: 'Video file is too small' },
      );
    }

    logger.info('✅ Video file validation passed', {
      filename: file.originalname,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });
  }

  validateMetadata(metadata: VideoMetadata): void {
    if (!metadata) {
      throw new AppError(
        ErrorCode.INVALID_METADATA,
        400,
        { message: 'Video metadata is required' },
      );
    }

    logger.info('🔍 Validating video metadata', {
      titleLength: metadata.title?.length || 0,
      privacyLevel: metadata.privacyLevel,
    });

    // Title/Caption validation
    if (metadata.title && metadata.title.trim().length === 0) {
      logger.warn('⚠️  Empty title provided');
      // Allow empty title - use default
    }

    if (metadata.title && metadata.title.length > MAX_CAPTION_LENGTH) {
      logger.warn('❌ Caption too long', {
        length: metadata.title.length,
        maxLength: MAX_CAPTION_LENGTH,
      });

      throw new AppError(
        ErrorCode.INVALID_METADATA,
        400,
        {
          message: `Caption exceeds maximum length of ${MAX_CAPTION_LENGTH} characters`,
          titleLength: metadata.title.length,
          maxLength: MAX_CAPTION_LENGTH,
        },
      );
    }

    // Privacy level validation
    const validPrivacyLevels = ['PUBLIC', 'FRIENDS', 'SELF_ONLY'];
    if (!validPrivacyLevels.includes(metadata.privacyLevel)) {
      logger.warn('❌ Invalid privacy level', {
        provided: metadata.privacyLevel,
        valid: validPrivacyLevels,
      });

      throw new AppError(
        ErrorCode.INVALID_METADATA,
        400,
        {
          message: `Invalid privacy level. Must be one of: ${validPrivacyLevels.join(', ')}`,
          provided: metadata.privacyLevel,
          validPrivacyLevels,
        },
      );
    }

    // Boolean flags validation
    if (typeof metadata.disableDuet !== 'boolean') {
      logger.warn('⚠️  disableDuet is not boolean, coercing to boolean');
      metadata.disableDuet = Boolean(metadata.disableDuet);
    }

    if (typeof metadata.disableComment !== 'boolean') {
      logger.warn('⚠️  disableComment is not boolean, coercing to boolean');
      metadata.disableComment = Boolean(metadata.disableComment);
    }

    if (typeof metadata.disableStitch !== 'boolean') {
      logger.warn('⚠️  disableStitch is not boolean, coercing to boolean');
      metadata.disableStitch = Boolean(metadata.disableStitch);
    }

    logger.info('✅ Video metadata validation passed', {
      privacy: metadata.privacyLevel,
      titleLength: metadata.title?.length || 0,
      restrictions: {
        duet: metadata.disableDuet,
        comment: metadata.disableComment,
        stitch: metadata.disableStitch,
      },
    });
  }

  async initializeUpload(
    user: SessionUser,
    fileSize: number,
    chunkSizeBytes: number = 5 * 1024 * 1024,
  ): Promise<string> {
    try {
      logger.info('📤 Initializing video upload', {
        fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        chunkSize: `${(chunkSizeBytes / 1024 / 1024).toFixed(2)}MB`,
      });

      // Calculate chunk count for large files
      const chunkCount = Math.ceil(fileSize / chunkSizeBytes);
      const CHUNK_THRESHOLD = 10 * 1024 * 1024;
      const willUseChunks = fileSize > CHUNK_THRESHOLD;

      const initPayload: any = {
        source_info: {
          source: 'FILE_UPLOAD',
          chunk_size: fileSize,
        },
      };

      // Add chunk count if file will be uploaded in chunks
      if (willUseChunks) {
        initPayload.source_info.chunk_count = chunkCount;
        logger.info('📊 Chunked upload info', {
          chunkCount,
          chunksPerFile: chunkCount,
        });
      }

      const response = await axios.post<TikTokVideoInit>(
        `${config.tiktok.apiBaseUrl}/v2/post/publish/video/init/`,
        initPayload,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const uploadToken = response.data.data.upload_token;

      logger.info('✅ Upload token received', {
        tokenLength: uploadToken.length,
        willUseChunks,
      });

      return uploadToken;
    } catch (error) {
      logger.error('❌ Failed to initialize upload', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        throw new AppError(
          ErrorCode.TIKTOK_API_ERROR,
          error.response?.status || 500,
          {
            message: errorData?.message || 'TikTok API error',
            details: errorData,
          },
        );
      }

      throw error;
    }
  }

  async uploadVideoChunk(
    user: SessionUser,
    uploadToken: string,
    videoBuffer: Buffer,
    partNumber: number = 1,
    chunkSize?: number,
  ): Promise<void> {
    try {
      const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);
      logger.info('📤 Uploading video chunk', {
        size: `${sizeMB}MB`,
        partNumber,
        totalSize: chunkSize ? `${(chunkSize / 1024 / 1024).toFixed(2)}MB` : 'unknown',
      });

      const response = await axios.post(
        `${config.tiktok.apiBaseUrl}/v2/post/publish/video/upload/`,
        videoBuffer,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': videoBuffer.length.toString(),
          },
          params: {
            upload_token: uploadToken,
            part_number: partNumber,
          },
          timeout: 120000, // 120 seconds for large files
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        },
      );

      logger.info('✅ Video chunk uploaded successfully', {
        partNumber,
        responseStatus: response.status,
      });
    } catch (error) {
      logger.error('❌ Failed to upload video chunk', {
        error: error instanceof Error ? error.message : String(error),
        partNumber,
        size: `${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB`,
      });

      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        throw new AppError(
          ErrorCode.UPLOAD_FAILED,
          error.response?.status || 500,
          {
            message: errorData?.message || error.message,
            details: errorData,
          },
        );
      }

      throw error;
    }
  }

  async finalizeUpload(
    user: SessionUser,
    uploadToken: string,
    metadata: VideoMetadata,
    publishType: 'DRAFT' | 'PUBLISH_IMMEDIATELY',
  ): Promise<string> {
    try {
      logger.info('🎬 Finalizing video upload', {
        publishType,
        title: metadata.title?.substring(0, 50),
        privacyLevel: metadata.privacyLevel,
      });

      const postInfo: any = {
        title: metadata.title || 'Video',
        privacy_level: metadata.privacyLevel,
        disable_comment: metadata.disableComment,
        disable_duet: metadata.disableDuet,
        disable_stitch: metadata.disableStitch,
        // Allow users to download by default (opposite of disable_download)
        allow_download: true,
        // Auto-add linked sound if found
        auto_add_linked_sound: false,
      };

      // Set video cover timestamp if provided
      if (metadata.videoCoverTimestampMs) {
        postInfo.video_cover_timestamp_ms = metadata.videoCoverTimestampMs;
      }

      const finishPayload: any = {
        upload_token: uploadToken,
        publish_type: publishType,
        post_info: postInfo,
      };

      logger.debug('📋 Finalize payload', {
        publish_type: finishPayload.publish_type,
        post_info_fields: Object.keys(postInfo),
      });

      const response = await axios.post<TikTokVideoFinish>(
        `${config.tiktok.apiBaseUrl}/v2/post/publish/video/finish/`,
        finishPayload,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds for finalization
        },
      );

      if (!response.data?.data?.video_id) {
        logger.error('❌ Invalid response from finalize endpoint', {
          responseData: response.data,
        });

        throw new AppError(
          ErrorCode.UPLOAD_FAILED,
          500,
          { message: 'Invalid response from TikTok API - missing video_id' },
        );
      }

      const videoId = response.data.data.video_id;

      logger.info(`🎉 Video ${publishType === 'DRAFT' ? 'uploaded as draft' : 'published'} successfully`, {
        videoId,
        publishType,
        title: metadata.title?.substring(0, 30),
      });

      return videoId;
    } catch (error) {
      logger.error('❌ Failed to finalize upload', {
        error: error instanceof Error ? error.message : String(error),
        uploadToken: uploadToken?.substring(0, 10) + '...',
      });

      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        throw new AppError(
          ErrorCode.UPLOAD_FAILED,
          error.response?.status || 500,
          {
            message: errorData?.message || error.message,
            details: errorData,
          },
        );
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ErrorCode.UPLOAD_FAILED,
        500,
        { message: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  async uploadVideoFile(
    user: SessionUser,
    uploadToken: string,
    filePath: string,
    chunkSizeBytes: number = 5 * 1024 * 1024, // 5MB chunks by default
  ): Promise<void> {
    try {
      const fileSize = fs.statSync(filePath).size;
      const chunkCount = Math.ceil(fileSize / chunkSizeBytes);

      logger.info('📤 Starting large file upload', {
        fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        chunkSize: `${(chunkSizeBytes / 1024 / 1024).toFixed(2)}MB`,
        chunkCount,
      });

      const fileStream = fs.createReadStream(filePath, {
        highWaterMark: chunkSizeBytes,
      });

      let partNumber = 1;
      const chunks: Buffer[] = [];
      let currentChunkSize = 0;

      for await (const chunk of fileStream) {
        chunks.push(chunk);
        currentChunkSize += chunk.length;

        if (currentChunkSize >= chunkSizeBytes || partNumber === chunkCount) {
          const buffer = Buffer.concat(chunks);
          await this.uploadVideoChunk(
            user,
            uploadToken,
            buffer,
            partNumber,
            fileSize,
          );

          chunks.length = 0;
          currentChunkSize = 0;
          partNumber++;
        }
      }

      logger.info('✅ Large file upload completed', {
        totalChunks: partNumber - 1,
      });
    } catch (error) {
      logger.error('❌ Failed to upload large video file', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ErrorCode.UPLOAD_FAILED,
        500,
        { message: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug('🗑️  Temporary file cleaned up');
      }
    } catch (error) {
      logger.warn('Failed to cleanup temporary file', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const videoService = new VideoService();
