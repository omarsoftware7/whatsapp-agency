import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledPostsController } from './scheduled-posts.controller';
import { ScheduledPostsService } from './scheduled-posts.service';
import { WebScheduledPost } from '../../entities/web-scheduled-post.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [TypeOrmModule.forFeature([WebScheduledPost, CreativeJob, WebBrandProfile]), MetaModule],
  controllers: [ScheduledPostsController],
  providers: [ScheduledPostsService],
})
export class ScheduledPostsModule {}
