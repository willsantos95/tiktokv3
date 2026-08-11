import { VideoMetadata, SessionUser } from '../../../types/index.js';
export declare class VideoService {
    validateVideoFile(file: Express.Multer.File): void;
    validateMetadata(metadata: VideoMetadata): void;
    initializeUpload(user: SessionUser, fileSize: number, chunkSizeBytes?: number): Promise<string>;
    uploadVideoChunk(user: SessionUser, uploadToken: string, videoBuffer: Buffer, partNumber?: number, chunkSize?: number): Promise<void>;
    finalizeUpload(user: SessionUser, uploadToken: string, metadata: VideoMetadata, publishType: 'DRAFT' | 'PUBLISH_IMMEDIATELY'): Promise<string>;
    uploadVideoFile(user: SessionUser, uploadToken: string, filePath: string, chunkSizeBytes?: number): Promise<void>;
    cleanupTempFile(filePath: string): void;
}
export declare const videoService: VideoService;
//# sourceMappingURL=video.service.d.ts.map