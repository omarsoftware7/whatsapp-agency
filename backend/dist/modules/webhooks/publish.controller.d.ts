import { WhatsappService } from './whatsapp.service';
export declare class PublishController {
    private readonly whatsapp;
    constructor(whatsapp: WhatsappService);
    publish(body: any): Promise<{
        status: string;
        job_id: number;
        results: Record<string, any>;
    }>;
}
