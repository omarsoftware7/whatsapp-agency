import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from '../../../entities/client.entity';
import { CreativeJob } from '../../../entities/creative-job.entity';

export interface DesignResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
}

const MODEL = 'gemini-3-pro-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(private readonly config: ConfigService) {}

  async generate(client: Client, job: CreativeJob, userText: string): Promise<DesignResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not configured' };

    try {
      const prompt = this.buildPrompt(client, job, userText);
      const parts: any[] = [{ text: prompt }];

      // Attach product image (first one) if present
      const productImages: string[] = this.parseProductImages(job);
      if (productImages.length > 0) {
        const productB64 = await this.toBase64(productImages[0], apiKey);
        if (productB64) {
          parts.push({ inlineData: { mimeType: 'image/png', data: productB64 } });
        }
      }

      // Attach logo if present
      const logoUrl = this.buildLogoUrl(client);
      if (logoUrl) {
        const logoB64 = await this.toBase64(logoUrl, apiKey);
        if (logoB64) {
          parts.push({ inlineData: { mimeType: 'image/png', data: logoB64 } });
        }
      }

      this.logger.log(`🖼️  Calling ${MODEL} | parts: ${parts.length} (1 text + ${parts.length - 1} images)`);

      const res = await axios.post(
        `${API_BASE}/${MODEL}:generateContent`,
        {
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
          },
        },
        {
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          timeout: 120_000,
        },
      );

      const resParts: any[] = res.data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart =
        resParts.find((p: any) => p.inlineData?.data) ??
        resParts.find((p: any) => p.inline_data?.data);

      const b64 = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
      if (!b64) {
        this.logger.error('No image in Gemini response:', JSON.stringify(res.data).slice(0, 400));
        return { success: false, error: 'No image data returned from Gemini' };
      }

      const buffer = Buffer.from(b64, 'base64');
      const savedUrl = this.saveLocally(buffer, job.id);

      return { success: true, imageBuffer: buffer, imageUrl: savedUrl ?? undefined };
    } catch (err) {
      this.logger.error(`Design generation error: ${err.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async toBase64(url: string, waToken?: string): Promise<string | null> {
    try {
      const headers: Record<string, string> = {};
      // WhatsApp media URLs need auth; our own API_BASE URLs don't
      if (url.includes('graph.facebook.com') || url.includes('lookaside.fbsbx.com')) {
        headers['Authorization'] = `Bearer ${waToken}`;
      }
      const res = await axios.get(url, { headers, responseType: 'arraybuffer', timeout: 20_000 });
      return Buffer.from(res.data).toString('base64');
    } catch (err) {
      this.logger.warn(`toBase64 failed for ${url}: ${err.message}`);
      return null;
    }
  }

  private buildLogoUrl(client: Client): string | null {
    if (!client.logo_filename) return null;
    const r2 = this.config.get<string>('R2_PUBLIC_URL', '');
    if (r2) return `${r2}/logos/${client.logo_filename}`;
    const apiBase = this.config.get<string>('API_BASE_URL', '');
    return `${apiBase}/api/files/logos/${client.logo_filename}`;
  }

  private saveLocally(buffer: Buffer, jobId: number): string | null {
    try {
      const uploadsDir = this.config.get<string>('UPLOADS_DIR', './uploads');
      const apiBase = this.config.get<string>('API_BASE_URL', '');
      const dir = path.join(uploadsDir, 'generated');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `design_${jobId}_${Date.now()}.jpg`;
      fs.writeFileSync(path.join(dir, filename), buffer);
      return `${apiBase}/api/files/generated/${filename}`;
    } catch (err) {
      this.logger.warn(`Failed to save design locally: ${err.message}`);
      return null;
    }
  }

  private parseProductImages(job: CreativeJob): string[] {
    try { return JSON.parse(job.product_images ?? '[]'); } catch { return []; }
  }

  private buildPrompt(client: Client, job: CreativeJob, userText: string): string {
    const toneMap: Record<string, string> = {
      luxury: 'Elegant, minimalist, premium aesthetics with gold/dark tones',
      playful: 'Vibrant, fun, bold colors with dynamic shapes',
      professional: 'Clean, structured, corporate with strong typography hierarchy',
      minimal: 'Ultra-clean with generous white space and simple geometry',
      vibrant: 'Bold, high contrast, striking visual impact',
    };
    const style = toneMap[client.brand_tone ?? ''] ?? toneMap['professional'];
    const isProduct = ['product_sale', 'from_image', 'multi_mode'].includes(job.job_type);

    let prompt = `Create a professional social media advertising post image.

Business: ${client.business_name ?? 'Brand'} | Industry: ${client.industry ?? 'General'}
Brand colors: Primary ${client.primary_color ?? '#000000'}, Secondary ${client.secondary_color ?? '#ffffff'}
Visual style: ${style}
Creative brief: ${userText}

DESIGN REQUIREMENTS:
- Full-bleed design, no white borders or margins
- Square format (1:1), suitable for Instagram and Facebook
- If a logo image is provided, place it prominently at the top center
- Leave approximately 200px at the bottom for caption text overlay
- High contrast between text areas and background`;

    if (isProduct) {
      prompt += `\n- If a product image is provided, feature it prominently (40-50% of canvas), centered with depth and shadow`;
    } else {
      prompt += `\n- Announcement post: bold and eye-catching with strong visual hierarchy`;
    }

    if (client.business_address) {
      prompt += `\n- Business location: ${client.business_address}`;
    }

    prompt += `\n\nDo NOT add any text, words, or letters in the image. Purely visual design only.`;

    return prompt;
  }
}
