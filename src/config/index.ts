import dotenv from 'dotenv';
import { TikTokConfig } from '../types/index.js';

dotenv.config();

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? process.env.APP_URL : '*'),

  // TikTok OAuth
  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
    sandbox: process.env.TIKTOK_SANDBOX === 'true',
    apiBaseUrl: process.env.TIKTOK_API_BASE_URL ||
      (process.env.TIKTOK_SANDBOX === 'true'
        ? 'https://open-sandbox.tiktokapis.com'
        : 'https://open.tiktokapis.com'),
    authorizationUrl: 'https://www.tiktok.com/v2/auth/authorize/',
  } as TikTokConfig,

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/tiktok',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // File upload
  upload: {
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    tempDir: process.env.UPLOAD_TEMP_DIR || './uploads/temp',
    publicDir: process.env.UPLOAD_PUBLIC_DIR || './uploads/public',
  },

  // API
  api: {
    version: 'v1',
    baseUrl: '/api/v1',
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const requiredVars = [
    'TIKTOK_CLIENT_KEY',
    'TIKTOK_CLIENT_SECRET',
    'TIKTOK_REDIRECT_URI',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    if (config.env === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}
