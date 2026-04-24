import { Client } from './client.entity';
export declare class WebLogoOption {
    id: number;
    client_id: number;
    client: Client;
    batch_id: number;
    image_url: string;
    prompt: string;
    status: string;
    created_at: Date;
}
