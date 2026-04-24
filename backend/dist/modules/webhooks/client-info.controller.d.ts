import { WhatsappService } from './whatsapp.service';
export declare class ClientInfoController {
    private readonly whatsapp;
    constructor(whatsapp: WhatsappService);
    getInfo(body: any): Promise<{
        id: number;
        phone_number: string;
        business_name: string;
        business_description: string;
        logo_url: string | null;
        primary_color: string;
        secondary_color: string;
        font_preference: string;
        brand_tone: string;
        industry: string;
        default_language: string;
        onboarding_complete: boolean;
        brand_assets: {
            logo_url: string | null;
            primary_color: string;
            secondary_color: string;
            business_name: string;
            brand_tone: string;
            font_preference: string;
            industry: string;
            default_language: string;
        };
        client: {
            id: number;
            phone_number: string;
            business_name: string;
            logo_url: string | null;
            primary_color: string;
            secondary_color: string;
            brand_assets: {
                logo_url: string | null;
                primary_color: string;
                secondary_color: string;
                business_name: string;
                brand_tone: string;
                font_preference: string;
                industry: string;
                default_language: string;
            };
        };
    }>;
}
