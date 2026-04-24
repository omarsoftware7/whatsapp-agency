import { WebUser } from './web-user.entity';
import { CreativeJob } from './creative-job.entity';
import { Client } from './client.entity';
export declare class WebDeletedJob {
    id: number;
    job_id: number;
    web_user_id: number;
    client_id: number;
    job: CreativeJob;
    webUser: WebUser;
    client: Client;
    deleted_at: Date;
}
