import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { CreativeJob, JobType } from '../../entities/creative-job.entity';
import { WebMultiProduct } from '../../entities/web-multi-product.entity';
import { WebDeletedJob } from '../../entities/web-deleted-job.entity';
import { WebDesignEditRequest } from '../../entities/web-design-edit-request.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
import { WebUser } from '../../entities/web-user.entity';
import { ToolsService } from '../tools/tools.service';

const CREDIT_MAP: Record<string, { type: string; amount: number }> = {
  announcement:     { type: 'image', amount: 1 },
  product_sale:     { type: 'image', amount: 1 },
  from_image:       { type: 'image', amount: 1 },
  before_after:     { type: 'image', amount: 1 },
  multi_mode:       { type: 'image', amount: 1 },
  tips_carousel:    { type: 'image', amount: 1 },
  video:            { type: 'video', amount: 1 },
  ugc_video:        { type: 'video', amount: 1 },
  reel:             { type: 'video', amount: 1 },
  content_strategy: { type: 'text',  amount: 1 },
};

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(WebMultiProduct) private productRepo: Repository<WebMultiProduct>,
    @InjectRepository(WebDeletedJob) private deletedRepo: Repository<WebDeletedJob>,
    @InjectRepository(WebDesignEditRequest) private editRepo: Repository<WebDesignEditRequest>,
    @InjectRepository(WebUserClient) private wucRepo: Repository<WebUserClient>,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    private readonly tools: ToolsService,
  ) {}

  async list(clientId: number, userId: number) {
    const deleted = await this.deletedRepo.find({
      where: { client_id: clientId, web_user_id: userId },
      select: ['job_id'],
    });
    const deletedIds = deleted.map((d) => d.job_id);

    const jobs = await this.jobRepo.find({
      where: {
        client_id: clientId,
        ...(deletedIds.length ? { id: Not(In(deletedIds)) } : {}),
      },
      order: { created_at: 'DESC' },
    });

    return Promise.all(
      jobs.map(async (job) => {
        const latestEdit = await this.editRepo.findOne({
          where: { job_id: job.id },
          order: { requested_at: 'DESC' },
        });
        return { ...job, edit_status: latestEdit?.status ?? null };
      }),
    );
  }

  async create(dto: any, userId: number) {
    const { client_id, job_type, products, ...rest } = dto;
    await this.ensureClientOwner(client_id, userId);

    const creditInfo = CREDIT_MAP[job_type];
    if (creditInfo) await this.deductCredits(userId, creditInfo.type, creditInfo.amount);

    const initialStage = job_type === 'multi_mode' ? 'await_user_input' : 'generate_design';
    const job = this.jobRepo.create({
      client_id,
      job_type,
      current_stage: initialStage,
      language: rest.language || 'en',
      image_size: rest.image_size || 'post',
      user_message: rest.user_message,
      user_images: rest.user_images,
      media_type: ['video', 'ugc_video', 'reel'].includes(job_type) ? 'video' : 'image',
      credits_cost: 1,
    });
    await this.jobRepo.save(job);

    if (job_type === 'multi_mode' && products?.length) {
      for (let i = 0; i < products.length; i++) {
        await this.productRepo.save(
          this.productRepo.create({ job_id: job.id, sort_order: i, ...products[i] }),
        );
      }
    }

    if (initialStage !== 'await_user_input') {
      this.tools.dispatchJob(job.id).catch(() => {});
    }

    return job;
  }

  async cancel(jobId: number, userId: number) {
    const job = await this.getJobForUser(jobId, userId);
    job.current_stage = 'rejected';
    return this.jobRepo.save(job);
  }

  async reset(jobId: number, userId: number) {
    const job = await this.getJobForUser(jobId, userId);
    job.current_stage = 'await_user_input';
    job.design_variations = [] as string[];
    job.ad_copy = '';
    return this.jobRepo.save(job);
  }

  async retryVideo(jobId: number, userId: number) {
    const job = await this.getJobForUser(jobId, userId);
    job.current_stage = 'generate_video';
    await this.jobRepo.save(job);
    this.tools.dispatchJob(job.id).catch(() => {});
    return job;
  }

  async softDelete(jobId: number, userId: number) {
    const job = await this.getJobForUser(jobId, userId);
    const del = this.deletedRepo.create({ job_id: job.id, web_user_id: userId, client_id: job.client_id });
    await this.deletedRepo.save(del);
    return { success: true };
  }

  async submitEditRequest(jobId: number, userId: number, userEdit: string, imageUrl: string, editMode: string) {
    const job = await this.getJobForUser(jobId, userId);
    await this.editRepo.update({ job_id: jobId, status: 'pending' }, { status: 'superseded' });
    const req = this.editRepo.create({ job_id: jobId, client_id: job.client_id, user_edit: userEdit });
    await this.editRepo.save(req);
    job.current_stage = 'generate_design';
    await this.jobRepo.save(job);
    this.tools.dispatchEditDesign(jobId, req.id, userEdit, imageUrl, editMode).catch(() => {});
    return { success: true };
  }

  async getEditHistory(jobId: number, userId: number) {
    await this.getJobForUser(jobId, userId);
    return this.editRepo.find({ where: { job_id: jobId }, order: { requested_at: 'DESC' } });
  }

  private async getJobForUser(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    await this.ensureClientOwner(job.client_id, userId);
    return job;
  }

  private async ensureClientOwner(clientId: number, userId: number) {
    const link = await this.wucRepo.findOne({ where: { client_id: clientId, web_user_id: userId } });
    if (!link) throw new NotFoundException('Brand not found or not yours');
  }

  private async deductCredits(userId: number, type: string, amount: number) {
    const col = `${type}_credits_remaining` as any;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user[col] < amount) throw new BadRequestException('Insufficient credits');
    await this.userRepo.decrement({ id: userId }, col, amount);
  }
}
