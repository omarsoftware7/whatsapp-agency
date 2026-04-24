import { Repository } from 'typeorm';
import { WhatsappService } from './whatsapp.service';
import { Client } from '../../entities/client.entity';
export declare class OnboardingController {
    private readonly whatsapp;
    private clientRepo;
    constructor(whatsapp: WhatsappService, clientRepo: Repository<Client>);
    handle(body: any): Promise<{
        status: string;
        client_id: number;
        next_step: string;
    } | {
        status: string;
        client_id: number;
        brand_profile: any;
        message: string;
    }>;
}
