/**
 * OrchestratorService
 *
 * Replaces the n8n "ADLY Arabic" workflow.
 * Receives a parsed WhatsApp message, advances the job through its stage
 * pipeline, and sends responses directly via WhatsApp.
 *
 * Stage pipeline:
 *   pending / await_user_input
 *     → generate_design  (async)
 *     → await_design_approval
 *     → generate_ad_copy (async)
 *     → await_copy_approval
 *     → await_publish_approval
 *     → publishing       (async)
 *     → completed
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '../../../entities/client.entity';
import { CreativeJob } from '../../../entities/creative-job.entity';
import { ActivityLog } from '../../../entities/activity-log.entity';
import { IntentService, IntentResult } from './intent.service';
import { WhatsAppSenderService } from './whatsapp-sender.service';
import { DesignService } from './design.service';
import { AdCopyService } from './ad-copy.service';
import { InstagramPreviewService } from './instagram-preview.service';
import { WhatsappService } from '../whatsapp.service';
import axios from 'axios';

// ── Menu ────────────────────────────────────────────────────────────────────

const JOB_TYPE: Record<string, string> = {
  '1': 'announcement',
  '2': 'product_sale',
  '3': 'reel',
  '4': 'content_strategy',
  '5': 'ugc_video',
  '6': 'multi_mode',
};

const JOB_LABEL: Record<string, string> = {
  announcement: 'إعلان',
  product_sale: 'عرض بيع منتج',
  reel: 'فيديو ريل',
  content_strategy: 'منشور استراتيجية محتوى',
  ugc_video: 'فيديو UGC',
  multi_mode: 'منتجات متعددة',
};

// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(ActivityLog) private logRepo: Repository<ActivityLog>,
    private readonly intentSvc: IntentService,
    private readonly sender: WhatsAppSenderService,
    private readonly designSvc: DesignService,
    private readonly adCopySvc: AdCopyService,
    private readonly previewSvc: InstagramPreviewService,
    private readonly whatsappSvc: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  // ── Entry point ────────────────────────────────────────────────────────────

  async handle(body: any): Promise<void> {
    try {
      const entry = body.entry?.[0];
      const value = entry?.changes?.[0]?.value;

      // Ignore status-only webhooks (delivered/read receipts)
      if (!value?.messages?.length) return;

      const msg = value.messages[0];
      const from: string = msg.from ?? '';
      const msgType: string = msg.type ?? 'text';
      const text: string = msg.text?.body?.trim() ?? '';
      const name: string = value?.contacts?.[0]?.profile?.name ?? '(no name)';

      // Ignore group messages (from contains @g.us)
      if (from.includes('@')) return;

      // ── Incoming message log ─────────────────────────────────────────────
      const preview =
        msgType === 'text' ? `"${text}"` :
        msgType === 'image' ? `[image${msg.image?.caption ? ` | caption: "${msg.image.caption}"` : ''}]` :
        `[${msgType}]`;

      this.logger.log(`📨 INCOMING | +${from} | ${name} | ${preview}`);

      await this.process(from, text, msgType, msg, value);
    } catch (err) {
      this.logger.error(`Unhandled error: ${err.message}`, err.stack);
    }
  }

  // ── Core processing ────────────────────────────────────────────────────────

  private async process(
    from: string,
    text: string,
    msgType: string,
    msg: any,
    value: any,
  ): Promise<void> {
    // ── Find or create client ──────────────────────────────────────────────
    let client = await this.clientRepo.findOne({ where: { phone_number: from } });
    if (!client) {
      const name = value?.contacts?.[0]?.profile?.name ?? 'Unknown';
      client = await this.clientRepo.save(
        this.clientRepo.create({ phone_number: from, whatsapp_name: name }),
      );
      this.logger.log(`🆕 NEW CLIENT | +${from} | ${name}`);
      await this.log(client.id, null, 'client_created', { phone: from });
      await this.startOnboarding(client);
      return;
    }

    await this.clientRepo.update(client.id, { last_activity_at: new Date() });

    // ── Onboarding ────────────────────────────────────────────────────────
    if (!client.onboarding_complete) {
      this.logger.log(`🔧 ONBOARDING | +${from} | step: ${client.onboarding_step}`);
      await this.handleOnboarding(client, text, msgType, msg);
      return;
    }

    // ── Credits check ─────────────────────────────────────────────────────
    const credits = (client.trial_credits ?? 0) + (client.monthly_credits ?? 0);
    if (credits <= 0 && client.subscription_status !== 'active') {
      this.logger.warn(`💳 NO CREDITS | +${from} | client #${client.id}`);
      await this.sender.sendText(from,
        '⚠️ نفدت رصيدك من التصاميم!\n\nيرجى الترقية للمتابعة.\nتواصل معنا لمعرفة خططنا.');
      return;
    }

    // ── Classify intent ───────────────────────────────────────────────────
    const activeJob = await this.getActiveJob(client.id);
    const stage = activeJob?.current_stage ?? 'show_menu';
    const intent = await this.intentSvc.classify(text, msgType, stage);

    this.logger.log(
      `🧠 INTENT | +${from} | stage: ${stage} | intent: ${intent.intent}` +
      (intent.menuChoice ? ` (choice: ${intent.menuChoice})` : '') +
      ` | confidence: ${intent.confidence}`,
    );

    // ── Global commands ───────────────────────────────────────────────────
    if (intent.intent === 'COMMAND_ABORT') {
      if (activeJob) {
        await this.jobRepo.update(activeJob.id, { current_stage: 'completed', completed_at: new Date() });
        await this.log(client.id, activeJob.id, 'job_aborted', {});
      }
      await this.sender.sendText(from, '❌ تم إلغاء المهمة.\n\n' + this.menuText());
      return;
    }

    if (intent.intent === 'COMMAND_NEW') {
      if (activeJob) {
        await this.jobRepo.update(activeJob.id, { current_stage: 'completed', completed_at: new Date() });
      }
      await this.sender.sendText(from, '✨ لنبدأ مشروعاً جديداً!\n\n' + this.menuText());
      return;
    }

    if (intent.intent === 'COMMAND_FORGET') {
      await this.clientRepo.update(client.id, {
        onboarding_complete: false,
        onboarding_step: 'upload_logo',
        business_name: null as any,
        business_description: null as any,
        logo_filename: null as any,
        primary_color: null as any,
        secondary_color: null as any,
        brand_tone: null as any,
        industry: null as any,
      });
      const refreshed = await this.clientRepo.findOne({ where: { id: client.id } });
      await this.startOnboarding(refreshed!);
      return;
    }

    if (intent.intent === 'UNSUPPORTED_MEDIA') {
      await this.sender.sendText(from, '📝 يرجى إرسال رسالة نصية أو صورة فقط.');
      return;
    }

    // ── Download image if present ─────────────────────────────────────────
    let imageUrl: string | null = null;
    if (msgType === 'image') {
      const mediaId: string = msg.image?.id ?? '';
      if (mediaId) {
        imageUrl = await this.whatsappSvc.downloadWhatsappMedia(
          mediaId,
          activeJob?.id ?? client.id,
          'products',
        );
      }
    }

    // ── No active job ─────────────────────────────────────────────────────
    if (!activeJob) {
      if (intent.intent === 'MENU_CHOICE' && intent.menuChoice) {
        await this.createJob(client, intent.menuChoice, text, imageUrl);
      } else {
        await this.sender.sendText(from, this.menuText());
      }
      return;
    }

    // ── Route to stage handler ────────────────────────────────────────────
    await this.handleStage(client, activeJob, text, msgType, imageUrl, intent, msg);
  }

  // ── Stage router ───────────────────────────────────────────────────────────

  private async handleStage(
    client: Client,
    job: CreativeJob,
    text: string,
    msgType: string,
    imageUrl: string | null,
    intent: IntentResult,
    msg: any,
  ): Promise<void> {
    const from = client.phone_number;

    // Processing lock: prevent concurrent execution
    if (this.isLocked(job)) {
      await this.sender.sendText(from, '⏳ جارٍ المعالجة، يرجى الانتظار...');
      return;
    }

    switch (job.current_stage) {
      // ── Collecting user input ──────────────────────────────────────────
      case 'pending':
      case 'await_user_input': {
        if (msgType === 'image' && imageUrl) {
          const productImages = this.parseProductImages(job);
          productImages.push(imageUrl);
          await this.jobRepo.update(job.id, { product_images: JSON.stringify(productImages) });

          const caption = (msg?.image?.caption ?? '').trim();
          if (caption || !['product_sale', 'from_image'].includes(job.job_type)) {
            // Enough to start — caption or non-product job
            await this.sender.sendText(from, '📸 تم استلام الصورة! جارٍ إنشاء التصميم...\n\n⏱️ قد يستغرق هذا دقيقة أو اثنتين.');
            this.runDesignGeneration(client, { ...job, product_images: JSON.stringify(productImages) }, caption || text);
          } else {
            await this.sender.sendText(from,
              '📸 تم استلام صورة المنتج!\n\nالآن أرسل:\n• اسم المنتج والسعر\n• أي وصف إضافي للإعلان');
          }
        } else if (text) {
          await this.sender.sendText(from, '⚡ جارٍ إنشاء تصميمك...\n\n⏱️ قد يستغرق هذا دقيقتين.');
          this.runDesignGeneration(client, job, text);
        } else {
          const label = JOB_LABEL[job.job_type] ?? job.job_type;
          await this.sender.sendText(from,
            `🎨 أخبرني بفكرتك لـ *${label}*` +
            (['product_sale', 'from_image'].includes(job.job_type) ? '\n\nيمكنك أيضاً إرسال صورة المنتج 📸' : ''));
        }
        break;
      }

      // ── Waiting for design to finish generating ───────────────────────
      case 'generate_design': {
        await this.sender.sendText(from, '⏳ التصميم قيد الإنشاء... يرجى الانتظار.');
        break;
      }

      // ── Design approval ───────────────────────────────────────────────
      case 'await_design_approval': {
        if (intent.intent === 'APPROVE') {
          await this.jobRepo.update(job.id, {
            design_approved: true,
            design_approved_at: new Date(),
            current_stage: 'generate_ad_copy',
          });
          await this.sender.sendText(from, '✅ تمت الموافقة على التصميم!\n\n📝 جارٍ إنشاء النص الإعلاني...');
          this.runAdCopyGeneration(client, job);
        } else if (intent.intent === 'REJECT') {
          await this.jobRepo.update(job.id, {
            rejection_count: (job.rejection_count ?? 0) + 1,
            current_stage: 'generate_design',
          });
          await this.sender.sendText(from, '🔄 حسناً! جارٍ إنشاء تصميم جديد...');
          this.runDesignGeneration(client, job, job.user_message ?? text);
        } else if (intent.intent === 'CONTENT') {
          // User described changes they want
          await this.jobRepo.update(job.id, {
            rejection_count: (job.rejection_count ?? 0) + 1,
            user_message: text,
            current_stage: 'generate_design',
          });
          await this.sender.sendText(from, '🔄 سأعيد الإنشاء بناءً على ملاحظاتك...');
          this.runDesignGeneration(client, job, text);
        } else {
          await this.sender.sendText(from,
            '💬 هل توافق على هذا التصميم؟\n\n• أرسل *نعم* للموافقة\n• أرسل *لا* أو صف التغييرات التي تريدها');
        }
        break;
      }

      // ── Ad copy generating ────────────────────────────────────────────
      case 'generate_ad_copy': {
        await this.sender.sendText(from, '⏳ جارٍ إنشاء النص الإعلاني...');
        break;
      }

      // ── Copy approval ─────────────────────────────────────────────────
      case 'await_copy_approval': {
        if (intent.intent === 'APPROVE') {
          await this.jobRepo.update(job.id, {
            ad_copy_approved: true,
            ad_copy_approved_at: new Date(),
            current_stage: 'await_publish_approval',
          });
          await this.sender.sendText(from,
            '✅ تمت الموافقة على النص!\n\n📱 هل تريد النشر على فيسبوك وإنستغرام الآن؟\n\nأرسل *نعم* للنشر أو *لا* للحفظ فقط.');
        } else if (intent.intent === 'REJECT' || intent.intent === 'CONTENT') {
          const newBrief = intent.intent === 'CONTENT' ? text : job.user_message;
          await this.jobRepo.update(job.id, { current_stage: 'generate_ad_copy' });
          await this.sender.sendText(from, '🔄 جارٍ إنشاء نص جديد...');
          this.runAdCopyGeneration(client, { ...job, user_message: newBrief ?? '' });
        } else {
          await this.sender.sendText(from,
            '💬 هل توافق على هذا النص الإعلاني؟\n\n• أرسل *نعم* للمتابعة إلى النشر\n• أرسل *لا* أو صف التعديلات التي تريدها');
        }
        break;
      }

      // ── Publish confirmation ───────────────────────────────────────────
      case 'await_publish_approval': {
        if (intent.intent === 'APPROVE') {
          await this.jobRepo.update(job.id, {
            publish_approved: true,
            publish_approved_at: new Date(),
            current_stage: 'publishing',
          });
          await this.sender.sendText(from, '🚀 جارٍ النشر على فيسبوك وإنستغرام...');
          this.runPublish(client, job, from);
        } else if (intent.intent === 'REJECT') {
          await this.jobRepo.update(job.id, { current_stage: 'completed', completed_at: new Date() });
          await this.sender.sendText(from,
            '✅ تم حفظ المحتوى دون نشر.\n\n' + this.menuText());
        } else {
          await this.sender.sendText(from,
            '📱 جاهز للنشر!\n\nأرسل *نعم* للنشر على فيسبوك وإنستغرام الآن\nأو *لا* للحفظ فقط.');
        }
        break;
      }

      // ── Currently publishing ───────────────────────────────────────────
      case 'publishing': {
        await this.sender.sendText(from, '⏳ جارٍ النشر... يرجى الانتظار.');
        break;
      }

      // ── Completed — treat as new ───────────────────────────────────────
      case 'completed':
      default: {
        if (intent.intent === 'MENU_CHOICE' && intent.menuChoice) {
          await this.createJob(client, intent.menuChoice, text, null);
        } else {
          await this.sender.sendText(from, this.menuText());
        }
        break;
      }
    }
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────

  private async startOnboarding(client: Client): Promise<void> {
    await this.sender.sendText(
      client.phone_number,
      '👋 مرحباً بك في Launcho!\n\nسنبدأ بإعداد ملف علامتك التجارية.\n\nأولاً، أرسل صورة *شعار* علامتك التجارية 📸',
    );
  }

  private async handleOnboarding(
    client: Client,
    text: string,
    msgType: string,
    msg: any,
  ): Promise<void> {
    const from = client.phone_number;
    const step = client.onboarding_step ?? 'upload_logo';

    switch (step) {
      case 'upload_logo': {
        if (msgType !== 'image') {
          await this.sender.sendText(from, '📸 يرجى إرسال صورة الشعار أولاً.');
          return;
        }
        const mediaId: string = msg.image?.id ?? '';
        if (!mediaId) { await this.sender.sendText(from, '⚠️ لم أتمكن من استلام الصورة، حاول مجدداً.'); return; }

        const logoUrl = await this.whatsappSvc.downloadWhatsappMedia(mediaId, client.id, 'logos');
        if (!logoUrl) { await this.sender.sendText(from, '⚠️ حدث خطأ في تحميل الشعار، حاول مجدداً.'); return; }

        const filename = logoUrl.split('/').pop() ?? `${client.id}_logo.jpg`;
        await this.whatsappSvc.onboardingLogoUploaded(client.id, logoUrl, filename);

        // Analyze logo colors in background
        this.analyzeLogoColors(client.id, logoUrl);

        await this.sender.sendText(from,
          '✅ تم استلام الشعار!\n\n📝 الآن أخبرني عن عملك:\n\n1. اسم العلامة التجارية\n2. مجال العمل\n3. أسلوب الصوت (احترافي / مرح / فاخر)\n\nمثال:\n*Aman Clinic*\n*رعاية صحية*\n*احترافي*');

        await this.clientRepo.update(client.id, { onboarding_step: 'describe_business' });
        break;
      }

      case 'describe_business': {
        if (msgType !== 'text' || !text) {
          await this.sender.sendText(from, '📝 يرجى إرسال وصف عملك كنص.');
          return;
        }

        await this.whatsappSvc.onboardingBusinessDescribed(client.id, text);

        // Use Gemini to infer structured profile
        const profile = await this.inferBrandProfile(text, client.id);
        await this.whatsappSvc.onboardingProfileInferred(client.id, profile);

        await this.sender.sendText(from,
          `🎉 اكتمل الإعداد!\n\nملف علامتك التجارية جاهز ✅\n\n` +
          `*${profile.business_name ?? 'علامتك التجارية'}* | ${profile.industry ?? ''}\n\n` +
          this.menuText());
        break;
      }

      default: {
        await this.startOnboarding(client);
        break;
      }
    }
  }

  // ── Background operations (fire and forget) ────────────────────────────────

  private runDesignGeneration(client: Client, job: CreativeJob, userText: string): void {
    this.doDesignGeneration(client, job, userText).catch((err) =>
      this.logger.error(`Design gen crash for job ${job.id}: ${err.message}`, err.stack),
    );
  }

  private async doDesignGeneration(client: Client, job: CreativeJob, userText: string): Promise<void> {
    const from = client.phone_number;

    // Lock
    await this.jobRepo.update(job.id, {
      current_stage: 'generate_design',
      processing_lock: true,
      processing_lock_at: new Date(),
      user_message: userText || job.user_message,
    });
    this.logger.log(`🎨 DESIGN START | job #${job.id} | +${from} | brief: "${userText?.slice(0, 80)}"`);
    await this.log(client.id, job.id, 'design_generation_started', {});

    try {
      const result = await this.designSvc.generate(client, job, userText);

      if (!result.success || (!result.imageBuffer && !result.imageUrl)) {
        this.logger.error(`🎨 DESIGN FAILED | job #${job.id} | ${result.error}`);
        await this.jobRepo.update(job.id, {
          processing_lock: false,
          current_stage: 'await_user_input',
          error_message: result.error,
        });
        await this.sender.sendText(from,
          '⚠️ حدث خطأ في إنشاء التصميم. يرجى المحاولة مرة أخرى أو تعديل الوصف.');
        return;
      }

      // Upload buffer to WhatsApp if we have one, otherwise send by URL
      const variationUrl = result.imageUrl ?? '';
      let mediaId: string | null = null;
      if (result.imageBuffer) {
        mediaId = await this.sender.uploadMedia(result.imageBuffer, 'image/jpeg', `design_${job.id}.jpg`);
      }

      // Save design
      await this.whatsappSvc.saveDesign(job.id, [variationUrl], userText, 'image');

      // Release lock
      await this.jobRepo.update(job.id, { processing_lock: false });

      // Send the design image
      if (mediaId) {
        await this.sender.sendImageByMediaId(from, mediaId,
          '🎨 هذا هو تصميمك!\n\nأرسل *نعم* للموافقة والمتابعة\nأو صف التغييرات التي تريدها');
      } else if (variationUrl) {
        await this.sender.sendImageByUrl(from, variationUrl,
          '🎨 هذا هو تصميمك!\n\nأرسل *نعم* للموافقة والمتابعة\nأو صف التغييرات التي تريدها');
      }

      this.logger.log(`✅ DESIGN DONE | job #${job.id} | url: ${variationUrl || '(buffer only)'}`);
      await this.log(client.id, job.id, 'design_generated', { url: variationUrl });
    } catch (err) {
      await this.jobRepo.update(job.id, {
        processing_lock: false,
        current_stage: 'await_user_input',
        error_message: err.message,
      });
      await this.sender.sendText(from, '⚠️ حدث خطأ غير متوقع. يرجى المحاولة مجدداً.');
      this.logger.error(`doDesignGeneration failed for job ${job.id}: ${err.message}`, err.stack);
    }
  }

  private runAdCopyGeneration(client: Client, job: CreativeJob): void {
    this.doAdCopyGeneration(client, job).catch((err) =>
      this.logger.error(`Ad copy crash for job ${job.id}: ${err.message}`, err.stack),
    );
  }

  private async doAdCopyGeneration(client: Client, job: Partial<CreativeJob> & { id: number }): Promise<void> {
    const from = client.phone_number;
    const fullJob = await this.jobRepo.findOne({ where: { id: job.id } });
    if (!fullJob) return;

    await this.jobRepo.update(fullJob.id, {
      processing_lock: true,
      processing_lock_at: new Date(),
      current_stage: 'generate_ad_copy',
    });

    try {
      const designUrl = fullJob.design_variations?.[fullJob.approved_design_index ?? 0];
      const copy = designUrl
        ? await this.adCopySvc.generateWithImageContext(client, fullJob, designUrl)
        : await this.adCopySvc.generate(client, fullJob);

      await this.whatsappSvc.saveCopy(fullJob.id, copy);
      await this.jobRepo.update(fullJob.id, {
        processing_lock: false,
        current_stage: 'await_copy_approval',
      });

      // ── Send Instagram-style preview image ──────────────────────────────
      if (designUrl) {
        try {
          const handle = (client.business_name ?? client.phone_number).replace(/\s+/g, '').toLowerCase();
          const logoUrl = client.logo_filename?.startsWith('http') ? client.logo_filename : null;
          const previewBuf = await this.previewSvc.create(designUrl, handle, copy.full_text, logoUrl);
          if (previewBuf) {
            const mediaId = await this.sender.uploadMedia(previewBuf, 'image/png', 'preview.png');
            if (mediaId) {
              await this.sender.sendImageByMediaId(from, mediaId);
            }
          }
        } catch (err) {
          this.logger.warn(`Preview image skipped: ${err.message}`);
        }
      }

      // ── Send copy text for approval ─────────────────────────────────────
      await this.sender.sendText(from,
        `📝 هذا هو النص الإعلاني:\n\n` +
        `*${copy.headline}*\n\n${copy.body}\n\n${copy.cta}\n\n` +
        `أرسل *نعم* للموافقة أو صف التغييرات التي تريدها`);

      await this.log(client.id, fullJob.id, 'ad_copy_generated', {});
    } catch (err) {
      await this.jobRepo.update(fullJob.id, {
        processing_lock: false,
        current_stage: 'await_copy_approval',
        error_message: err.message,
      });
      await this.sender.sendText(from, '⚠️ حدث خطأ في إنشاء النص. يرجى المحاولة مجدداً.');
      this.logger.error(`doAdCopyGeneration failed: ${err.message}`, err.stack);
    }
  }

  private runPublish(client: Client, job: CreativeJob, phone: string): void {
    this.doPublish(client, job, phone).catch((err) =>
      this.logger.error(`Publish crash for job ${job.id}: ${err.message}`, err.stack),
    );
  }

  private async doPublish(client: Client, job: CreativeJob, phone: string): Promise<void> {
    // ── Step 1: Auth check (mirrors n8n "Check Meta Auth Status" node) ────────
    // Consider connected if client has DB tokens OR env vars supply them.
    const metaStatus = await this.whatsappSvc.getMetaStatus(client.id);
    const hasEnvCreds = !!(
      (this.config.get('META_PAGE_TOKEN') || this.config.get('WA_ACCESS_TOKEN')) &&
      (client.meta_page_id || this.config.get('META_PAGE_ID'))
    );
    const isConnected = (metaStatus.connected === 1 || hasEnvCreds) && !metaStatus.expires_soon;

    if (!isConnected) {
      // Not authorized → send OAuth link, put job back so user can retry after connecting
      await this.sendMetaAuthLink(client.id, phone);
      await this.jobRepo.update(job.id, { current_stage: 'await_publish_approval' });
      return;
    }

    // ── Step 2: Publish ───────────────────────────────────────────────────────
    try {
      const result = await this.whatsappSvc.publishForClient(job.id);
      await this.jobRepo.update(job.id, { current_stage: 'completed', completed_at: new Date() });

      const fb  = result?.results?.facebook  ?? {};
      const ig  = result?.results?.instagram ?? {};

      if (result?.status === 'published') {
        let msg = '🎉 *تم النشر بنجاح!*\n\n';
        if (fb.success && fb.post_id) msg += `✅ فيسبوك: https://facebook.com/${fb.post_id}\n`;
        if (ig.success && ig.permalink)  msg += `✅ إنستغرام: ${ig.permalink}\n`;
        msg += '\nإعلانك الآن يصل إلى عملائك! 🚀\n\n' + this.menuText();
        await this.sender.sendText(phone, msg);

      } else if (result?.status === 'partial_failure') {
        let msg = '⚠️ *نجاح جزئي*\n\n';
        if (fb.success && fb.post_id)   msg += `✅ فيسبوك: https://facebook.com/${fb.post_id}\n`;
        else if (fb.error)              msg += `❌ فيسبوك: ${fb.error}\n`;
        if (ig.success && ig.permalink) msg += `✅ إنستغرام: ${ig.permalink}\n`;
        else if (ig.error)              msg += `❌ إنستغرام: ${ig.error}\n`;
        msg += '\n' + this.menuText();
        await this.sender.sendText(phone, msg);

      } else {
        await this.sender.sendText(phone,
          '❌ فشل النشر. يرجى التحقق من صلاحيات فيسبوك أو التواصل مع الدعم.\n\n' + this.menuText());
      }

      await this.log(client.id, job.id, 'published', { result });
    } catch (err) {
      // Publish API error → mirrors n8n "onError: continueErrorOutput" which
      // routes back to send the OAuth link (token may have expired/been revoked).
      this.logger.error(`doPublish failed: ${err.message}`, err.stack);
      await this.jobRepo.update(job.id, { current_stage: 'await_publish_approval' });
      await this.sendMetaAuthLink(client.id, phone);
    }
  }

  private async sendMetaAuthLink(clientId: number, phone: string): Promise<void> {
    const apiBase  = this.config.get('API_BASE_URL', '');
    const secret   = this.config.get('META_APP_SECRET', 'fallback-secret');
    const { signOAuthToken } = await import('../n8n-meta-oauth.controller');
    const token    = signOAuthToken(clientId, secret);
    const oauthUrl = `${apiBase}/api/meta-oauth-complete?action=start&token=${token}`;
    await this.sender.sendText(phone,
      `🔐 *مطلوب ربط الحساب*\n\nللنشر على فيسبوك وإنستغرام، يرجى ربط حسابك:\n\n👉 ${oauthUrl}\n\nبعد الربط، أرسل *نعم* مجدداً للنشر. ✅`,
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async createJob(
    client: Client,
    menuChoice: string,
    text: string,
    imageUrl: string | null,
  ): Promise<void> {
    const from = client.phone_number;
    const jobType = JOB_TYPE[menuChoice];
    if (!jobType) {
      await this.sender.sendText(from, '❌ اختيار غير صحيح. ' + this.menuText());
      return;
    }

    const job = await this.jobRepo.save(
      this.jobRepo.create({
        client_id: client.id,
        job_type: jobType as any,
        current_stage: 'await_user_input',
        product_images: imageUrl ? JSON.stringify([imageUrl]) : null as any,
      }),
    );

    await this.log(client.id, job.id, 'job_created', { job_type: jobType });

    const label = JOB_LABEL[jobType] ?? jobType;
    await this.sender.sendText(from,
      `✅ اخترت: *${label}*\n\n🎨 أخبرني بفكرتك أو الوصف الذي تريده` +
      (['product_sale', 'from_image'].includes(jobType) ? '\n\nيمكنك أيضاً إرسال صورة المنتج 📸' : ''));
  }

  private async inferBrandProfile(description: string, clientId: number): Promise<any> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    const fallback = {
      business_name: 'Unknown',
      industry: 'general',
      brand_tone: 'professional',
      default_language: 'ar',
      font_preference: 'sans-serif',
      business_phone: null,
      business_address: null,
    };

    if (!apiKey) return fallback;

    try {
      const prompt = `Extract business information from this description and return ONLY valid JSON:

"${description}"

Required JSON format:
{
  "business_name": "extracted name or Unknown",
  "industry": "industry category",
  "brand_tone": "professional|playful|luxury|minimal|vibrant",
  "default_language": "ar|he|en",
  "font_preference": "sans-serif|serif|display",
  "business_phone": "phone number or null",
  "business_address": "address or null"
}`;

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 300 },
        },
        { timeout: 15_000 },
      );

      const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      return { ...fallback, ...JSON.parse(cleaned) };
    } catch (err) {
      this.logger.warn(`Brand profile inference failed: ${err.message}`);
      return fallback;
    }
  }

  private async analyzeLogoColors(clientId: number, logoUrl: string): Promise<void> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return;

    try {
      const imgRes = await axios.get(logoUrl, { responseType: 'arraybuffer', timeout: 20_000 });
      const base64 = Buffer.from(imgRes.data).toString('base64');
      const mimeType = imgRes.headers['content-type'] ?? 'image/jpeg';

      const prompt = `Analyze this logo and extract brand colors. Return ONLY valid JSON:
{"primary_color":"#HEXCODE","secondary_color":"#HEXCODE"}
Focus on meaningful brand colors, ignore white/black backgrounds.`;

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 80 },
        },
        { timeout: 20_000 },
      );

      const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const colors = JSON.parse(cleaned);

      await this.whatsappSvc.onboardingLogoAnalyzed(
        clientId,
        colors.primary_color ?? '#000000',
        colors.secondary_color ?? '#ffffff',
      );
    } catch (err) {
      this.logger.warn(`Logo color analysis failed: ${err.message}`);
    }
  }

  private isLocked(job: CreativeJob): boolean {
    if (!job.processing_lock) return false;
    const age = Date.now() - new Date(job.processing_lock_at).getTime();
    return age < 8 * 60 * 1000; // 8 minutes (covers longest generation)
  }

  private parseProductImages(job: CreativeJob): string[] {
    try { return JSON.parse(job.product_images ?? '[]'); } catch { return []; }
  }

  private menuText(): string {
    return (
      'ماذا تودّ أن تنشئ؟\n\n' +
      '1️⃣ إعلان\n' +
      '2️⃣ عرض بيع منتج\n' +
      '3️⃣ فيديو ريل\n' +
      '4️⃣ منشور استراتيجية محتوى\n' +
      '5️⃣ فيديو UGC\n' +
      '6️⃣ منتجات متعددة\n\n' +
      '_abort# للإلغاء | forget# لإعادة الإعداد_'
    );
  }

  private async getActiveJob(clientId: number): Promise<CreativeJob | null> {
    return this.jobRepo.findOne({
      where: [
        { client_id: clientId, current_stage: 'await_user_input' },
        { client_id: clientId, current_stage: 'pending' },
        { client_id: clientId, current_stage: 'generate_design' },
        { client_id: clientId, current_stage: 'await_design_approval' },
        { client_id: clientId, current_stage: 'generate_ad_copy' },
        { client_id: clientId, current_stage: 'await_copy_approval' },
        { client_id: clientId, current_stage: 'await_publish_approval' },
        { client_id: clientId, current_stage: 'publishing' },
        { client_id: clientId, current_stage: 'multi_collect' },
        { client_id: clientId, current_stage: 'generate_multi_variants' },
      ],
      order: { created_at: 'DESC' },
    });
  }

  private async log(clientId: number, jobId: number | null, event: string, data: any = {}): Promise<void> {
    try {
      const entry = this.logRepo.create({
        client_id: clientId,
        job_id: jobId ?? undefined,
        event_type: event,
        event_data: data,
      });
      await this.logRepo.save(entry);
    } catch (_) {}
  }
}
