import { Client } from './client.entity';
export declare class WebBusinessCard {
    id: number;
    client_id: number;
    client: Client;
    title: string;
    subtitle: string;
    header_image_url: string;
    phone_1: string;
    phone_2: string;
    address: string;
    location_url: string;
    facebook_url: string;
    instagram_url: string;
    whatsapp_number: string;
    gallery_images: string[];
    status: string;
    public_slug: string;
    created_at: Date;
    updated_at: Date;
}
