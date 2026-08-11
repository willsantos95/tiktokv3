export enum ErrorCode {
  // Auth errors
  INVALID_STATE = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  REFRESH_FAILED = 'AUTH_003',
  UNAUTHORIZED = 'AUTH_004',
  SESSION_NOT_FOUND = 'AUTH_005',

  // Video errors
  INVALID_FILE_FORMAT = 'VIDEO_001',
  FILE_TOO_LARGE = 'VIDEO_002',
  UPLOAD_FAILED = 'VIDEO_003',
  INVALID_METADATA = 'VIDEO_004',
  VIDEO_NOT_FOUND = 'VIDEO_005',

  // TikTok API errors
  TIKTOK_API_ERROR = 'TIKTOK_001',
  TIKTOK_RATE_LIMIT = 'TIKTOK_002',
  TIKTOK_INVALID_SCOPE = 'TIKTOK_003',

  // System errors
  DATABASE_ERROR = 'SYS_001',
  RATE_LIMIT_EXCEEDED = 'SYS_002',
  INTERNAL_SERVER_ERROR = 'SYS_003',
  INVALID_REQUEST = 'SYS_004',
  NOT_FOUND = 'SYS_005',
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_STATE]: 'Security validation failed. Please try again.',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.REFRESH_FAILED]: 'Failed to refresh authentication. Please log in again.',
  [ErrorCode.UNAUTHORIZED]: 'You are not authorized to access this resource.',
  [ErrorCode.SESSION_NOT_FOUND]: 'Session not found.',

  [ErrorCode.INVALID_FILE_FORMAT]: 'Invalid video format. Supported formats: MP4, MOV.',
  [ErrorCode.FILE_TOO_LARGE]: 'Video file is too large. Maximum size: 2GB.',
  [ErrorCode.UPLOAD_FAILED]: 'Failed to upload video. Please try again.',
  [ErrorCode.INVALID_METADATA]: 'Invalid video metadata provided.',
  [ErrorCode.VIDEO_NOT_FOUND]: 'Video not found.',

  [ErrorCode.TIKTOK_API_ERROR]: 'TikTok API error. Please try again later.',
  [ErrorCode.TIKTOK_RATE_LIMIT]: 'Too many requests to TikTok. Please wait a moment.',
  [ErrorCode.TIKTOK_INVALID_SCOPE]: 'Required TikTok permissions were not granted.',

  [ErrorCode.DATABASE_ERROR]: 'Database error. Please try again later.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment.',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error. Please try again later.',
  [ErrorCode.INVALID_REQUEST]: 'Invalid request parameters.',
  [ErrorCode.NOT_FOUND]: 'Resource not found.',
};

export const VALID_VIDEO_FORMATS = ['video/mp4', 'video/quicktime'];
export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const MAX_CAPTION_LENGTH = 2200;
export const OAUTH_STATE_TTL = 10 * 60 * 1000; // 10 minutes
export const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes
