import { CreativeJob } from './creative-job.entity';
import { Client } from './client.entity';
export declare class WebScheduledPost {
    id: number;
    job_id: number;
    client_id: number;
    job: CreativeJob;
    client: Client;
    scheduled_at: Date;
    publish_type: string;
    status: string;
    error_message: string;
    created_at: Date;
    published_at: Date;
}
