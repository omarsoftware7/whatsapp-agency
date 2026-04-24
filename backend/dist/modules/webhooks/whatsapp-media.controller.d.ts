import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
export declare class WhatsappMediaController {
    private readonly whatsapp;
    private readonly config;
    constructor(whatsapp: WhatsappService, config: ConfigService);
    getMedia(body: any): Promise<{
        status: string;
        media_id: string;
        mime_type: string;
        base64_data: string;
        file_size: number;
        filename?: undefined;
        saved_path?: undefined;
        public_url?: undefined;
    } | {
        status: string;
        media_id: string;
        mime_type: string;
        filename: string;
        saved_path: string;
        public_url: string;
        file_size: number;
        base64_data?: undefined;
    }>;
}
