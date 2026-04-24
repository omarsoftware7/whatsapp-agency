import { Client } from './client.entity';
import { WebUser } from './web-user.entity';
import { WebContentPlanItem } from './web-content-plan-item.entity';
export declare class WebContentPlan {
    id: number;
    client_id: number;
    web_user_id: number;
    client: Client;
    webUser: WebUser;
    mode: string;
    user_prompt: string;
    created_at: Date;
    items: WebContentPlanItem[];
}
