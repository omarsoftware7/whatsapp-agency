import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
export declare class WhatsappController {
    private readonly whatsapp;
    private readonly config;
    constructor(whatsapp: WhatsappService, config: ConfigService);
    verify(query: any, res: any): any;
    incoming(body: any): Promise<any>;
}
