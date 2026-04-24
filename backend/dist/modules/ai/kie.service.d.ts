import { ConfigService } from '@nestjs/config';
export declare class KieService {
    private readonly config;
    private readonly logger;
    private readonly baseUrl;
    constructor(config: ConfigService);
    private get headers();
    generateVideo(prompt: string, imageUrls: string[], aspectRatio?: string): Promise<string>;
    pollVideo(taskId: string, maxAttempts?: number, intervalMs?: number): Promise<string>;
    private sleep;
}
