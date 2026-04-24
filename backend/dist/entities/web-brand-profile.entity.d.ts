import { Client } from './client.entity';
export declare class WebBrandProfile {
    id: number;
    client_id: number;
    client: Client;
    category: string;
    website: string;
    instagram_handle: string;
    meta_page_id: string;
    meta_page_token: string;
    meta_page_token_expires: Date;
    instagram_account_id: string;
    meta_tokens_valid: boolean;
    target_audience: string;
    price_range: string;
    country: string;
    facebook_page_url: string;
    instagram_page_url: string;
    heard_about: string;
    created_at: Date;
    updated_at: Date;
}
