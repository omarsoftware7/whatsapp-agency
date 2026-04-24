import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private readonly config: ConfigService) {}

  get textModel() { return this.config.get('GOOGLE_TEXT_MODEL', 'gemini-2.0-flash-exp'); }
  get imageModel() { return this.config.get('GOOGLE_IMAGE_MODEL', 'gemini-3-pro-image-preview'); }
  get editModel()  { return this.config.get('GOOGLE_EDIT_IMAGE_MODEL', 'models/gemini-2.5-flash-image'); }
  get apiKey()     { return this.config.get('GOOGLE_API_KEY'); }

  async generateText(prompt: string, maxTokens = 2048, temperature = 0.7): Promise<string> {
    const res = await axios.post(
      `${this.baseUrl}/models/${this.textModel}:generateContent?key=${this.apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      },
    );
    return res.data.candidates[0].content.parts[0].text;
  }

  async generateTextWithImages(prompt: string, imageParts: GeminiPart[], maxTokens = 2048): Promise<string> {
    const parts: GeminiPart[] = [...imageParts, { text: prompt }];
    const res = await axios.post(
      `${this.baseUrl}/models/${this.textModel}:generateContent?key=${this.apiKey}`,
      { contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens } },
    );
    return res.data.candidates[0].content.parts[0].text;
  }

  async generateImage(prompt: string, imageParts: GeminiPart[] = [], model?: string): Promise<Buffer> {
    const m = model || this.imageModel;
    const parts: GeminiPart[] = [...imageParts, { text: prompt }];
    const res = await axios.post(
      `${this.baseUrl}/models/${m}:generateContent?key=${this.apiKey}`,
      {
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      },
    );
    const imgPart = res.data.candidates[0].content.parts.find((p: any) => p.inlineData);
    if (!imgPart) throw new Error('No image returned from Gemini');
    return Buffer.from(imgPart.inlineData.data, 'base64');
  }

  async editImage(prompt: string, currentImageBase64: string, mimeType = 'image/png'): Promise<Buffer> {
    const parts: GeminiPart[] = [
      { inlineData: { mimeType, data: currentImageBase64 } },
      { text: prompt },
    ];
    const res = await axios.post(
      `${this.baseUrl}/${this.editModel}:generateContent?key=${this.apiKey}`,
      {
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] },
      },
    );
    const imgPart = res.data.candidates[0].content.parts.find((p: any) => p.inlineData);
    if (!imgPart) throw new Error('No image returned from Gemini edit');
    return Buffer.from(imgPart.inlineData.data, 'base64');
  }

  toInlinePart(buffer: Buffer, mimeType = 'image/png'): GeminiPart {
    return { inlineData: { mimeType, data: buffer.toString('base64') } };
  }
}
