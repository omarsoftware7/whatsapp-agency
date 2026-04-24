import { Repository } from 'typeorm';
import { WebScheduledPost } from '../../entities/web-scheduled-post.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { MetaService } from '../meta/meta.service';
export declare class ScheduledPostsService {
    private postRepo;
    private jobRepo;
    private profileRepo;
    private readonly meta;
    private readonly logger;
    constructor(postRepo: Repository<WebScheduledPost>, jobRepo: Repository<CreativeJob>, profileRepo: Repository<WebBrandProfile>, meta: MetaService);
    list(clientId: number): Promise<WebScheduledPost[]>;
    schedule(jobId: number, clientId: number, scheduledAt: Date, publishType: string): Promise<WebScheduledPost>;
    cancel(scheduleId: number): Promise<{
        success: boolean;
    }>;
    processScheduled(): Promise<void>;
}
