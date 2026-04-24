import { Client } from './client.entity';
import { CreativeJob } from './creative-job.entity';
export declare class ActivityLog {
    id: number;
    client_id: number;
    job_id: number;
    client: Client;
    job: CreativeJob;
    event_type: string;
    event_data: Record<string, any>;
    created_at: Date;
}
