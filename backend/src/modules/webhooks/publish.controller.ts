import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('publish')
@UseGuards(ApiKeyGuard)
export class PublishController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Post()
  async publish(@Body() body: any) {
    const jobId: number = parseInt(body.job_id);
    if (!jobId) throw new BadRequestException('job_id required');
    return this.whatsapp.publishForClient(jobId);
  }
}
