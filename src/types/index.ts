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
    user: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      display_name: string;
    };
  };
}

// Values accepted by the Content Posting API (must match creator_info.privacy_level_options)
export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY';

export interface TikTokApiError {
  code: string;
  message: string;
  log_id?: string;
}

// Raw response of POST /v2/post/publish/creator_info/query/
export interface TikTokCreatorInfoResponse {
  data?: {
    creator_avatar_url: string;
    creator_username: string;
    creator_nickname: string;
    privacy_level_options: TikTokPrivacyLevel[];
    comment_disabled: boolean;
    duet_disabled: boolean;
    stitch_disabled: boolean;
    max_video_post_duration_sec: number;
  };
  error?: TikTokApiError;
}

// Creator info as exposed by our API to the dashboard
export interface CreatorInfo {
  avatarUrl: string;
  username: string;
  nickname: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number;
}

// Raw response of POST /v2/post/publish/video/init/
export interface TikTokVideoInit {
  data?: {
    publish_id: string;
    upload_url?: string;
  };
  error?: TikTokApiError;
}

export type TikTokPublishStatus =
  | 'PROCESSING_UPLOAD'
  | 'PROCESSING_DOWNLOAD'
  | 'SEND_TO_USER_INBOX'
  | 'PUBLISH_COMPLETE'
  | 'FAILED';

// Raw response of POST /v2/post/publish/status/fetch/
export interface TikTokPublishStatusResponse {
  data?: {
    status: TikTokPublishStatus;
    fail_reason?: string;
    uploaded_bytes?: number;
  };
  error?: TikTokApiError;
}

export interface PublishStatus {
  status: TikTokPublishStatus;
  failReason?: string;
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
  privacyLevel: TikTokPrivacyLevel;
  disableDuet: boolean;
  disableComment: boolean;
  disableStitch: boolean;
  // Commercial content disclosure
  commercialContentEnabled: boolean;
  brandOrganicToggle: boolean; // "Your brand" -> labeled "Promotional content"
  brandContentToggle: boolean; // "Branded content" -> labeled "Paid partnership"
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
