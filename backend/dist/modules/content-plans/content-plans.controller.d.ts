import { SessionUser } from '../../common/decorators/current-user.decorator';
import { ContentPlansService } from './content-plans.service';
export declare class ContentPlansController {
    private readonly service;
    constructor(service: ContentPlansService);
    getLatest(clientId: number, user: SessionUser): Promise<import("../../entities/web-content-plan.entity").WebContentPlan | null>;
    generate(body: {
        client_id: number;
        mode: string;
        user_prompt?: string;
    }, user: SessionUser): Promise<import("../../entities/web-content-plan.entity").WebContentPlan | null>;
    updateItem(body: {
        item_id: number;
        title: string;
        idea_text: string;
    }): Promise<import("../../entities/web-content-plan-item.entity").WebContentPlanItem | null>;
    approveItem(body: {
        item_id: number;
    }): Promise<import("../../entities/web-content-plan-item.entity").WebContentPlanItem | null>;
    createJob(body: {
        item_id: number;
        image_size: string;
        language: string;
    }, user: SessionUser): Promise<import("../../entities/creative-job.entity").CreativeJob>;
}
