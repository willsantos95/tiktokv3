import { TikTokConfig } from '../types/index.js';
export declare const config: {
    env: any;
    port: number;
    appUrl: any;
    corsOrigin: any;
    tiktok: TikTokConfig;
    database: {
        url: any;
    };
    redis: {
        url: any;
    };
    session: {
        secret: any;
        maxAge: number;
    };
    logging: {
        level: any;
    };
    upload: {
        maxSize: number;
        tempDir: any;
        publicDir: any;
    };
    api: {
        version: string;
        baseUrl: string;
    };
};
export declare function validateConfig(): void;
//# sourceMappingURL=index.d.ts.map