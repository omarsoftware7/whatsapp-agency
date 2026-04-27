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

const GEMINI_MODEL = 'gemini-3-pro-image-preview';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

// Exact system prompt from the n8n workflow
const CREATIVE_DIRECTOR_SYSTEM_PROMPT = `## 🎨 SYSTEM PROMPT: Image ad template Prompt Generator for Product Creatives

A – Ask:
  Generate an image ad template prompt (stringified as JSON), plus a short caption and a structured creative summary, based on a product reference image and the user's creative intent.

G – Guidance:
  role: Seasoned creative director with deep expertise in visual storytelling, branding, and advertising
  output_count: 1
  character_limit: No hard limit, but each output should remain focused and readable

  constraints:
    - Do not quote the creative brief verbatim. Try to analyse it, improve it, extract its main ideas and prompt based on it. Assume users are stupid or ignorant. Users are speaking to you as if you were a person, try to understand their requests and not verbatim doing it. If the user's brief is without a product (is an announcement or general content post request) try to think of a design that fits the brand, its products and audience. For example include some unspecified random unbranded products for a perfume shop's announcement about closure or whatever.
    - Prioritise dynamic backgrounds and elements, with scenes that are fully detailed out (unless otherwise specified by the user)
    - Reference image must be mentioned and used for detailed visual context
    - Preserve product label, color, and packaging fidelity
    - Preserve logo (if provided) fidelity and make no changes to it whatsoever.
    - Avoid vague, generic, or brand-inaccurate descriptions
    - If the reference image contains background elements, ignore them unless essential—focus solely on the product as the visual centerpiece
    - If the user's brief lacks detail, creatively interpret their intent and propose a well-directed image and video concept. Be imaginative — act like a creative director, not a mirror.
    - When the brief is vague, choose from one of the provided inspirational examples below and adapt its style, tone, and structure to fit the specific product and context.
    - The image setting must align with the image setting
    - Infer from the creative brief all details such as address, website url, sale terms, phone numbers, contact details, prices, old prices, or other marketing or contact info and add them to the image prompt, to be inserted where suitable but not on the product or behind it but rather in the best position in the template. All inferred details must be included.
    - Any inferred element is to be placed not on the product. Nothing can be printed or put on top of the product.
    - Inferred info must be professionally formatted and made to sell. Prices in price stickers matching the design. Address and contact elements the same on top of good elements that are good for social media. If the user gives before and after price extract them without the words, price only.
    - ALL inferred element MUST be included
    - business info: do not prompt or output keys, only their values (e.g. no need for ADDRESS: TEL AVIV just write the address)

    - "image_prompt" must be a string and include the following. Make sure to mention to Keep the product's packaging, label, text, logo and all design details 100% sharp, clear and untouched. Make sure the background color matches or complements the dominant packaging color. Use realistic shadows and depth.:
      - description
      - inferred elements
      - setting
      - background
      - composition
      - elements
      - lighting
      - camera_type
      - camera_settings
      - effects
      - style

    - "creative_summary" must begin with a short, non-technical paragraph summarizing where the image is, what's the style. Then use:
      🖼️ IMAGE:
      - just summarize the image prompt above but in bullet points

    - "caption" must include at least one emoji and 1–2 relevant hashtags. Keep it punchy and optimized for social sharing.

E – Examples:
  🟢 good_examples:

    Eye-Catchy Product Video:
    Capture a cinematic shot of a sunlit Scandinavian bedroom. A sealed IKEA box trembles, opens, and flat pack furniture assembles rapidly into a serene, styled room highlighted by a yellow IKEA throw on the bed. Elements include a fixed wide-angle camera, natural warm lighting with cool accents, and details such as the IKEA box (logo visible), bed with yellow throw, bedside tables, lamps, wardrobe, shelves, mirror, art, rug, curtains, reading chair, and plants. The motion features the box opening and furniture assembling precisely and rapidly. It ends in a calm, modern space with the signature yellow IKEA accent. Keywords include 16:9, IKEA, Scandinavian, fast assembly, no text, warm & cool tones. No text should appear on screen.

    Product Photoshoot:
    Create a hyper-realistic, high-energy product photo using my exact product from the reference image I provide. Keep the product's packaging, label, text, logo and all design details 100% sharp, clear and untouched — do NOT blur or change any part of the label or text. Place the product in the center with an explosion of its natural flavor ingredients (for example: cereal balls, chocolate pieces, milk splashes, strawberries, or other matching ingredients). Make sure the background color matches or complements the dominant packaging color. Add dynamic lighting and a vivid splash effect to create energy, but keep the product label perfectly readable and in focus. Use realistic shadows and depth. The final image should feel delicious, fun and eye-catching, with every product detail fully visible and sharp. On the bottom left add the provided price (250 ILS) and on the bottom right add the contact details: Phone icon followed by 05454515506

    Street Style Product Ad:
    Capture a cinematic eyewear portrait from a low angle as a model looks skyward, chin raised in defiance beneath thick, acid-toned sunglasses that wrap tightly across their face. Behind them, rooftops and textures fade into bokeh, contrasting with the glossy sharpness of the sculptural frames. Style with street-meets-sci-fi minimalism — raw skin, matte or sweaty, with clean-lined hair and expressive stillness. Let harsh midday or early golden light cast crisp shadows across the scene. Overlay the warped, melting GlassEye™ logo across the lens or subtly floating in space — a symbol of visual rebellion. Mood: confident, elusive, and hyper-modern.

N – Notation:
  format: JSON
  example_output: |
    {
      "image_prompt": "string",
      "caption": "short caption",
      "creative_summary": "summary of the combined visual concept"
    }

T – Tools:
  You have access to the following tools. Each one is described clearly:
  - Think Tool: Use this to reflect and reason before responding.`;

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(private readonly config: ConfigService) {}

  async generate(client: Client, job: CreativeJob, userText: string): Promise<DesignResult> {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');

    if (!geminiKey) return { success: false, error: 'GEMINI_API_KEY not configured' };
    if (!openaiKey) return { success: false, error: 'OPENAI_API_KEY not configured' };

    try {
      // ── Step 1: resolve images ───────────────────────────────────────────
      const productImages = this.parseProductImages(job);
      const productUrl = productImages[0] ?? null;
      const logoUrl = this.buildLogoUrl(client);

      // Primary image for analysis: product if exists, else logo
      const primaryUrl = productUrl ?? logoUrl;
      const primaryB64 = primaryUrl ? await this.toBase64(primaryUrl) : null;

      // ── Step 2: GPT-4o — analyze the image ──────────────────────────────
      let imageDescription = '(no image provided)';
      if (primaryB64) {
        this.logger.log(`🔍 Analyzing image with GPT-4o | ${primaryUrl}`);
        imageDescription = await this.analyzeImageWithGpt4o(primaryB64, openaiKey);
        this.logger.log(`🔍 GPT-4o analysis: "${imageDescription.slice(0, 120)}..."`);
      }

      // ── Step 3: GPT-4.1 — generate creative image prompt ────────────────
      const businessInfo = this.buildBusinessInfo(client);
      this.logger.log(`✍️  Generating creative prompt with GPT-4.1`);
      const imagePrompt = await this.generateCreativePrompt(
        userText, businessInfo, imageDescription, openaiKey,
      );
      this.logger.log(`✍️  Creative prompt: "${imagePrompt.slice(0, 120)}..."`);

      // ── Step 4: build final Gemini prompt ────────────────────────────────
      const finalPrompt =
        `Take the product or service image or provided image or reference image in the first image and place it in this scenario: ${imagePrompt}.\n` +
        `then Place the second image [logo] where suitable.\n` +
        `- non-numeric characters: Output in exact origin language.\n` +
        `- numbers: output only in english\n` +
        `- phone numbers: output in local not international format (e.g. 972545451508 becomes 0545451508)\n` +
        `- ABSOLUTELY NO CHANGES CAN BE DONE TO THE IMAGE, OR REGENERATION TO IT OR PARTS OF IT. EVEN IF IT'S A NON-PRODUCT\n` +
        `- Never modify, alter, or change any human faces, human bodies, animals, or living beings in any image`;

      // ── Step 5: build Gemini parts ───────────────────────────────────────
      const parts: any[] = [{ text: finalPrompt }];

      // product image first (if exists)
      if (productUrl && primaryB64) {
        parts.push({ inlineData: { mimeType: 'image/png', data: primaryB64 } });
      }

      // logo second (always, if exists and different from product)
      if (logoUrl) {
        const logoB64 = logoUrl === primaryUrl ? primaryB64 : await this.toBase64(logoUrl);
        if (logoB64) {
          parts.push({ inlineData: { mimeType: 'image/png', data: logoB64 } });
        }
      }

      this.logger.log(`🖼️  Calling ${GEMINI_MODEL} | parts: ${parts.length} (1 text + ${parts.length - 1} images)`);

      // ── Step 6: call Gemini ──────────────────────────────────────────────
      const res = await axios.post(
        `${GEMINI_API}/${GEMINI_MODEL}:generateContent`,
        {
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
          },
        },
        {
          headers: { 'x-goog-api-key': geminiKey, 'Content-Type': 'application/json' },
          timeout: 120_000,
        },
      );

      // ── Step 7: extract image ─────────────────────────────────────────────
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
      const detail = err.response?.data ? JSON.stringify(err.response.data).slice(0, 400) : err.message;
      this.logger.error(`Design generation error: ${detail}`);
      return { success: false, error: err.message };
    }
  }

  // ── GPT-4o: analyze image ────────────────────────────────────────────────

  private async analyzeImageWithGpt4o(base64: string, openaiKey: string): Promise<string> {
    const res = await axios.post(
      OPENAI_API,
      {
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe the product and brand in this image in full detail. Fully ignore the background. Focus ONLY on the product. if the Image is the business logo describe it.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64}` },
            },
          ],
        }],
        max_tokens: 1000,
      },
      {
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        timeout: 30_000,
      },
    );
    return res.data?.choices?.[0]?.message?.content ?? '(image analysis unavailable)';
  }

  // ── GPT-4.1: generate creative prompt ────────────────────────────────────

  private async generateCreativePrompt(
    userText: string,
    businessInfo: string,
    imageDescription: string,
    openaiKey: string,
  ): Promise<string> {
    const userMessage =
      `This is the initial creative brief:\n${JSON.stringify(userText)}\n` +
      `Here is the Business info:\n${businessInfo}\n\n` +
      `Description of the product/business logo:\n${imageDescription}\n\n` +
      `*business info: do not prompt or output keys, only their values (e.g. no need for ADDRESS: TEL AVIV just write the address)\n` +
      `Rules:\nThe given images (product image or logo) should never be altered.`;

    const res = await axios.post(
      OPENAI_API,
      {
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: CREATIVE_DIRECTOR_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      },
      {
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        timeout: 60_000,
      },
    );

    const raw = res.data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    return parsed.image_prompt ?? userText;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async toBase64(url: string): Promise<string | null> {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20_000 });
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

  private buildBusinessInfo(client: Client): string {
    return [
      `Business Name: ${client.business_name ?? ''}`,
      `Business Address: ${client.business_address ?? ''}`,
      `Phone: ${client.business_phone ?? client.phone_number ?? ''}`,
      `Industry: ${client.industry ?? 'general'}`,
      `Brand Tone: ${client.brand_tone ?? 'professional'}`,
      `Brand Colors: Primary ${client.primary_color ?? '#000000'}, Secondary ${client.secondary_color ?? '#ffffff'}`,
    ].filter((l) => !l.endsWith(': ')).join('\n');
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
}
