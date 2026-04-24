import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { WebLandingPage } from '../../entities/web-landing-page.entity';
import { WebLandingPageLead } from '../../entities/web-landing-page-lead.entity';
import { WebDeletedLandingPage } from '../../entities/web-deleted-landing-page.entity';
import { WebUser } from '../../entities/web-user.entity';
import { ToolsService } from '../tools/tools.service';

@Injectable()
export class LandingPagesService {
  constructor(
    @InjectRepository(WebLandingPage) private pageRepo: Repository<WebLandingPage>,
    @InjectRepository(WebLandingPageLead) private leadRepo: Repository<WebLandingPageLead>,
    @InjectRepository(WebDeletedLandingPage) private deletedRepo: Repository<WebDeletedLandingPage>,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    private readonly tools: ToolsService,
  ) {}

  async list(clientId: number, userId: number) {
    const deleted = await this.deletedRepo.find({ where: { web_user_id: userId }, select: ['landing_page_id'] });
    const deletedIds = deleted.map((d) => d.landing_page_id);
    return this.pageRepo.find({
      where: { client_id: clientId, ...(deletedIds.length ? { id: Not(In(deletedIds)) } : {}) },
      order: { created_at: 'DESC' },
    });
  }

  async create(clientId: number, userId: number, userPrompt: string, userImages?: string[]) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.landing_credits_remaining < 1) {
      throw new BadRequestException('Insufficient landing page credits');
    }
    await this.userRepo.decrement({ id: userId }, 'landing_credits_remaining', 1);

    const slug = randomBytes(8).toString('hex');
    const page = await this.pageRepo.save(
      this.pageRepo.create({ client_id: clientId, user_prompt: userPrompt, user_images: userImages, status: 'generating', public_slug: slug }),
    );

    this.tools.dispatchGenerateLandingPage(page.id).catch(() => {});
    return page;
  }

  async softDelete(pageId: number, userId: number) {
    const page = await this.pageRepo.findOne({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Landing page not found');
    await this.deletedRepo.save(this.deletedRepo.create({ landing_page_id: pageId, web_user_id: userId }));
    return { success: true };
  }

  async getBySlug(slug: string) {
    const page = await this.pageRepo.findOne({ where: { public_slug: slug } });
    if (!page) throw new NotFoundException('Landing page not found');
    return page;
  }

  async submitLead(landingPageId: number, clientId: number, data: { name?: string; email?: string; phone?: string; source_url?: string }) {
    return this.leadRepo.save(this.leadRepo.create({ landing_page_id: landingPageId, client_id: clientId, ...data }));
  }
}
