import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersController } from './admin-users.controller';
import { AdminBrandsController } from './admin-brands.controller';
import { AdminMetricsController } from './admin-metrics.controller';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminLandingPagesController } from './admin-landing-pages.controller';
import { AdminService } from './admin.service';
import { WebUser } from '../../entities/web-user.entity';
import { Client } from '../../entities/client.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebLandingPage } from '../../entities/web-landing-page.entity';
import { WebPayment } from '../../entities/web-payment.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebUser, Client, CreativeJob, WebLandingPage, WebPayment, WebReferral, ActivityLog, WebUserClient])],
  controllers: [AdminUsersController, AdminBrandsController, AdminMetricsController, AdminJobsController, AdminLandingPagesController],
  providers: [AdminService],
})
export class AdminModule {}
