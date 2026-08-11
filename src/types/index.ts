export interface TikTokConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
  authorizationUrl: string;
  sandbox: boolean;
}

export interface TikTokOAuthResponse {
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    open_id: string;
    scope: string;
  };
}

export interface TikTokUserInfo {
  data: {
    open_id: string;
    union_id: string;
    avatar_url: string;
    display_name: string;
  };
}

export interface TikTokVideoInit {
  data: {
    upload_token: string;
  };
}

export interface TikTokVideoFinish {
  data: {
    video_id: string;
  };
}

export interface SessionUser {
  openId: string;
  unionId?: string;
  displayName: string;
  avatarUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenScope: string;
}

export interface VideoMetadata {
  title: string;
  privacyLevel: 'PUBLIC' | 'FRIENDS' | 'SELF_ONLY';
  disableDuet: boolean;
  disableComment: boolean;
  disableStitch: boolean;
  videoCoverTimestampMs?: number;
}

export interface UploadProgress {
  videoId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'published' | 'failed';
  errorMessage?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: Date;
}

export interface OAuthState {
  state: string;
  createdAt: Date;
  expiresAt: Date;
}
