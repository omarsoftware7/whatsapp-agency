import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
export declare class N8nMetaOAuthController {
    private readonly whatsapp;
    private readonly config;
    constructor(whatsapp: WhatsappService, config: ConfigService);
    getStatus(clientIdStr: string): Promise<{
        connected: number;
        page_id: string;
        instagram_account_id: string;
        expires: Date;
        expires_soon: boolean;
    }>;
    saveTokens(body: any): Promise<{
        status: string;
        client_id: number;
        page_id: string;
        instagram_account_id: string | null;
        expires: Date | null;
    }>;
}
export declare class MetaOAuthCompleteController {
    private readonly config;
    constructor(config: ConfigService);
    handleOAuth(action: string, clientIdStr: string, code: string, state: string, res: any): Promise<any>;
}
