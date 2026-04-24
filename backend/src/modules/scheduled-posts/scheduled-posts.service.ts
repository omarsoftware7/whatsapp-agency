import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebScheduledPost } from '../../entities/web-scheduled-post.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { MetaService } from '../meta/meta.service';

@Injectable()
export class ScheduledPostsService {
  private readonly logger = new Logger(ScheduledPostsService.name);

  constructor(
    @InjectRepository(WebScheduledPost) private postRepo: Repository<WebScheduledPost>,
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(WebBrandProfile) private profileRepo: Repository<WebBrandProfile>,
    private readonly meta: MetaService,
  ) {}

  async list(clientId: number) {
    return this.postRepo.find({
      where: { client_id: clientId },
      relations: ['job'],
      order: { scheduled_at: 'ASC' },
    });
  }

  async schedule(jobId: number, clientId: number, scheduledAt: Date, publishType: string) {
    const existing = await this.postRepo.findOne({ where: { job_id: jobId } });
    if (existing) {
      existing.scheduled_at = scheduledAt;
      existing.publish_type = publishType;
      existing.status = 'pending';
      return this.postRepo.save(existing);
    }
    return this.postRepo.save(
      this.postRepo.create({ job_id: jobId, client_id: clientId, scheduled_at: scheduledAt, publish_type: publishType }),
    );
  }

  async cancel(scheduleId: number) {
    await this.postRepo.update(scheduleId, { status: 'cancelled' });
    return { success: true };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduled() {
    const due = await this.postRepo.find({
      where: { status: 'pending' },
      relations: ['job'],
    });

    const now = new Date();
    for (const post of due) {
      if (post.scheduled_at > now) continue;
      const profile = await this.profileRepo.findOne({ where: { client_id: post.client_id } });
      if (!profile) continue;

      try {
        await this.meta.publish(post.job, post.publish_type as any, profile);
        post.status = 'published';
        post.published_at = new Date();
      } catch (e) {
        post.status = 'failed';
        post.error_message = String(e);
        this.logger.error(`Scheduled publish failed for post ${post.id}: ${e}`);
      }
      await this.postRepo.save(post);
    }
  }
}
