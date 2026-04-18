import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebMultiProduct } from '../../entities/web-multi-product.entity';
import { WebDesignEditRequest } from '../../entities/web-design-edit-request.entity';
import { WebLandingPage } from '../../entities/web-landing-page.entity';
import { WebUser } from '../../entities/web-user.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
import { Client } from '../../entities/client.entity';
import { GeminiService } from '../ai/gemini.service';
import { KieService } from '../ai/kie.service';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);
  private readonly uploadsDir = process.env.UPLOADS_DIR || './uploads';

  constructor(
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(WebMultiProduct) private productRepo: Repository<WebMultiProduct>,
    @InjectRepository(WebDesignEditRequest) private editRepo: Repository<WebDesignEditRequest>,
    @InjectRepository(WebLandingPage) private landingRepo: Repository<WebLandingPage>,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(WebUserClient) private wucRepo: Repository<WebUserClient>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    private readonly gemini: GeminiService,
    private readonly kie: KieService,
  ) {}

  async dispatchJob(jobId: number): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId }, relations: ['client'] });
    if (!job) return;

    if (job.processing_lock && job.processing_lock_at) {
      const lockAge = Date.now() - job.processing_lock_at.getTime();
      if (lockAge < 5 * 60 * 1000) return; // locked within 5 min
    }

    switch (job.current_stage) {
      case 'generate_design':
        return this.runGenerateDesign(job);
      case 'generate_video':
        return this.runGenerateVideo(job);
      case 'generate_multi_variants':
        return this.runGenerateMultiVariants(job);
      case 'generate_ad_copy':
        return this.runGenerateAdCopy(job);
      default:
        this.logger.warn(`dispatchJob: unexpected stage ${job.current_stage} for job ${jobId}`);
    }
  }

  async dispatchEditDesign(jobId: number, editId: number, userEdit: string, imageUrl: string, editMode: string) {
    setImmediate(() => this.runEditDesign(jobId, editId, userEdit, imageUrl, editMode).catch((e) => this.logger.error(e)));
  }

  async dispatchGenerateLandingPage(landingPageId: number) {
    setImmediate(() => this.runGenerateLandingPage(landingPageId).catch((e) => this.logger.error(e)));
  }

  // ── Design generation ────────────────────────────────────────────────────

  private async runGenerateDesign(job: CreativeJob) {
    await this.lock(job);
    try {
      const client = job.client || await this.clientRepo.findOne({ where: { id: job.client_id } });
      const prompt = this.buildDesignPrompt(job, client);
      const imgBuffer = await this.gemini.generateImage(prompt);
      const filename = `${randomUUID()}.png`;
      const filepath = join(this.uploadsDir, 'generated', filename);
      writeFileSync(filepath, imgBuffer);
      const url = `/uploads/generated/${filename}`;

      job.design_variations = [url];
      job.current_stage = 'await_design_approval';
      await this.jobRepo.save(job);
    } catch (e) {
      await this.failJob(job, String(e));
    } finally {
      await this.unlock(job);
    }
  }

  private async runGenerateVideo(job: CreativeJob) {
    await this.lock(job);
    try {
      const imageUrls = job.user_images || [];
      const aspectRatio = job.image_size === 'story' ? '9:16' : '1:1';
      const prompt = job.user_message || 'Generate a professional marketing video';
      const taskId = await this.kie.generateVideo(prompt, imageUrls, aspectRatio);
      const videoUrl = await this.kie.pollVideo(taskId, 30, 10000);

      job.design_variations = [videoUrl];
      job.media_type = 'video';
      job.current_stage = 'await_design_approval';
      await this.jobRepo.save(job);
    } catch (e) {
      await this.failJob(job, String(e));
    } finally {
      await this.unlock(job);
    }
  }

  private async runGenerateMultiVariants(job: CreativeJob) {
    await this.lock(job);
    try {
      const products = await this.productRepo.find({ where: { job_id: job.id }, order: { sort_order: 'ASC' } });
      const templateUrl = job.design_variations?.[0];

      for (const product of products) {
        product.status = 'generating';
        await this.productRepo.save(product);
        try {
          const prompt = `Swap the product in this template image. New product: ${product.product_name}. Price: ${product.price}. ${product.notes || ''}. Keep the same layout, fonts, and brand colors. Only replace the product image and price text.`;
          const imgBuffer = await this.gemini.generateImage(prompt);
          const filename = `${randomUUID()}.png`;
          writeFileSync(join(this.uploadsDir, 'generated', filename), imgBuffer);
          product.generated_image_url = `/uploads/generated/${filename}`;
          product.status = 'completed';
        } catch (e) {
          product.status = 'failed';
          product.error_message = String(e);
        }
        await this.productRepo.save(product);
      }

      job.current_stage = 'generate_ad_copy';
      await this.jobRepo.save(job);
      await this.runGenerateAdCopy(job);
    } catch (e) {
      await this.failJob(job, String(e));
    } finally {
      await this.unlock(job);
    }
  }

  private async runGenerateAdCopy(job: CreativeJob) {
    await this.lock(job);
    try {
      const client = job.client || await this.clientRepo.findOne({ where: { id: job.client_id } });
      const imageUrl = job.design_variations?.[job.approved_design_index ?? 0];
      const descriptionPrompt = `Describe this marketing image in detail for ad copy purposes. Business: ${client.business_name}. Industry: ${client.industry}.`;
      const imageDescription = imageUrl
        ? await this.gemini.generateText(descriptionPrompt)
        : job.user_message;

      const copyPrompt = `Write professional ad copy for this marketing content.
Business: ${client.business_name}
Description: ${client.business_description}
Image context: ${imageDescription}
Language: ${job.language}
Tone: ${client.brand_tone || 'professional'}

Return ONLY valid JSON: {"headline": "...", "body": "...", "cta": "..."}`;

      const raw = await this.gemini.generateText(copyPrompt, 512, 0.8);
      const jsonStr = raw.replace(/```json|```/g, '').trim();
      const adCopy = JSON.parse(jsonStr);

      job.ad_copy = JSON.stringify(adCopy);
      job.current_stage = 'await_copy_approval';
      await this.jobRepo.save(job);
    } catch (e) {
      await this.failJob(job, String(e));
    } finally {
      await this.unlock(job);
    }
  }

  private async runEditDesign(jobId: number, editId: number, userEdit: string, imageUrl: string, editMode: string) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    const editReq = await this.editRepo.findOne({ where: { id: editId } });
    if (!job || !editReq) return;

    try {
      const prompt = `Edit this marketing image based on user feedback: "${userEdit}". Keep brand colors, logo, and overall layout. Only apply the specific requested changes.`;
      let imgBuffer: Buffer;

      if (editMode === 'edit') {
        // Use Gemini edit model with existing image
        imgBuffer = await this.gemini.generateImage(prompt, [], this.gemini.editModel);
      } else {
        // Recreate from scratch
        imgBuffer = await this.gemini.generateImage(prompt);
      }

      const filename = `${randomUUID()}.png`;
      writeFileSync(join(this.uploadsDir, 'generated', filename), imgBuffer);
      const newUrl = `/uploads/generated/${filename}`;

      job.design_variations = [...(job.design_variations || []), newUrl];
      job.current_stage = 'await_design_approval';
      await this.jobRepo.save(job);

      editReq.status = 'completed';
      editReq.result_image_url = newUrl;
      editReq.completed_at = new Date();
      await this.editRepo.save(editReq);
    } catch (e) {
      editReq.status = 'failed';
      editReq.error_message = String(e);
      await this.editRepo.save(editReq);
    }
  }

  private async runGenerateLandingPage(landingPageId: number) {
    const page = await this.landingRepo.findOne({ where: { id: landingPageId }, relations: ['client'] });
    if (!page) return;

    try {
      const client = page.client;
      const prompt = `Generate a complete, professional HTML landing page for:
Business: ${client?.business_name}
Description: ${client?.business_description}
User request: ${page.user_prompt}
Primary color: ${client?.primary_color || '#6366f1'}
Secondary color: ${client?.secondary_color || '#8b5cf6'}

Requirements:
- Full standalone HTML with embedded CSS
- Include a lead capture form with name, email, phone fields
- Form action must be /api/public/leads with method POST
- Add a hidden field: <input type="hidden" name="landing_page_id" value="${landingPageId}">
- Mobile responsive
- Professional design matching the brand colors
- Do NOT include any external CDN links
Return ONLY the complete HTML, no markdown.`;

      const html = await this.gemini.generateText(prompt, 4096, 0.7);
      const cleanHtml = html.replace(/```html|```/g, '').trim();

      page.html = cleanHtml;
      page.status = 'published';
      await this.landingRepo.save(page);
    } catch (e) {
      page.status = 'failed';
      page.error_message = String(e);
      await this.landingRepo.save(page);
    }
  }

  // ── Prompt builders ──────────────────────────────────────────────────────

  private buildDesignPrompt(job: CreativeJob, client: Client): string {
    const size = job.image_size === 'story' ? '1080x1920 pixels (9:16 vertical)' : '1080x1080 pixels (1:1 square)';
    const logoNote = client.logo_filename
      ? `Logo protection: DO NOT modify, distort, recolor, or alter the logo in any way. Place it prominently at top center.`
      : '';

    const baseContext = `Business: ${client.business_name}
Industry: ${client.industry || 'general'}
Brand tone: ${client.brand_tone || 'professional'}
Primary color: ${client.primary_color || '#6366f1'}
Secondary color: ${client.secondary_color || '#8b5cf6'}
Language: ${job.language}
${logoNote}`;

    switch (job.job_type) {
      case 'announcement':
        return `Create a ${size} social media announcement post. ${baseContext}\nMessage: ${job.user_message}`;
      case 'product_sale':
        return `Create a ${size} product sale advertisement. ${baseContext}\nProduct details: ${job.user_message}`;
      case 'from_image':
        return `Create a ${size} marketing post based on the provided image. ${baseContext}\nContext: ${job.user_message}`;
      case 'before_after':
        return `Create a ${size} before/after split layout post. Left side: before. Right side: after. ${baseContext}\nDetails: ${job.user_message}`;
      case 'tips_carousel':
        return `Create a ${size} tips/educational carousel slide. ${baseContext}\nContent: ${job.user_message}`;
      case 'multi_mode':
        return `Create a ${size} product catalog template. ${baseContext}\nDescription: ${job.user_message}`;
      default:
        return `Create a ${size} professional marketing visual. ${baseContext}\nContent: ${job.user_message}`;
    }
  }

  // ── Lock helpers ─────────────────────────────────────────────────────────

  private async lock(job: CreativeJob) {
    job.processing_lock = true;
    job.processing_lock_at = new Date();
    await this.jobRepo.save(job);
  }

  private async unlock(job: CreativeJob) {
    job.processing_lock = false;
    await this.jobRepo.save(job);
  }

  private async failJob(job: CreativeJob, message: string) {
    job.current_stage = 'rejected';
    job.error_message = message;
    await this.jobRepo.save(job);
  }
}
