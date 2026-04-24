import { WebLandingPage } from './web-landing-page.entity';
import { Client } from './client.entity';
export declare class WebLandingPageLead {
    id: number;
    landing_page_id: number;
    client_id: number;
    landingPage: WebLandingPage;
    client: Client;
    name: string;
    email: string;
    phone: string;
    source_url: string;
    created_at: Date;
}
