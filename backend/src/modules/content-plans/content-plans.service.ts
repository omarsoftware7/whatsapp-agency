import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebContentPlan } from '../../entities/web-content-plan.entity';
import { WebContentPlanItem } from '../../entities/web-content-plan-item.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebUser } from '../../entities/web-user.entity';
import { GeminiService } from '../ai/gemini.service';
import { ToolsService } from '../tools/tools.service';

@Injectable()
export class ContentPlansService {
  constructor(
    @InjectRepository(WebContentPlan) private planRepo: Repository<WebContentPlan>,
    @InjectRepository(WebContentPlanItem) private itemRepo: Repository<WebContentPlanItem>,
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    private readonly gemini: GeminiService,
    private readonly tools: ToolsService,
  ) {}

  async getLatest(clientId: number, userId: number) {
    const plan = await this.planRepo.findOne({
      where: { client_id: clientId, web_user_id: userId },
      order: { created_at: 'DESC' },
      relations: ['items'],
    });
    return plan;
  }

  async generate(clientId: number, userId: number, mode: string, userPrompt?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.text_credits_remaining < 4) {
      throw new BadRequestException('Insufficient text credits (4 required)');
    }
    await this.userRepo.decrement({ id: userId }, 'text_credits_remaining', 4);

    const prompt = `Generate a monthly social media content plan with exactly 4 post ideas for this business.
${userPrompt ? `User request: ${userPrompt}` : ''}
Return ONLY a valid JSON array of 4 objects with: title (string), idea_text (string), job_type (one of: announcement, product_sale, from_image, before_after).
Example: [{"title":"...","idea_text":"...","job_type":"announcement"}]`;

    const raw = await this.gemini.generateText(prompt, 1024, 0.8);
    const items: any[] = JSON.parse(raw.replace(/```json|```/g, '').trim());

    const plan = await this.planRepo.save(
      this.planRepo.create({ client_id: clientId, web_user_id: userId, mode, user_prompt: userPrompt }),
    );

    // supersede old items
    await this.itemRepo.update({ client_id: clientId }, { status: 'superseded' });

    for (const item of items.slice(0, 4)) {
      await this.itemRepo.save(
        this.itemRepo.create({
          plan_id: plan.id,
          client_id: clientId,
          title: item.title,
          idea_text: item.idea_text,
          job_type: item.job_type,
          status: 'draft',
        }),
      );
    }
    return this.planRepo.findOne({ where: { id: plan.id }, relations: ['items'] });
  }

  async updateItem(itemId: number, title: string, ideaText: string) {
    await this.itemRepo.update(itemId, { title, idea_text: ideaText });
    return this.itemRepo.findOne({ where: { id: itemId } });
  }

  async approveItem(itemId: number) {
    await this.itemRepo.update(itemId, { status: 'approved' });
    return this.itemRepo.findOne({ where: { id: itemId } });
  }

  async createJobFromItem(itemId: number, userId: number, imageSize: string, language: string) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new BadRequestException('Item not found');

    const job = await this.jobRepo.save(
      this.jobRepo.create({
        client_id: item.client_id,
        job_type: item.job_type as any,
        user_message: item.idea_text,
        image_size: imageSize,
        language,
        current_stage: 'generate_design',
      }),
    );

    await this.itemRepo.update(itemId, { status: 'created', job_id: job.id });
    this.tools.dispatchJob(job.id).catch(() => {});
    return job;
  }
}
