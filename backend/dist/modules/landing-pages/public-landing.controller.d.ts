import { LandingPagesService } from './landing-pages.service';
export declare class PublicLandingController {
    private readonly service;
    constructor(service: LandingPagesService);
    render(slug: string, res: any): Promise<void>;
    submitLead(body: {
        landing_page_id: number;
        client_id: number;
        name?: string;
        email?: string;
        phone?: string;
        source_url?: string;
    }): Promise<import("../../entities/web-landing-page-lead.entity").WebLandingPageLead>;
}
