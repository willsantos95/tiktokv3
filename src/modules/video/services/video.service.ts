import axios from 'axios';
import fs from 'fs';
import { config } from '../../../config/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/error-handler.js';
import {
  ErrorCode,
  VALID_VIDEO_FORMATS,
  MAX_VIDEO_SIZE,
  MAX_CAPTION_LENGTH,
} from '../../../shared/constants/error-codes.js';
import {
  CreatorInfo,
  PublishStatus,
  SessionUser,
  TikTokCreatorInfoResponse,
  TikTokPublishStatusResponse,
  TikTokVideoInit,
  VideoMetadata,
} from '../../../types/index.js';

const MB = 1024 * 1024;
const MIN_FILE_SIZE = 1024; // 1KB sanity check
const PREFERRED_CHUNK_SIZE = 10 * MB;

// Messages shown to the user for TikTok error codes that we know how to explain
const FRIENDLY_TIKTOK_ERRORS: Record<string, string> = {
  spam_risk_too_many_posts:
    'The daily posting limit for this TikTok account was reached. Please try again later.',
  spam_risk_user_banned_from_posting:
    'This TikTok account is currently not allowed to post through the API. Please try again later.',
  reached_active_user_cap:
    'The daily usage limit of this app on TikTok was reached. Please try again later.',
  unaudited_client_can_only_post_to_private_accounts:
    'This app is still under TikTok review, so videos can only be posted to a private TikTok account (or with "Only me" visibility).',
  privacy_level_option_mismatch:
    'The selected privacy option is not available for this TikTok account. Please choose another one.',
};

// Codes that mean "this creator cannot post right now": stop and ask the user to try later
const CREATOR_CANNOT_POST_CODES = new Set([
  'spam_risk_too_many_posts',
  'spam_risk_user_banned_from_posting',
  'reached_active_user_cap',
]);

export interface ChunkPlan {
  chunkSize: number;
  totalChunkCount: number;
}

export class VideoService {
  private headers(user: SessionUser): Record<string, string> {
    return {
      Authorization: `Bearer ${user.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    };
  }

  // Converts any failure of a TikTok call into an AppError the client can display
  private toAppError(error: unknown, action: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const tiktokError = (error.response?.data as any)?.error;
      const tiktokCode: string | undefined = tiktokError?.code;

      logger.error(`❌ TikTok API error while trying to ${action}`, {
        status,
        tiktokCode,
        tiktokMessage: tiktokError?.message,
        logId: tiktokError?.log_id,
      });

      if (status === 401) {
        return new AppError(ErrorCode.TOKEN_EXPIRED, 401, { tiktokCode });
      }

      if (status === 429) {
        return new AppError(ErrorCode.TIKTOK_RATE_LIMIT, 429, { tiktokCode });
      }

      const friendly = tiktokCode ? FRIENDLY_TIKTOK_ERRORS[tiktokCode] : undefined;

      if (tiktokCode && CREATOR_CANNOT_POST_CODES.has(tiktokCode)) {
        return new AppError(ErrorCode.CREATOR_CANNOT_POST, 403, { message: friendly, tiktokCode });
      }

      return new AppError(ErrorCode.TIKTOK_API_ERROR, 502, {
        message: friendly || tiktokError?.message || error.message,
        tiktokCode,
        logId: tiktokError?.log_id,
      });
    }

    logger.error(`❌ Unexpected error while trying to ${action}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 500);
  }

  // Some TikTok errors come back as HTTP 200 with error.code != "ok"
  private assertTikTokOk(
    body: { error?: { code: string; message?: string; log_id?: string } },
    action: string,
  ): void {
    const code = body?.error?.code;
    if (!code || code === 'ok') {
      return;
    }

    logger.warn(`⚠️  TikTok returned an error while trying to ${action}`, {
      code,
      message: body.error?.message,
      logId: body.error?.log_id,
    });

    const friendly = FRIENDLY_TIKTOK_ERRORS[code];

    if (CREATOR_CANNOT_POST_CODES.has(code)) {
      throw new AppError(ErrorCode.CREATOR_CANNOT_POST, 403, { message: friendly, tiktokCode: code });
    }

    throw new AppError(ErrorCode.TIKTOK_API_ERROR, 502, {
      message: friendly || body.error?.message || 'TikTok API error',
      tiktokCode: code,
      logId: body.error?.log_id,
    });
  }

  /**
   * Required UX #1: always read the latest creator info before showing the post page
   * and before publishing. https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info
   */
  async getCreatorInfo(user: SessionUser): Promise<CreatorInfo> {
    try {
      const response = await axios.post<TikTokCreatorInfoResponse>(
        `${config.tiktok.apiBaseUrl}/v2/post/publish/creator_info/query/`,
        {},
        { headers: this.headers(user), timeout: 15000 },
      );

      this.assertTikTokOk(response.data, 'query creator info');

      const data = response.data.data;
      if (!data) {
        throw new AppError(ErrorCode.TIKTOK_API_ERROR, 502, {
          message: 'TikTok did not return creator information.',
        });
      }

      return {
        avatarUrl: data.creator_avatar_url,
        username: data.creator_username,
        nickname: data.creator_nickname,
        privacyLevelOptions: data.privacy_level_options || [],
        commentDisabled: !!data.comment_disabled,
        duetDisabled: !!data.duet_disabled,
        stitchDisabled: !!data.stitch_disabled,
        maxVideoPostDurationSec: data.max_video_post_duration_sec,
      };
    } catch (error) {
      throw this.toAppError(error, 'query creator info');
    }
  }

  validateVideoFile(file: Express.Multer.File): void {
    if (!file) {
      throw new AppError(ErrorCode.INVALID_REQUEST, 400, { message: 'No video file provided' });
    }

    if (!VALID_VIDEO_FORMATS.includes(file.mimetype)) {
      throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 400, {
        message: `Invalid video format. Accepted formats: ${VALID_VIDEO_FORMATS.join(', ')}`,
        provided: file.mimetype,
      });
    }

    if (file.size > MAX_VIDEO_SIZE) {
      throw new AppError(ErrorCode.FILE_TOO_LARGE, 413, {
        message: `Video file exceeds maximum size of ${(MAX_VIDEO_SIZE / 1024 / MB).toFixed(1)}GB`,
      });
    }

    if (file.size < MIN_FILE_SIZE) {
      throw new AppError(ErrorCode.INVALID_REQUEST, 400, { message: 'Video file is too small' });
    }
  }

  /**
   * Required UX #2 and #3: validates what the user chose against the latest creator info
   * and against the commercial content rules.
   */
  validateMetadata(metadata: VideoMetadata, creator: CreatorInfo): void {
    const fail = (message: string): never => {
      throw new AppError(ErrorCode.INVALID_METADATA, 400, { message });
    };

    const title = (metadata.title || '').trim();
    if (!title) {
      fail('A title is required.');
    }

    if (title.length > MAX_CAPTION_LENGTH) {
      fail(`The title exceeds the maximum length of ${MAX_CAPTION_LENGTH} characters.`);
    }

    // Privacy must be one of the options returned by creator_info (there is no default)
    if (!metadata.privacyLevel) {
      fail('Please select who can view this video.');
    }

    if (!creator.privacyLevelOptions.includes(metadata.privacyLevel)) {
      fail('The selected privacy option is not available for this TikTok account.');
    }

    // Interactions disabled in the creator's TikTok settings can never be enabled
    if (creator.commentDisabled && !metadata.disableComment) {
      fail('Comments are disabled in this creator\'s TikTok settings.');
    }
    if (creator.duetDisabled && !metadata.disableDuet) {
      fail('Duet is disabled in this creator\'s TikTok settings.');
    }
    if (creator.stitchDisabled && !metadata.disableStitch) {
      fail('Stitch is disabled in this creator\'s TikTok settings.');
    }

    // Commercial content disclosure
    if (metadata.commercialContentEnabled && !metadata.brandOrganicToggle && !metadata.brandContentToggle) {
      fail('You need to indicate if your content promotes yourself, a third party, or both.');
    }

    if (!metadata.commercialContentEnabled && (metadata.brandOrganicToggle || metadata.brandContentToggle)) {
      fail('Commercial content options require the disclosure toggle to be turned on.');
    }

    if (metadata.brandContentToggle && metadata.privacyLevel === 'SELF_ONLY') {
      fail('Branded content visibility cannot be set to private.');
    }
  }

  // TikTok chunk rules: 5MB-64MB per chunk (last one up to 128MB); files under 5MB go in one chunk.
  // total_chunk_count = floor(video_size / chunk_size) and the remainder is merged into the last chunk.
  getChunkPlan(fileSize: number): ChunkPlan {
    const chunkSize = Math.min(PREFERRED_CHUNK_SIZE, fileSize);
    const totalChunkCount = Math.max(1, Math.floor(fileSize / chunkSize));
    return { chunkSize, totalChunkCount };
  }

  async initDirectPost(
    user: SessionUser,
    metadata: VideoMetadata,
    fileSize: number,
  ): Promise<{ publishId: string; uploadUrl: string; plan: ChunkPlan }> {
    const plan = this.getChunkPlan(fileSize);

    const payload = {
      post_info: {
        title: metadata.title.trim(),
        privacy_level: metadata.privacyLevel,
        disable_duet: metadata.disableDuet,
        disable_comment: metadata.disableComment,
        disable_stitch: metadata.disableStitch,
        brand_content_toggle: metadata.brandContentToggle,
        brand_organic_toggle: metadata.brandOrganicToggle,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: plan.chunkSize,
        total_chunk_count: plan.totalChunkCount,
      },
    };

    try {
      logger.info('📤 Initializing TikTok direct post', {
        privacy: metadata.privacyLevel,
        videoSize: `${(fileSize / MB).toFixed(2)}MB`,
        chunks: plan.totalChunkCount,
        commercialContent: metadata.commercialContentEnabled,
      });

      const response = await axios.post<TikTokVideoInit>(
        `${config.tiktok.apiBaseUrl}/v2/post/publish/video/init/`,
        payload,
        { headers: this.headers(user), timeout: 30000 },
      );

      this.assertTikTokOk(response.data, 'initialize the post');

      const publishId = response.data.data?.publish_id;
      const uploadUrl = response.data.data?.upload_url;

      if (!publishId || !uploadUrl) {
        throw new AppError(ErrorCode.UPLOAD_FAILED, 502, {
          message: 'TikTok did not return an upload URL.',
        });
      }

      return { publishId, uploadUrl, plan };
    } catch (error) {
      throw this.toAppError(error, 'initialize the post');
    }
  }

  async uploadFileInChunks(
    uploadUrl: string,
    filePath: string,
    fileSize: number,
    mimeType: string,
    plan: ChunkPlan,
  ): Promise<void> {
    const handle = await fs.promises.open(filePath, 'r');

    try {
      for (let index = 0; index < plan.totalChunkCount; index++) {
        const start = index * plan.chunkSize;
        const isLast = index === plan.totalChunkCount - 1;
        const end = isLast ? fileSize - 1 : start + plan.chunkSize - 1;
        const length = end - start + 1;

        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, start);
        if (bytesRead !== length) {
          throw new AppError(ErrorCode.UPLOAD_FAILED, 500, {
            message: 'Could not read the uploaded video file.',
          });
        }

        logger.info('📤 Uploading chunk to TikTok', {
          chunk: `${index + 1}/${plan.totalChunkCount}`,
          size: `${(length / MB).toFixed(2)}MB`,
        });

        // 206 = chunk accepted, more to come. 201 = last chunk accepted, TikTok starts processing.
        await axios.put(uploadUrl, buffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(length),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          timeout: 120000,
          validateStatus: (status) => status === 201 || status === 206,
        });
      }
    } catch (error) {
      throw this.toAppError(error, 'upload the video');
    } finally {
      await handle.close();
    }
  }

  async fetchPublishStatus(user: SessionUser, publishId: string): Promise<PublishStatus> {
    try {
      const response = await axios.post<TikTokPublishStatusResponse>(
        `${config.tiktok.apiBaseUrl}/v2/post/publish/status/fetch/`,
        { publish_id: publishId },
        { headers: this.headers(user), timeout: 15000 },
      );

      this.assertTikTokOk(response.data, 'fetch the publish status');

      const data = response.data.data;
      if (!data) {
        throw new AppError(ErrorCode.TIKTOK_API_ERROR, 502, {
          message: 'TikTok did not return the publish status.',
        });
      }

      // publicaly_available_post_id is deliberately not exposed: TikTok sends int64 values that
      // lose precision when parsed as JSON numbers, and the dashboard does not need them.
      return {
        status: data.status,
        failReason: data.fail_reason,
      };
    } catch (error) {
      throw this.toAppError(error, 'fetch the publish status');
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
