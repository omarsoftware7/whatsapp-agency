import { WebUser } from './web-user.entity';
import { Client } from './client.entity';
export declare class WebUserClient {
    id: number;
    web_user_id: number;
    client_id: number;
    webUser: WebUser;
    client: Client;
    created_at: Date;
}
