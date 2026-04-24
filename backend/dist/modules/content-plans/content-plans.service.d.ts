import { Repository } from 'typeorm';
import { WebContentPlan } from '../../entities/web-content-plan.entity';
import { WebContentPlanItem } from '../../entities/web-content-plan-item.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebUser } from '../../entities/web-user.entity';
import { GeminiService } from '../ai/gemini.service';
import { ToolsService } from '../tools/tools.service';
export declare class ContentPlansService {
    private planRepo;
    private itemRepo;
    private jobRepo;
    private userRepo;
    private readonly gemini;
    private readonly tools;
    constructor(planRepo: Repository<WebContentPlan>, itemRepo: Repository<WebContentPlanItem>, jobRepo: Repository<CreativeJob>, userRepo: Repository<WebUser>, gemini: GeminiService, tools: ToolsService);
    getLatest(clientId: number, userId: number): Promise<WebContentPlan | null>;
    generate(clientId: number, userId: number, mode: string, userPrompt?: string): Promise<WebContentPlan | null>;
    updateItem(itemId: number, title: string, ideaText: string): Promise<WebContentPlanItem | null>;
    approveItem(itemId: number): Promise<WebContentPlanItem | null>;
    createJobFromItem(itemId: number, userId: number, imageSize: string, language: string): Promise<CreativeJob>;
}
