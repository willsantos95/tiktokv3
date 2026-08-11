import { TikTokOAuthResponse, TikTokUserInfo, SessionUser } from '../../../types/index.js';
export declare class OAuthService {
    generateAuthorizationUrl(state: string): string;
    exchangeCodeForToken(code: string): Promise<TikTokOAuthResponse['data']>;
    fetchUserInfo(accessToken: string): Promise<TikTokUserInfo['data']>;
    refreshAccessToken(refreshToken: string): Promise<TikTokOAuthResponse['data']>;
    isTokenExpired(expiresAt: Date): boolean;
    createSessionUser(tokenData: TikTokOAuthResponse['data'], userData: TikTokUserInfo['data']): SessionUser;
}
export declare const oauthService: OAuthService;
//# sourceMappingURL=oauth.service.d.ts.map