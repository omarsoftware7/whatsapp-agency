import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { JobsController } from './jobs.controller';
import { OnboardingController } from './onboarding.controller';
import { PublishController } from './publish.controller';
import { N8nMetaOAuthController, MetaOAuthCompleteController } from './n8n-meta-oauth.controller';
import { WhatsappMediaController } from './whatsapp-media.controller';
import { ClientInfoController } from './client-info.controller';
import { FilesController } from './files.controller';
import { WhatsappService } from './whatsapp.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Client } from '../../entities/client.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { ApiKey } from '../../entities/api-key.entity';
import { IntentService } from './agent/intent.service';
import { WhatsAppSenderService } from './agent/whatsapp-sender.service';
import { DesignService } from './agent/design.service';
import { AdCopyService } from './agent/ad-copy.service';
import { OrchestratorService } from './agent/orchestrator.service';
import { R2Service } from '../../common/services/r2.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client, CreativeJob, ActivityLog, ApiKey])],
  controllers: [
    WhatsappController,
    JobsController,
    OnboardingController,
    PublishController,
    N8nMetaOAuthController,
    MetaOAuthCompleteController,
    WhatsappMediaController,
    ClientInfoController,
    FilesController,
  ],
  providers: [
    WhatsappService,
    ApiKeyGuard,
    IntentService,
    WhatsAppSenderService,
    DesignService,
    AdCopyService,
    OrchestratorService,
    R2Service,
  ],
  exports: [WhatsappService, R2Service],
})
export class WebhooksModule {}
