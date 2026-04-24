import { WebContentPlan } from './web-content-plan.entity';
import { Client } from './client.entity';
import { CreativeJob } from './creative-job.entity';
export declare class WebContentPlanItem {
    id: number;
    plan_id: number;
    client_id: number;
    plan: WebContentPlan;
    client: Client;
    title: string;
    idea_text: string;
    job_type: string;
    status: string;
    job_id: number;
    job: CreativeJob;
    created_at: Date;
    updated_at: Date;
}
