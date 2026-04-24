import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { WebUser } from '../../entities/web-user.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { WebLandingPage } from '../../entities/web-landing-page.entity';
import { WebBusinessCard } from '../../entities/web-business-card.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebUser, CreativeJob, ActivityLog, WebLandingPage, WebBusinessCard, WebReferral, WebUserClient])],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
