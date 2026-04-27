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

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(private readonly config: ConfigService) {}

  async generate(client: Client, job: CreativeJob, userText: string): Promise<DesignResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not configured' };

    try {
      const prompt = this.buildPrompt(client, job, userText);

      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' },
        },
        { timeout: 60_000 },
      );

      const prediction = res.data?.predictions?.[0];
      if (!prediction?.bytesBase64Encoded) {
        this.logger.error('Gemini Imagen response:', JSON.stringify(res.data));
        return { success: false, error: 'No image data returned from Gemini Imagen' };
      }

      const buffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const savedUrl = this.saveLocally(buffer, job.id);

      return { success: true, imageBuffer: buffer, imageUrl: savedUrl ?? undefined };
    } catch (err) {
      this.logger.error(`Design generation error: ${err.message}`);
      return { success: false, error: err.message };
    }
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

    let logoNote = '';
    if (client.logo_filename) {
      logoNote = `\n- Place the brand logo prominently at the top center`;
    }

    let productNote = '';
    try {
      const productImages: string[] = JSON.parse(job.product_images ?? '[]');
      if (productImages.length > 0) {
        productNote = `\n- Feature the product prominently (40-50% of canvas), centered with depth and shadow`;
      }
    } catch (_) {}

    let prompt = `Create a professional social media advertising post image.

Business: ${client.business_name ?? 'Brand'} | Industry: ${client.industry ?? 'General'}
Brand colors: Primary ${client.primary_color ?? '#000000'}, Secondary ${client.secondary_color ?? '#ffffff'}
Visual style: ${style}
Creative brief: ${userText}

DESIGN REQUIREMENTS:
- Full-bleed design, no white borders or margins
- Square format (1:1), suitable for Instagram and Facebook${logoNote}
- Leave approximately 200px at the bottom for caption text overlay
- High contrast between text areas and background
- Brand colors: ${client.primary_color ?? '#000000'} and ${client.secondary_color ?? '#ffffff'}`;

    if (isProduct) {
      prompt += productNote || `\n- Feature the product prominently (40-50% of canvas), centered with depth and shadow`;
    } else {
      prompt += `\n- This is an announcement post: make it bold and eye-catching with large typography`;
    }

    if (client.business_address) {
      prompt += `\n- Business location: ${client.business_address}`;
    }

    prompt += `\n\nDo NOT include any text, words, or letters in the image. The design should be purely visual.`;

    return prompt;
  }
}
