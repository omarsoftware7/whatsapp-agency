import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Client } from '../../../entities/client.entity';
import { CreativeJob } from '../../../entities/creative-job.entity';

export interface AdCopyResult {
  headline: string;
  body: string;
  cta: string;
  full_text: string;
}

@Injectable()
export class AdCopyService {
  private readonly logger = new Logger(AdCopyService.name);

  constructor(private readonly config: ConfigService) {}

  async generate(client: Client, job: CreativeJob): Promise<AdCopyResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return this.fallback();

    const lang = client.default_language ?? 'ar';
    const langInstruction =
      lang === 'ar' ? 'Write in Arabic (modern, engaging, suitable for social media)'
      : lang === 'he' ? 'Write in Hebrew'
      : 'Write in English';

    const jobTypeLabel: Record<string, string> = {
      announcement: 'announcement',
      product_sale: 'product sale',
      reel: 'reel/video',
      content_strategy: 'content strategy',
      ugc_video: 'UGC video',
      multi_mode: 'multi-product campaign',
    };

    const prompt = `You are a professional social media copywriter.

${langInstruction}

Business: ${client.business_name ?? 'Unknown'}
Industry: ${client.industry ?? 'General'}
Brand tone: ${client.brand_tone ?? 'professional'}
Post type: ${jobTypeLabel[job.job_type] ?? job.job_type}
Creative brief: ${job.user_message ?? 'General post'}
${client.business_phone ? `Phone: ${client.business_phone}` : ''}
${client.business_address ? `Location: ${client.business_address}` : ''}

Write engaging ad copy:
1. Headline — 1 line, max 60 chars, catchy and direct
2. Body — 2-3 sentences, max 150 chars, persuasive with proof or benefit
3. CTA — 1 line, max 40 chars, action-oriented

Use emojis naturally. Match the brand tone strictly.

Respond with ONLY valid JSON (no markdown):
{"headline":"...","body":"...","cta":"..."}`;

    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 512 },
        },
        { timeout: 20_000 },
      );

      const raw: string = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const headline = parsed.headline ?? '';
      const body = parsed.body ?? '';
      const cta = parsed.cta ?? '';

      return {
        headline,
        body,
        cta,
        full_text: [headline, body, cta].filter(Boolean).join('\n\n'),
      };
    } catch (err) {
      this.logger.error(`Ad copy generation failed: ${err.message}`);
      return this.fallback();
    }
  }

  /** Analyze the approved design image and get a context-aware copy suggestion. */
  async generateWithImageContext(
    client: Client,
    job: CreativeJob,
    imageUrl: string,
  ): Promise<AdCopyResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return this.generate(client, job);

    const lang = client.default_language ?? 'ar';
    const langInstruction =
      lang === 'ar' ? 'Write in Arabic'
      : lang === 'he' ? 'Write in Hebrew'
      : 'Write in English';

    try {
      // Download the image
      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20_000 });
      const base64 = Buffer.from(imgRes.data).toString('base64');
      const mimeType = imgRes.headers['content-type'] ?? 'image/jpeg';

      const prompt = `You are a professional social media copywriter. Look at this ad design image.

${langInstruction}

Business: ${client.business_name ?? 'Unknown'} | Tone: ${client.brand_tone ?? 'professional'}
Creative brief: ${job.user_message ?? ''}

Write ad copy that matches this exact visual:
1. Headline — max 60 chars
2. Body — max 150 chars, persuasive
3. CTA — max 40 chars

Respond with ONLY valid JSON:
{"headline":"...","body":"...","cta":"..."}`;

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
        },
        { timeout: 25_000 },
      );

      const raw: string = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const headline = parsed.headline ?? '';
      const body = parsed.body ?? '';
      const cta = parsed.cta ?? '';

      return { headline, body, cta, full_text: [headline, body, cta].filter(Boolean).join('\n\n') };
    } catch (err) {
      this.logger.warn(`Image-context copy failed, falling back: ${err.message}`);
      return this.generate(client, job);
    }
  }

  private fallback(): AdCopyResult {
    return {
      headline: '✨ عرض مميز!',
      body: 'تواصل معنا للحصول على أفضل العروض.',
      cta: '📞 اتصل بنا الآن',
      full_text: '✨ عرض مميز!\n\nتواصل معنا للحصول على أفضل العروض.\n\n📞 اتصل بنا الآن',
    };
  }
}
