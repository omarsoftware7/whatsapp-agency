import { WebLandingPage } from './web-landing-page.entity';
import { Client } from './client.entity';
export declare class WebLandingPageEdit {
    id: number;
    landing_page_id: number;
    client_id: number;
    landingPage: WebLandingPage;
    client: Client;
    user_prompt: string;
    status: string;
    error_message: string;
    created_at: Date;
    completed_at: Date;
}
