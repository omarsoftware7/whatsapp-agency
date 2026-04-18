import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../entities/client.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { ToolsService } from '../tools/tools.service';

const JOB_TYPE_MENU: Record<string, string> = {
  '1': 'announcement',
  '2': 'product_sale',
  '3': 'from_image',
  '4': 'before_after',
  '5': 'content_strategy',
  '6': 'multi_mode',
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    private readonly tools: ToolsService,
  ) {}

  async handleMessage(body: any) {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return;

    const phoneNumber = message.from;
    const text = message.text?.body?.trim() || '';

    let client = await this.clientRepo.findOne({ where: { phone_number: phoneNumber } });
    if (!client) {
      client = await this.clientRepo.save(
        this.clientRepo.create({ phone_number: phoneNumber, whatsapp_name: change.value.contacts?.[0]?.profile?.name }),
      );
    }

    // Update last activity
    client.last_activity_at = new Date();
    await this.clientRepo.save(client);

    // Commands
    if (text.startsWith('abort#')) {
      const jobId = parseInt(text.replace('abort#', ''));
      if (jobId) await this.jobRepo.update(jobId, { current_stage: 'rejected' });
      return;
    }

    if (text === '/new') {
      await this.jobRepo.update({ client_id: client.id, current_stage: 'await_user_input' }, { current_stage: 'rejected' });
      return;
    }

    // Menu selection
    if (JOB_TYPE_MENU[text]) {
      const jobType = JOB_TYPE_MENU[text];
      const job = await this.jobRepo.save(
        this.jobRepo.create({
          client_id: client.id,
          job_type: jobType as any,
          current_stage: 'await_user_input',
          language: client.default_language || 'en',
        }),
      );
      this.logger.log(`Created WhatsApp job ${job.id} type=${jobType} for client ${client.id}`);
    }
  }

  async getJob(jobId: number) {
    return this.jobRepo.findOne({ where: { id: jobId }, relations: ['client'] });
  }

  async saveDesign(jobId: number, designUrls: string[]) {
    await this.jobRepo.update(jobId, {
      design_variations: designUrls,
      current_stage: 'await_design_approval',
    });
  }

  async approveDesign(jobId: number, index: number) {
    await this.jobRepo.update(jobId, {
      design_approved: true,
      design_approved_at: new Date(),
      approved_design_index: index,
      current_stage: 'generate_ad_copy',
    });
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    this.tools.dispatchJob(jobId).catch(() => {});
    return job;
  }

  async saveCopy(jobId: number, adCopy: object) {
    await this.jobRepo.update(jobId, { ad_copy: JSON.stringify(adCopy), current_stage: 'await_copy_approval' });
  }

  async approveCopy(jobId: number) {
    await this.jobRepo.update(jobId, { ad_copy_approved: true, ad_copy_approved_at: new Date(), current_stage: 'await_publish_approval' });
  }

  async approvePublish(jobId: number) {
    await this.jobRepo.update(jobId, { publish_approved: true, publish_approved_at: new Date(), current_stage: 'publishing' });
  }
}
