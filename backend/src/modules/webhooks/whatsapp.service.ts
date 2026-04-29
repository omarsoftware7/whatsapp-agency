import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '../../entities/client.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { R2Service } from '../../common/services/r2.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

const JOB_TYPE_MENU: Record<string, string> = {
  '1': 'announcement',
  '2': 'product_sale',
  '3': 'reel',
  '4': 'content_strategy',
  '5': 'ugc_video',
  '6': 'multi_mode',
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(ActivityLog) private logRepo: Repository<ActivityLog>,
    private readonly config: ConfigService,
    private readonly r2: R2Service,
  ) {}

  private async logActivity(clientId: number | null, jobId: number | null, eventType: string, data: any = {}) {
    try {
      const log = this.logRepo.create({ client_id: clientId ?? undefined, job_id: jobId ?? undefined, event_type: eventType, event_data: data });
      await this.logRepo.save(log);
    } catch (_) {}
  }

  private checkProcessingLock(job: CreativeJob): boolean {
    if (!job.processing_lock) return false;
    const lockAge = Date.now() - new Date(job.processing_lock_at).getTime();
    return lockAge < 5 * 60 * 1000;
  }

  private addVideoDataIfApplicable(response: any, job: CreativeJob): any {
    if (!['ugc_video', 'reel'].includes(job.job_type)) return response;
    const variations: string[] = job.design_variations || [];
    if (variations.length > 0) {
      const idx = job.approved_design_index ?? 0;
      const videoUrl = variations[idx] ?? variations[0];
      if (videoUrl) {
        response.video_url = videoUrl;
        response.design_variations = variations;
      }
    }
    return response;
  }

  async downloadWhatsappMedia(
    mediaId: string,
    jobId: number | string,
    subdirHint: 'products' | 'logos' | 'generated' = 'products',
    directUrl?: string,
    mimeTypeHint?: string,
  ): Promise<string | null> {
    const waToken = this.config.get('WA_ACCESS_TOKEN');
    const graphVersion = this.config.get('META_GRAPH_VERSION', 'v18.0');
    const uploadsDir = this.config.get('UPLOADS_DIR', './uploads');
    const baseUrl = this.config.get('API_BASE_URL', '');

    try {
      let downloadUrl: string = directUrl ?? '';
      let mimeType: string = mimeTypeHint ?? 'image/jpeg';

      if (!downloadUrl) {
        const urlRes = await axios.get(`https://graph.facebook.com/${graphVersion}/${mediaId}`, {
          headers: { Authorization: `Bearer ${waToken}` },
        });
        downloadUrl = urlRes.data.url;
        mimeType = urlRes.data.mime_type || mimeType;
      }

      if (!downloadUrl) throw new Error('No download URL available');

      const fileRes = await axios.get(downloadUrl, {
        headers: { Authorization: `Bearer ${waToken}` },
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const data = Buffer.from(fileRes.data);

      // ── Upload to R2 if configured ─────────────────────────────────────
      if (this.r2.isConfigured()) {
        const isImage = mimeType.startsWith('image/');
        const baseName = `wa_${Date.now()}_${mediaId}`;
        if (isImage) {
          return await this.r2.uploadAsPng(subdirHint, baseName, data);
        }
        const extMap: Record<string, string> = { 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' };
        const ext = extMap[mimeType] ?? 'bin';
        const key = this.r2.buildKey(subdirHint, `${baseName}.${ext}`);
        return await this.r2.upload(key, data, mimeType);
      }

      // ── Fallback: local disk ───────────────────────────────────────────
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
        'image/webp': 'webp', 'video/mp4': 'mp4', 'image/gif': 'gif',
        'audio/ogg': 'ogg', 'audio/mpeg': 'mp3',
      };
      const ext = extMap[mimeType] ?? 'jpg';
      const filename = `wa_${Date.now()}_${mediaId}.${ext}`;
      const saveDir = path.join(uploadsDir, subdirHint);
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
      fs.writeFileSync(path.join(saveDir, filename), data);
      return `${baseUrl}/api/files/${subdirHint}/${filename}`;
    } catch (err) {
      this.logger.error(`Failed to download WhatsApp media ${mediaId}: ${err.message}`);
      return null;
    }
  }

  async handleMessage(body: any): Promise<any> {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages ?? [];

    if (!messages.length) {
      return { status: 'ignored', reason: 'no_messages' };
    }

    const message = messages[0];
    const from: string = message.from ?? '';
    const messageType: string = message.type ?? 'text';
    let text = message.text?.body?.trim() ?? '';

    // Handle image message — download immediately, replace Facebook CDN URL with our own
    let imageUrl: string | null = null;
    let imageCaption = '';
    if (messageType === 'image') {
      const mediaId: string = message.image?.id;
      const existingUrl: string | undefined = message.image?.url; // n8n pre-fills this
      const mimeType: string | undefined = message.image?.mime_type;
      imageCaption = message.image?.caption ?? '';
      if (mediaId || existingUrl) {
        imageUrl = await this.downloadWhatsappMedia(
          mediaId ?? 'unknown',
          'wa',
          'products',
          existingUrl,   // pass directly so we skip Graph API call
          mimeType,
        );
        if (imageUrl && message.image) {
          message.image.url = imageUrl;
          message.image.saved_url = imageUrl;
        }
      }
    }

    // Find or create client
    let client = await this.clientRepo.findOne({ where: { phone_number: from } });
    if (!client) {
      const name: string = value?.contacts?.[0]?.profile?.name ?? 'Unknown';
      client = await this.clientRepo.save(this.clientRepo.create({ phone_number: from, whatsapp_name: name }));
      await this.logActivity(client.id, null, 'client_created', { phone: from });
      return { status: 'onboarding_required', client_id: client.id, phone: from, step: 'upload_logo', message: 'New client needs onboarding' };
    }

    const clientId = client.id;

    // Onboarding not complete
    if (!client.onboarding_complete) {
      return { status: 'onboarding_required', client_id: clientId, phone: from, step: client.onboarding_step, message_type: messageType, image_url: imageUrl ?? undefined, message_data: message };
    }

    // Credits check
    const totalCredits = (client.trial_credits ?? 0) + (client.monthly_credits ?? 0);
    if (totalCredits <= 0 && client.subscription_status !== 'active') {
      return { status: 'no_credits', client_id: clientId, phone: from, message: 'Subscription required - no credits remaining' };
    }

    // Commands
    if (text.toLowerCase() === 'abort#') {
      const activeJob = await this.getActiveJob(clientId);
      if (activeJob) {
        await this.jobRepo.delete(activeJob.id);
        await this.logActivity(clientId, null, 'job_aborted', { job_id: activeJob.id });
      }
      const menuMessage = '❌ Your previous job has been cancelled.\n\nLet\'s start again!\n\n' + this.menuText();
      return { status: 'show_menu', client_id: clientId, phone: from, message: menuMessage };
    }

    if (text === '/new') {
      const result = await this.jobRepo.createQueryBuilder()
        .update(CreativeJob)
        .set({ completed_at: new Date(), current_stage: 'completed' })
        .where('client_id = :id AND completed_at IS NULL', { id: clientId })
        .execute();
      if (result.affected) await this.logActivity(clientId, null, 'all_jobs_completed', { jobs_closed: result.affected, command: '/new' });
      const menuMessage = '✨ Ready for a new project!\n\n' + this.menuText();
      return { status: 'show_menu', client_id: clientId, phone: from, message: menuMessage };
    }

    if (text.toLowerCase() === 'forget#') {
      await this.clientRepo.update(clientId, { onboarding_complete: false, onboarding_step: 'upload_logo' });
      await this.logActivity(clientId, null, 'onboarding_reset', {});
      return { status: 'onboarding_required', client_id: clientId, phone: from, step: 'upload_logo', message: 'Your onboarding has been reset.' };
    }

    // Menu selection
    if (JOB_TYPE_MENU[text]) {
      const jobType = JOB_TYPE_MENU[text];

      // Weekly content strategy limit
      if (jobType === 'content_strategy') {
        const today = new Date().toISOString().split('T')[0];
        let weekReset = client.content_week_reset_date ? new Date(client.content_week_reset_date).toISOString().split('T')[0] : null;
        if (!weekReset || weekReset < today) {
          const nextReset = new Date();
          nextReset.setDate(nextReset.getDate() + 7);
          weekReset = nextReset.toISOString().split('T')[0];
          await this.clientRepo.update(clientId, { content_posts_this_week: 0, content_week_reset_date: nextReset });
          client.content_posts_this_week = 0;
        }
        if ((client.content_posts_this_week ?? 0) >= 4) {
          const resetDate = new Date(weekReset);
          const daysLeft = Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / 86400000));
          return { status: 'limit_reached', message: `Content strategy limit: 4 posts per week. Resets in ${daysLeft} day(s)` };
        }
      }

      if (jobType === 'multi_mode') {
        const job = await this.jobRepo.save(this.jobRepo.create({ client_id: clientId, job_type: 'multi_mode', current_stage: 'multi_collect' }));
        await this.logActivity(clientId, job.id, 'multi_mode_started', { job_type: jobType });
        return { status: 'multi_collect', job_id: job.id, client_id: clientId, phone: from, job_type: jobType, next_step: 'multi_collect', user_message: '' };
      }

      const job = await this.jobRepo.save(this.jobRepo.create({ client_id: clientId, job_type: jobType as any, current_stage: 'pending' }));
      await this.logActivity(clientId, job.id, 'job_created', { job_type: jobType });
      return { status: 'job_created', job_id: job.id, client_id: clientId, phone: from, job_type: jobType, next_step: 'await_user_input', user_message: text };
    }

    // Active job handling
    const activeJob = await this.getActiveJob(clientId);

    if (activeJob) {
      let currentStage = activeJob.current_stage ?? 'await_user_input';
      if (currentStage === 'pending' || !currentStage) currentStage = 'await_user_input';

      // Auto-close completed jobs
      if (['completed', 'published'].includes(currentStage)) {
        await this.jobRepo.update(activeJob.id, { completed_at: new Date() });
        await this.logActivity(clientId, activeJob.id, 'job_auto_closed', { reason: 'completed', previous_stage: currentStage });
        return { status: 'show_menu', client_id: clientId, phone: from, message: text };
      }

      // Processing lock check
      if (this.checkProcessingLock(activeJob)) {
        return { status: 'job_processing', job_id: activeJob.id, client_id: clientId, phone: from, message: 'Please wait, your request is being processed...' };
      }

      // Multi mode handling
      if (activeJob.job_type === 'multi_mode') {
        const textLower = text.toLowerCase();
        const isDone = ['تم', 'done', 'finish', 'انتهيت'].includes(textLower);

        if (isDone) {
          const multiProducts: any[] = activeJob.multi_products ?? [];
          if (multiProducts.length < 2) {
            return { status: 'multi_collect', job_id: activeJob.id, client_id: clientId, phone: from, job_type: 'multi_mode', next_step: 'multi_collect', message: 'minimum_not_met', product_count: multiProducts.length, waiting_for: 'more_products' };
          }
          await this.jobRepo.update(activeJob.id, { current_stage: 'generate_multi_variants' });
          await this.logActivity(clientId, activeJob.id, 'multi_products_complete', { product_count: multiProducts.length });
          return { status: 'multi_gen', job_id: activeJob.id, client_id: clientId, phone: from, job_type: 'multi_mode', next_step: 'generate_multi_variants', product_count: multiProducts.length, multi_products: multiProducts, user_message: activeJob.user_message ?? '' };
        }

        if (messageType === 'image' && imageUrl) {
          const multiProducts: any[] = activeJob.multi_products ?? [];
          multiProducts.push({ image: imageUrl, name: '', price: '', old_price: '', notes: '', temp: true });
          await this.jobRepo.update(activeJob.id, { multi_products: multiProducts });
          await this.logActivity(clientId, activeJob.id, 'multi_product_image_added', { image_url: imageUrl, product_count: multiProducts.length });
          return { status: 'multi_collect', job_id: activeJob.id, client_id: clientId, phone: from, job_type: 'multi_mode', next_step: 'multi_collect', product_count: multiProducts.length, last_image: imageUrl, waiting_for: 'product_info', message_type: 'image' };
        }

        if (messageType === 'text' && text && !isDone) {
          const multiProducts: any[] = activeJob.multi_products ?? [];
          if (!multiProducts.length) {
            return { status: 'multi_collect', job_id: activeJob.id, client_id: clientId, phone: from, job_type: 'multi_mode', next_step: 'multi_collect', message: 'no_image_yet', waiting_for: 'product_image' };
          }
          const lastIndex = [...multiProducts].reverse().findIndex((p) => p.temp);
          if (lastIndex === -1) {
            await this.jobRepo.update(activeJob.id, { user_message: text });
            return { status: 'multi_collect', job_id: activeJob.id, client_id: clientId, phone: from, job_type: 'multi_mode', next_step: 'multi_collect', message: 'direction_saved', user_message: text, waiting_for: 'product_or_done' };
          }
          const realIndex = multiProducts.length - 1 - lastIndex;
          const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
          multiProducts[realIndex] = { ...multiProducts[realIndex], name: lines[0] ?? '', price: lines[1] ?? '', old_price: lines[2] ?? '', notes: lines[3] ?? '', temp: undefined };
          await this.jobRepo.update(activeJob.id, { multi_products: multiProducts });
          await this.logActivity(clientId, activeJob.id, 'multi_product_info_added', { product_index: realIndex, product_name: multiProducts[realIndex].name });
          return { status: 'multi_collect', job_id: activeJob.id, client_id: clientId, phone: from, job_type: 'multi_mode', next_step: 'multi_collect', product_count: multiProducts.length, last_product: multiProducts[realIndex], waiting_for: 'next_product', message_type: 'text' };
        }
      }

      // Image upload for product_sale / ugc_video / announcement
      if (messageType === 'image' && imageUrl) {
        if (['product_sale', 'ugc_video', 'announcement'].includes(activeJob.job_type)) {
          const productImages: string[] = JSON.parse(activeJob.product_images || '[]');
          productImages.push(imageUrl);
          const menuChoices = ['1', '2', '3', '4', '5'];
          const existingMsg = menuChoices.includes((activeJob.user_message ?? '').trim()) ? '' : (activeJob.user_message ?? '');
          const userTextToSave = imageCaption.trim();
          await this.jobRepo.update(activeJob.id, { product_images: JSON.stringify(productImages), user_images: productImages, user_message: userTextToSave || existingMsg || activeJob.user_message });
          const hasBoth = !!(userTextToSave || existingMsg);
          await this.logActivity(clientId, activeJob.id, 'product_image_received', { image_url: imageUrl, has_caption: !!imageCaption });
          if (hasBoth) {
            let resp: any = { status: 'job_created', job_id: activeJob.id, client_id: clientId, phone: from, job_type: activeJob.job_type, next_step: currentStage, product_image: imageUrl, product_images: productImages, user_message: userTextToSave || existingMsg, has_caption: !!imageCaption, message_type: 'image', ready_for_processing: true };
            resp = this.addVideoDataIfApplicable(resp, activeJob);
            return resp;
          }
          return { status: 'product_image_received', job_id: activeJob.id, client_id: clientId, phone: from, job_type: activeJob.job_type, next_step: currentStage, product_image: imageUrl, product_images: productImages, user_message: '', has_caption: !!imageCaption, message_type: 'image', waiting_for_text: true };
        }
      }

      // Text for product_sale / ugc_video / announcement with existing images
      if (messageType === 'text' && text) {
        if (['product_sale', 'ugc_video', 'announcement'].includes(activeJob.job_type)) {
          const productImages: string[] = JSON.parse(activeJob.product_images || '[]');
          if (productImages.length > 0) {
            await this.jobRepo.update(activeJob.id, { user_message: text });
            await this.logActivity(clientId, activeJob.id, 'user_text_received', { text, has_images: true });
            let resp: any = { status: 'job_created', job_id: activeJob.id, client_id: clientId, phone: from, job_type: activeJob.job_type, next_step: currentStage, user_message: text, product_images: productImages, message_type: 'text', ready_for_processing: true };
            resp = this.addVideoDataIfApplicable(resp, activeJob);
            return resp;
          }
        }
      }

      // General active job response
      const resp: any = {
        status: currentStage,
        job_id: activeJob.id,
        client_id: clientId,
        phone: from,
        job_type: activeJob.job_type,
        next_step: currentStage,
        user_message: text,
        message_type: messageType,
        product_images: JSON.parse(activeJob.product_images || '[]'),
      };
      if (activeJob.job_type === 'multi_mode') {
        resp.multi_products = activeJob.multi_products ?? [];
        resp.product_count = resp.multi_products.length;
      }
      if (imageUrl) resp.image_url = imageUrl;
      return this.addVideoDataIfApplicable(resp, activeJob);
    }

    return { status: 'show_menu', client_id: clientId, phone: from, message: text };
  }

  private async getActiveJob(clientId: number): Promise<CreativeJob | null> {
    return this.jobRepo.findOne({ where: { client_id: clientId, completed_at: null as any }, order: { id: 'DESC' } });
  }

  private menuText(): string {
    return 'What would you like to create?\n\n1️⃣ Announcement\n2️⃣ Product Sale\n3️⃣ Reel Video\n4️⃣ Content Strategy Post\n5️⃣ UGC Video\n6️⃣ Multi Mode (Multiple Products)\n\nReply with a number (1–6).\n\n💡 Tip: Send *abort#* to cancel, */new* for a fresh start.';
  }

  // ====== n8n job management methods ======

  async getJob(jobId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId }, relations: ['client'] });
    if (!job) return null;
    // Resolve design_variations URLs (already URLs in our system)
    return { job };
  }

  async setLock(jobId: number) {
    await this.jobRepo.update(jobId, { processing_lock: true, processing_lock_at: new Date() });
    return { status: 'lock_set', job_id: jobId };
  }

  async releaseLock(jobId: number) {
    await this.jobRepo.update(jobId, { processing_lock: false, processing_lock_at: null as any });
    return { status: 'lock_released', job_id: jobId };
  }

  async saveInput(jobId: number, userMessage: string, userImages: string[] | null) {
    await this.jobRepo.update(jobId, { user_message: userMessage, user_images: userImages ?? undefined, current_stage: 'generate_design' });
    await this.logActivity(null, jobId, 'input_saved', { has_message: !!userMessage, image_count: userImages?.length ?? 0 });
    return { status: 'input_saved', job_id: jobId, next_step: 'generate_design' };
  }

  async saveDesign(jobId: number, designVariations: string[], designPrompt: string, mediaType = 'image') {
    await this.jobRepo.update(jobId, { design_variations: designVariations, design_prompt: designPrompt, media_type: mediaType, current_stage: 'await_design_approval' });
    await this.logActivity(null, jobId, 'design_generated', { variation_count: designVariations.length, media_type: mediaType });
    return { status: 'design_saved', job_id: jobId, variation_count: designVariations.length, media_type: mediaType, next_step: 'await_design_approval' };
  }

  async approveDesign(jobId: number, approvedIndex: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    const nextStage = job.job_type === 'multi_mode' ? 'generate_multi_variants' : 'generate_ad_copy';
    await this.jobRepo.update(jobId, { design_approved: true, design_approved_at: new Date(), approved_design_index: approvedIndex, current_stage: nextStage });
    await this.logActivity(null, jobId, 'design_approved', { index: approvedIndex });
    return { status: 'design_approved', job_id: jobId, approved_index: approvedIndex, approved_design_url: (job.design_variations ?? [])[approvedIndex], design_variations: job.design_variations, next_step: nextStage };
  }

  async rejectDesign(jobId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    const newCount = (job.rejection_count ?? 0) + 1;
    await this.jobRepo.update(jobId, { rejection_count: newCount, current_stage: 'generate_design', design_approved: false });
    await this.logActivity(null, jobId, 'design_rejected', { rejection_count: newCount });
    return { status: 'generate_design', job_id: jobId, next_step: 'regenerate_or_edit_design', design_variations: job.design_variations };
  }

  async saveCopy(jobId: number, adCopy: any) {
    const adCopyStr = typeof adCopy === 'string' ? adCopy : JSON.stringify(adCopy);
    await this.jobRepo.update(jobId, { ad_copy: adCopyStr, current_stage: 'await_copy_approval' });
    await this.logActivity(null, jobId, 'copy_generated', {});
    return { status: 'copy_saved', job_id: jobId, ad_copy: adCopyStr, next_step: 'await_copy_approval' };
  }

  async approveCopy(jobId: number) {
    await this.jobRepo.update(jobId, { ad_copy_approved: true, ad_copy_approved_at: new Date(), current_stage: 'await_publish_approval' });
    await this.logActivity(null, jobId, 'copy_approved', {});
    return { status: 'copy_approved', job_id: jobId, next_step: 'await_publish_approval' };
  }

  async rejectCopy(jobId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    await this.jobRepo.update(jobId, { rejection_count: (job.rejection_count ?? 0) + 1, current_stage: 'await_copy_approval' });
    await this.logActivity(null, jobId, 'copy_rejected', {});
    return { status: 'await_copy_approval', job_id: jobId, next_step: 'regenerate_copy' };
  }

  async undoDesignApproval(jobId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    if (!['generate_ad_copy', 'await_copy_approval'].includes(job.current_stage)) throw new Error(`Cannot undo from stage: ${job.current_stage}`);
    await this.jobRepo.update(jobId, { current_stage: 'await_design_approval', design_approved: false, design_approved_at: null as any });
    return { status: 'design_approval_undone', job_id: jobId, current_stage: 'await_design_approval' };
  }

  async undoCopyApproval(jobId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    if (job.current_stage !== 'await_publish_approval') throw new Error(`Cannot undo from stage: ${job.current_stage}`);
    await this.jobRepo.update(jobId, { current_stage: 'await_copy_approval', ad_copy_approved: false, ad_copy_approved_at: null as any });
    return { status: 'copy_approval_undone', job_id: jobId, current_stage: 'await_copy_approval' };
  }

  async approvePublish(jobId: number) {
    await this.jobRepo.update(jobId, { publish_approved: true, publish_approved_at: new Date(), current_stage: 'publishing' });
    await this.logActivity(null, jobId, 'publish_approved', {});
    return { status: 'publish_approved', job_id: jobId, next_step: 'publish_to_meta' };
  }

  async saveBulkProducts(jobId: number, products: any[]) {
    await this.jobRepo.update(jobId, { bulk_products: products, is_bulk_sale: true });
    await this.logActivity(null, jobId, 'bulk_products_saved', { count: products.length });
    return { status: 'products_saved', job_id: jobId, product_count: products.length, next_step: 'generate_template_design' };
  }

  async approveTemplate(jobId: number) {
    await this.jobRepo.update(jobId, { template_approved: true });
    await this.logActivity(null, jobId, 'template_approved', {});
    return { status: 'template_approved', job_id: jobId, next_step: 'generate_all_product_images' };
  }

  async saveReel(jobId: number, reelUrl: string, durationSeconds: number | null) {
    await this.jobRepo.update(jobId, { reel_video_url: reelUrl, reel_duration_seconds: durationSeconds ?? undefined });
    await this.logActivity(null, jobId, 'reel_saved', { duration: durationSeconds });
    return { status: 'reel_saved', job_id: jobId, reel_url: reelUrl };
  }

  // Onboarding methods
  async onboardingLogoUploaded(clientId: number, logoUrl: string, logoFilename: string) {
    const waToken = this.config.get('WA_ACCESS_TOKEN');
    const uploadsDir = this.config.get('UPLOADS_DIR', './uploads');
    let savedRef: string = logoFilename || `logo_${clientId}`;

    try {
      const fileRes = await axios.get(logoUrl, { headers: { Authorization: `Bearer ${waToken}` }, responseType: 'arraybuffer' });
      const data = Buffer.from(fileRes.data);

      if (this.r2.isConfigured()) {
        // Upload to R2 — store the full R2 URL as logo_filename
        const baseName = logoFilename ? logoFilename.replace(/\.[^.]+$/, '') : `logo_${clientId}`;
        savedRef = await this.r2.uploadAsPng('logos', baseName, data);
      } else {
        // Local disk fallback
        const logoDir = path.join(uploadsDir, 'logos');
        if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
        const localFile = logoFilename || `logo_${clientId}.png`;
        fs.writeFileSync(path.join(logoDir, localFile), data);
        savedRef = localFile;
      }
    } catch (err) {
      this.logger.warn(`Logo upload failed: ${err.message}`);
    }

    await this.clientRepo.update(clientId, { logo_filename: savedRef, onboarding_step: 'describe_business' });
    await this.logActivity(clientId, null, 'logo_uploaded', { logo_ref: savedRef });
    return { status: 'logo_saved', client_id: clientId, logo_filename: savedRef, next_step: 'analyze_logo_with_gpt5', gpt5_instructions: 'Analyze this logo image and extract: 1) Primary brand color (hex), 2) Secondary color (hex)' };
  }

  async onboardingLogoAnalyzed(clientId: number, primaryColor: string, secondaryColor: string) {
    await this.clientRepo.update(clientId, { primary_color: primaryColor, secondary_color: secondaryColor });
    return { status: 'colors_saved', client_id: clientId, next_step: 'ask_for_business_description' };
  }

  async onboardingBusinessDescribed(clientId: number, description: string) {
    await this.clientRepo.update(clientId, { business_description: description });
    return { status: 'description_saved', client_id: clientId, description, next_step: 'infer_brand_profile_with_gpt5', gpt5_instructions: 'From this business description, infer: 1) business_name, 2) industry, 3) brand_tone, 4) font_preference, 5) default_language, 6) business_phone, 7) business_address' };
  }

  async onboardingProfileInferred(clientId: number, profile: any) {
    await this.clientRepo.update(clientId, {
      business_name: profile.business_name ?? undefined,
      industry: profile.industry ?? undefined,
      brand_tone: profile.brand_tone ?? 'professional',
      font_preference: profile.font_preference ?? 'modern-sans',
      default_language: profile.default_language ?? 'en',
      business_phone: profile.business_phone ?? undefined,
      business_address: profile.business_address ?? undefined,
      onboarding_complete: true,
      onboarding_step: 'complete',
    });
    await this.logActivity(clientId, null, 'onboarding_complete', profile);
    return { status: 'onboarding_complete', client_id: clientId, brand_profile: profile, message: 'Client can now create content' };
  }

  // Meta OAuth (client/WhatsApp level)
  async saveMetaTokens(clientId: number, pageToken: string, pageId: string, igAccountId: string | null, tokenExpires: number | null) {
    const expiresAt = tokenExpires ? new Date(tokenExpires * 1000) : null;
    await this.clientRepo.update(clientId, { meta_page_id: pageId, meta_page_token: pageToken, meta_page_token_expires: expiresAt ?? undefined, instagram_account_id: igAccountId ?? undefined, meta_tokens_valid: true });
    await this.logActivity(clientId, null, 'meta_connected', { page_id: pageId, has_instagram: !!igAccountId });
    return { status: 'tokens_saved', client_id: clientId, page_id: pageId, instagram_account_id: igAccountId, expires: expiresAt };
  }

  async getMetaStatus(clientId: number) {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new Error('Client not found');
    let expiresSoon = false;
    if (client.meta_page_token_expires) {
      const daysLeft = (new Date(client.meta_page_token_expires).getTime() - Date.now()) / 86400000;
      expiresSoon = daysLeft < 7;
    }
    // Return connected as 1/0 (integer) so n8n numeric comparisons work
    return { connected: client.meta_tokens_valid ? 1 : 0, page_id: client.meta_page_id, instagram_account_id: client.instagram_account_id, expires: client.meta_page_token_expires, expires_soon: expiresSoon };
  }

  async getClientInfo(clientId: number) {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new Error('Client not found');
    const baseUrl = this.config.get('API_BASE_URL', '');
    const logoUrl = client.logo_filename ? `${baseUrl}/uploads/logos/${client.logo_filename}` : null;
    const brandAssets = {
      logo_url: logoUrl,
      primary_color: client.primary_color,
      secondary_color: client.secondary_color,
      business_name: client.business_name,
      brand_tone: client.brand_tone,
      font_preference: client.font_preference,
      industry: client.industry,
      default_language: client.default_language,
    };
    return {
      id: client.id,
      phone_number: client.phone_number,
      business_name: client.business_name,
      business_description: client.business_description,
      logo_url: logoUrl,
      primary_color: client.primary_color,
      secondary_color: client.secondary_color,
      font_preference: client.font_preference,
      brand_tone: client.brand_tone,
      industry: client.industry,
      default_language: client.default_language,
      onboarding_complete: client.onboarding_complete,
      brand_assets: brandAssets,
      client: { id: client.id, phone_number: client.phone_number, business_name: client.business_name, logo_url: logoUrl, primary_color: client.primary_color, secondary_color: client.secondary_color, brand_assets: brandAssets },
    };
  }

  async addMultiProduct(jobId: number, productData: any) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');
    const products: any[] = Array.isArray(job.multi_products) ? [...job.multi_products] : [];
    products.push(productData);
    await this.jobRepo.update(jobId, { multi_products: products });
    return { status: 'ok', job_id: jobId, product_count: products.length };
  }

  async updateLastProduct(jobId: number, productData: any) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');
    const products: any[] = Array.isArray(job.multi_products) ? [...job.multi_products] : [];
    if (products.length === 0) throw new Error('No products in job');
    products[products.length - 1] = { ...products[products.length - 1], ...productData };
    await this.jobRepo.update(jobId, { multi_products: products });
    return { status: 'ok', job_id: jobId, updated_product: products[products.length - 1] };
  }

  async saveMultiVariants(jobId: number, designVariations: string[]) {
    await this.jobRepo.update(jobId, { design_variations: designVariations, current_stage: 'await_design_approval' });
    await this.logActivity(null, jobId, 'multi_variants_saved', { count: designVariations.length });
    return { status: 'ok', job_id: jobId, design_count: designVariations.length, next_step: 'await_design_approval' };
  }

  // Publish to Meta using client-level tokens
  async publishForClient(jobId: number) {
    const data = await this.jobRepo.createQueryBuilder('j')
      .leftJoinAndSelect('j.client', 'c')
      .where('j.id = :id', { id: jobId })
      .getOne();
    if (!data) throw new Error('Job not found');
    const client: Client = data.client;

    // Priority: client DB row → META_PAGE_TOKEN env var → WA_ACCESS_TOKEN (same permanent token)
    // Page/IG IDs: client DB row → dedicated env vars
    const pageToken   = client.meta_page_token
                     || this.config.get<string>('META_PAGE_TOKEN')
                     || this.config.get<string>('WA_ACCESS_TOKEN');
    const pageId      = client.meta_page_id      || this.config.get<string>('META_PAGE_ID');
    const igAccountId = client.instagram_account_id || this.config.get<string>('META_INSTAGRAM_ACCOUNT_ID');

    this.logger.log(`🌐 Publish tokens — pageId: ${pageId ?? 'MISSING'} | igAccountId: ${igAccountId ?? 'none'} | token: ${pageToken ? 'present' : 'MISSING'}`);

    if (!pageToken || !pageId) throw new Error('Meta tokens not configured — add META_PAGE_ID + META_INSTAGRAM_ACCOUNT_ID to Railway env vars');

    const designs: string[] = data.design_variations ?? [];
    const approvedIndex = data.approved_design_index ?? 0;
    const imageUrl = designs[approvedIndex];
    if (!imageUrl) throw new Error('No approved design found');
    this.logger.log(`📸 Publishing image URL: ${imageUrl}`);

    const caption = this.formatAdCopyCaption(data.ad_copy ?? '');
    const graphVersion = this.config.get('META_GRAPH_VERSION', 'v18.0');
    const graphBase = `https://graph.facebook.com/${graphVersion}`;
    const results: Record<string, any> = {};

    // Facebook
    if (pageId) {
      try {
        const res = await axios.post(`${graphBase}/${pageId}/photos`, null, { params: { url: imageUrl, caption, access_token: pageToken } });
        results.facebook = { success: true, post_id: res.data.id };
        await this.jobRepo.update(jobId, { facebook_post_id: res.data.id });
      } catch (e: any) {
        results.facebook = { success: false, error: e.response?.data?.error?.message ?? e.message };
      }
    }

    // Instagram
    if (igAccountId) {
      try {
        // Instagram requires JPEG served from a plain public URL (Cloudflare-proxied R2 URLs
        // are blocked by Meta's media fetcher). Convert to JPEG and serve from this API server.
        let igImageUrl = imageUrl;
        try {
          const imgBuf = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20_000 });
          const jpegBuf = await sharp(Buffer.from(imgBuf.data)).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
          // Use MEDIA_BASE_URL (Railway direct URL, no Cloudflare proxy) so Instagram can fetch
          const apiBase = this.config.get<string>('MEDIA_BASE_URL') || this.config.get<string>('API_BASE_URL', '');
          const uploadsDir = this.config.get<string>('UPLOADS_DIR', './uploads');
          const filename = `ig_${jobId}_${Date.now()}.jpg`;
          const dir = path.join(uploadsDir, 'generated');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, filename), jpegBuf);
          igImageUrl = `${apiBase}/api/files/generated/${filename}`;
          this.logger.log(`📸 Serving Instagram image from API: ${igImageUrl}`);
        } catch (e: any) {
          this.logger.warn(`JPEG prep failed, using original URL: ${e.message}`);
        }
        const createRes = await axios.post(`${graphBase}/${igAccountId}/media`, null, { params: { image_url: igImageUrl, caption, access_token: pageToken } });
        const containerId: string = createRes.data.id;

        // Poll for FINISHED
        let ready = false;
        for (let i = 0; i < 30 && !ready; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusRes = await axios.get(`${graphBase}/${containerId}`, { params: { fields: 'status_code', access_token: pageToken } });
          if (statusRes.data.status_code === 'FINISHED') ready = true;
          else if (statusRes.data.status_code === 'ERROR') break;
        }

        if (ready) {
          const pubRes = await axios.post(`${graphBase}/${igAccountId}/media_publish`, null, { params: { creation_id: containerId, access_token: pageToken } });
          const mediaId: string = pubRes.data.id;
          await new Promise((r) => setTimeout(r, 2000));
          const permalinkRes = await axios.get(`${graphBase}/${mediaId}`, { params: { fields: 'permalink', access_token: pageToken } });
          const permalink = permalinkRes.data.permalink ?? null;
          results.instagram = { success: true, post_id: mediaId, permalink };
          await this.jobRepo.update(jobId, { instagram_post_id: mediaId, instagram_permalink: permalink });
        } else {
          results.instagram = { success: false, error: 'Container processing timeout' };
        }
      } catch (e: any) {
        this.logger.error(`Instagram publish error: ${JSON.stringify(e.response?.data ?? e.message)}`);
        results.instagram = { success: false, error: e.response?.data?.error?.message ?? e.message };
      }
    }

    // Mark completed
    const allSuccess = Object.values(results).every((r: any) => r.success);
    if (allSuccess) {
      await this.jobRepo.update(jobId, { current_stage: 'completed', published_at: new Date() });
      // Deduct credit
      if ((client.trial_credits ?? 0) > 0) {
        await this.clientRepo.update(client.id, { trial_credits: Math.max(0, (client.trial_credits ?? 0) - 1) });
      } else {
        await this.clientRepo.update(client.id, { monthly_credits: Math.max(0, (client.monthly_credits ?? 0) - 1) });
      }
      if (data.job_type === 'content_strategy') {
        await this.clientRepo.update(client.id, { content_posts_this_week: (client.content_posts_this_week ?? 0) + 1 });
      }
    }
    await this.logActivity(client.id, jobId, 'published', results);
    return { status: allSuccess ? 'published' : 'partial_failure', job_id: jobId, results };
  }

  formatAdCopyCaption(adCopy: string): string {
    if (!adCopy) return '';
    try {
      const parsed = JSON.parse(adCopy);
      if (parsed && typeof parsed === 'object') {
        return ['headline', 'body', 'cta'].map((k) => parsed[k]).filter(Boolean).join('\n\n').trim();
      }
    } catch (_) {}
    return adCopy.trim();
  }
}
