import { CreativeJob } from './creative-job.entity';
import { Client } from './client.entity';
export declare class WebDesignEditRequest {
    id: number;
    job_id: number;
    client_id: number;
    job: CreativeJob;
    client: Client;
    user_edit: string;
    status: string;
    error_message: string;
    result_image_url: string;
    requested_at: Date;
    completed_at: Date;
}
