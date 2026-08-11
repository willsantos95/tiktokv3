import axios from 'axios';
import { config } from '../../../config/index.js';
import { logger } from '../../../shared/utils/logger.js';
import { AppError } from '../../../shared/middleware/error-handler.js';
import { ErrorCode } from '../../../shared/constants/error-codes.js';
import { TikTokOAuthResponse, TikTokUserInfo, SessionUser } from '../../../types/index.js';
import { TOKEN_REFRESH_BUFFER } from '../../../shared/constants/error-codes.js';

export class OAuthService {
  generateAuthorizationUrl(state: string): string {
    const authUrl = new URL(config.tiktok.authorizationUrl);
    const scopes = ['user.info.basic', 'video.upload', 'video.publish'];

    authUrl.searchParams.append('client_key', config.tiktok.clientKey);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(','));
    authUrl.searchParams.append('redirect_uri', config.tiktok.redirectUri);
    authUrl.searchParams.append('state', state);

    logger.info('🔐 OAuth Authorization URL generated', {
      state,
      clientKey: config.tiktok.clientKey.substring(0, 10) + '...',
    });

    return authUrl.toString();
  }

  async exchangeCodeForToken(code: string): Promise<TikTokOAuthResponse['data']> {
    try {
      logger.info('🔑 Exchanging authorization code for access token');

      const params = new URLSearchParams();
      params.append('client_key', config.tiktok.clientKey);
      params.append('client_secret', config.tiktok.clientSecret);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', config.tiktok.redirectUri);

      const tokenUrl = `${config.tiktok.apiBaseUrl}/v2/oauth/token/`;
      const response = await axios.post<TikTokOAuthResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      const tokenData = response.data.data || response.data;
      logger.info('✅ Access token received', {
        expiresIn: tokenData.expires_in,
      });

      return tokenData;
    } catch (error) {
      logger.error('❌ Token exchange failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        throw new AppError(
          ErrorCode.TIKTOK_API_ERROR,
          500,
          error.response?.data,
        );
      }

      throw error;
    }
  }

  async fetchUserInfo(accessToken: string): Promise<TikTokUserInfo['data']> {
    try {
      logger.info('👤 Fetching user information from TikTok');

      const userUrl = `${config.tiktok.apiBaseUrl}/v2/user/info/?fields=open_id,union_id,avatar_url,display_name`;
      const response = await axios.get<TikTokUserInfo>(userUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userData = response.data.data;
      logger.info('✅ User info retrieved', {
        displayName: userData.display_name,
      });

      return userData;
    } catch (error) {
      logger.error('❌ Failed to fetch user info', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AppError(
            ErrorCode.TOKEN_EXPIRED,
            401,
          );
        }
        throw new AppError(
          ErrorCode.TIKTOK_API_ERROR,
          500,
          error.response?.data,
        );
      }

      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TikTokOAuthResponse['data']> {
    try {
      logger.info('🔄 Refreshing access token');

      const params = new URLSearchParams();
      params.append('client_key', config.tiktok.clientKey);
      params.append('client_secret', config.tiktok.clientSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);

      const tokenUrl = `${config.tiktok.apiBaseUrl}/v2/oauth/token/`;
      const response = await axios.post<TikTokOAuthResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      const tokenData = response.data.data || response.data;
      logger.info('✅ Token refreshed successfully');

      return tokenData;
    } catch (error) {
      logger.error('❌ Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AppError(
        ErrorCode.REFRESH_FAILED,
        401,
      );
    }
  }

  isTokenExpired(expiresAt: Date): boolean {
    return new Date().getTime() > new Date(expiresAt).getTime() - TOKEN_REFRESH_BUFFER;
  }

  createSessionUser(
    tokenData: TikTokOAuthResponse['data'],
    userData: TikTokUserInfo['data'],
  ): SessionUser {
    return {
      openId: tokenData.open_id,
      unionId: userData.union_id,
      displayName: userData.display_name,
      avatarUrl: userData.avatar_url,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      tokenScope: tokenData.scope || 'user.info.basic,video.upload,video.publish',
    };
  }
}

export const oauthService = new OAuthService();
