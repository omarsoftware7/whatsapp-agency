import { ConfigService } from '@nestjs/config';
interface GeminiPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string;
    };
}
export declare class GeminiService {
    private readonly config;
    private readonly logger;
    private readonly baseUrl;
    constructor(config: ConfigService);
    get textModel(): any;
    get imageModel(): any;
    get editModel(): any;
    get apiKey(): any;
    generateText(prompt: string, maxTokens?: number, temperature?: number): Promise<string>;
    generateTextWithImages(prompt: string, imageParts: GeminiPart[], maxTokens?: number): Promise<string>;
    generateImage(prompt: string, imageParts?: GeminiPart[], model?: string): Promise<Buffer>;
    editImage(prompt: string, currentImageBase64: string, mimeType?: string): Promise<Buffer>;
    toInlinePart(buffer: Buffer, mimeType?: string): GeminiPart;
}
export {};
