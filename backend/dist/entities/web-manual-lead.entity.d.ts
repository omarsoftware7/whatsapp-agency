import { WebUser } from './web-user.entity';
import { Client } from './client.entity';
export declare class WebManualLead {
    id: number;
    web_user_id: number;
    client_id: number;
    webUser: WebUser;
    client: Client;
    name: string;
    email: string;
    phone: string;
    source: string;
    imported_at: Date;
}
