import { Repository } from 'typeorm';
import { WebLandingPage } from '../../entities/web-landing-page.entity';
import { WebLandingPageLead } from '../../entities/web-landing-page-lead.entity';
import { WebDeletedLandingPage } from '../../entities/web-deleted-landing-page.entity';
import { WebUser } from '../../entities/web-user.entity';
import { ToolsService } from '../tools/tools.service';
export declare class LandingPagesService {
    private pageRepo;
    private leadRepo;
    private deletedRepo;
    private userRepo;
    private readonly tools;
    constructor(pageRepo: Repository<WebLandingPage>, leadRepo: Repository<WebLandingPageLead>, deletedRepo: Repository<WebDeletedLandingPage>, userRepo: Repository<WebUser>, tools: ToolsService);
    list(clientId: number, userId: number): Promise<WebLandingPage[]>;
    create(clientId: number, userId: number, userPrompt: string, userImages?: string[]): Promise<WebLandingPage>;
    softDelete(pageId: number, userId: number): Promise<{
        success: boolean;
    }>;
    getBySlug(slug: string): Promise<WebLandingPage>;
    submitLead(landingPageId: number, clientId: number, data: {
        name?: string;
        email?: string;
        phone?: string;
        source_url?: string;
    }): Promise<WebLandingPageLead>;
}
