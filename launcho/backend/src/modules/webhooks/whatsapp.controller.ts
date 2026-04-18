import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKey } from '../../entities/api-key.entity';
import { Repository } from 'typeorm';

@Controller('webhooks')
export class WhatsappController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
    @InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>,
  ) {}

  // Meta webhook verification (no auth)
  @Get('whatsapp')
  verify(@Query() query: any) {
    const verifyToken = this.config.get('META_VERIFY_TOKEN');
    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === verifyToken) {
      return parseInt(query['hub.challenge']);
    }
    return 'Verification failed';
  }

  // Incoming WhatsApp messages (no auth — Meta sends directly)
  @Post('whatsapp')
  async incoming(@Body() body: any) {
    await this.whatsapp.handleMessage(body);
    return { status: 'ok' };
  }

  // n8n job management endpoints (API key auth)
  @Get('jobs/:id')
  @UseGuards(ApiKeyGuard)
  getJob(@Query('job_id') jobId: string) {
    return this.whatsapp.getJob(parseInt(jobId));
  }

  @Post('jobs/save-design')
  @UseGuards(ApiKeyGuard)
  saveDesign(@Body() body: { job_id: number; design_urls: string[] }) {
    return this.whatsapp.saveDesign(body.job_id, body.design_urls);
  }

  @Post('jobs/approve-design')
  @UseGuards(ApiKeyGuard)
  approveDesign(@Body() body: { job_id: number; index?: number }) {
    return this.whatsapp.approveDesign(body.job_id, body.index ?? 0);
  }

  @Post('jobs/save-copy')
  @UseGuards(ApiKeyGuard)
  saveCopy(@Body() body: { job_id: number; ad_copy: object }) {
    return this.whatsapp.saveCopy(body.job_id, body.ad_copy);
  }

  @Post('jobs/approve-copy')
  @UseGuards(ApiKeyGuard)
  approveCopy(@Body() body: { job_id: number }) {
    return this.whatsapp.approveCopy(body.job_id);
  }

  @Post('jobs/approve-publish')
  @UseGuards(ApiKeyGuard)
  approvePublish(@Body() body: { job_id: number }) {
    return this.whatsapp.approvePublish(body.job_id);
  }
}
