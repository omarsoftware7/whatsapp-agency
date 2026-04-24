import { ScheduledPostsService } from './scheduled-posts.service';
export declare class ScheduledPostsController {
    private readonly service;
    constructor(service: ScheduledPostsService);
    list(body: {
        client_id: number;
    }): Promise<import("../../entities/web-scheduled-post.entity").WebScheduledPost[]>;
    schedule(body: {
        job_id: number;
        client_id: number;
        scheduled_at: string;
        publish_type: string;
    }): Promise<import("../../entities/web-scheduled-post.entity").WebScheduledPost>;
    cancel(id: number): Promise<{
        success: boolean;
    }>;
}
