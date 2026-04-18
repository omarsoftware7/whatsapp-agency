import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { Client } from '../../entities/client.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { ApiKey } from '../../entities/api-key.entity';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client, CreativeJob, ApiKey]), ToolsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WebhooksModule {}
