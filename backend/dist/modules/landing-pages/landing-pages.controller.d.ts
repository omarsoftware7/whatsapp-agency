import { SessionUser } from '../../common/decorators/current-user.decorator';
import { LandingPagesService } from './landing-pages.service';
export declare class LandingPagesController {
    private readonly service;
    constructor(service: LandingPagesService);
    list(clientId: number, user: SessionUser): Promise<import("../../entities/web-landing-page.entity").WebLandingPage[]>;
    create(body: {
        client_id: number;
        user_prompt: string;
        user_images?: string[];
    }, user: SessionUser): Promise<import("../../entities/web-landing-page.entity").WebLandingPage>;
    softDelete(id: number, user: SessionUser): Promise<{
        success: boolean;
    }>;
}
