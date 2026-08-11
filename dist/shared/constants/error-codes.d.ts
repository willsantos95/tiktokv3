export declare enum ErrorCode {
    INVALID_STATE = "AUTH_001",
    TOKEN_EXPIRED = "AUTH_002",
    REFRESH_FAILED = "AUTH_003",
    UNAUTHORIZED = "AUTH_004",
    SESSION_NOT_FOUND = "AUTH_005",
    INVALID_FILE_FORMAT = "VIDEO_001",
    FILE_TOO_LARGE = "VIDEO_002",
    UPLOAD_FAILED = "VIDEO_003",
    INVALID_METADATA = "VIDEO_004",
    VIDEO_NOT_FOUND = "VIDEO_005",
    TIKTOK_API_ERROR = "TIKTOK_001",
    TIKTOK_RATE_LIMIT = "TIKTOK_002",
    TIKTOK_INVALID_SCOPE = "TIKTOK_003",
    DATABASE_ERROR = "SYS_001",
    RATE_LIMIT_EXCEEDED = "SYS_002",
    INTERNAL_SERVER_ERROR = "SYS_003",
    INVALID_REQUEST = "SYS_004",
    NOT_FOUND = "SYS_005"
}
export declare const ERROR_MESSAGES: Record<ErrorCode, string>;
export declare const VALID_VIDEO_FORMATS: string[];
export declare const MAX_VIDEO_SIZE: number;
export declare const MAX_CAPTION_LENGTH = 2200;
export declare const OAUTH_STATE_TTL: number;
export declare const TOKEN_REFRESH_BUFFER: number;
//# sourceMappingURL=error-codes.d.ts.map