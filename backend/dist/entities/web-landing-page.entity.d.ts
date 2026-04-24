import { Client } from './client.entity';
import { WebLandingPageLead } from './web-landing-page-lead.entity';
import { WebLandingPageEdit } from './web-landing-page-edit.entity';
export declare class WebLandingPage {
    id: number;
    client_id: number;
    client: Client;
    title: string;
    user_prompt: string;
    user_images: string[];
    html: string;
    status: string;
    public_slug: string;
    error_message: string;
    created_at: Date;
    updated_at: Date;
    leads: WebLandingPageLead[];
    edits: WebLandingPageEdit[];
}
