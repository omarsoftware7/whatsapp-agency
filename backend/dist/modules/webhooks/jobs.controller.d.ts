import { WhatsappService } from './whatsapp.service';
export declare class JobsController {
    private readonly whatsapp;
    constructor(whatsapp: WhatsappService);
    handle(body: any): Promise<{
        job: import("../../entities/creative-job.entity").CreativeJob;
    } | {
        status: string;
        job_id: number;
    }>;
}
