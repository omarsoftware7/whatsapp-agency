import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class WhatsAppSenderService {
  private readonly logger = new Logger(WhatsAppSenderService.name);

  constructor(private readonly config: ConfigService) {}

  private get token() { return this.config.get<string>('WA_ACCESS_TOKEN', ''); }
  private get phoneId() { return this.config.get<string>('WA_PHONE_NUMBER_ID', ''); }
  private get gv() { return this.config.get<string>('META_GRAPH_VERSION', 'v18.0'); }
  private get apiUrl() { return `https://graph.facebook.com/${this.gv}/${this.phoneId}/messages`; }
  private get headers() { return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }; }

  async sendText(to: string, text: string): Promise<void> {
    try {
      await axios.post(
        this.apiUrl,
        { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
        { headers: this.headers, timeout: 15_000 },
      );
    } catch (err) {
      this.logger.error(`sendText to ${to} failed: ${err.response?.data?.error?.message ?? err.message}`);
    }
  }

  async sendImageByUrl(to: string, url: string, caption?: string): Promise<void> {
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp', to, type: 'image',
          image: { link: url, ...(caption ? { caption } : {}) },
        },
        { headers: this.headers, timeout: 15_000 },
      );
    } catch (err) {
      this.logger.error(`sendImageByUrl to ${to} failed: ${err.message}`);
    }
  }

  async sendImageByMediaId(to: string, mediaId: string, caption?: string): Promise<void> {
    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp', to, type: 'image',
          image: { id: mediaId, ...(caption ? { caption } : {}) },
        },
        { headers: this.headers, timeout: 15_000 },
      );
    } catch (err) {
      this.logger.error(`sendImageByMediaId to ${to} failed: ${err.message}`);
    }
  }

  /** Upload media to WhatsApp and return a reusable media ID. */
  async uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
    try {
      const form = new FormData();
      form.append('file', buffer, { filename, contentType: mimeType });
      form.append('type', mimeType);
      form.append('messaging_product', 'whatsapp');

      const res = await axios.post(
        `https://graph.facebook.com/${this.gv}/${this.phoneId}/media`,
        form,
        { headers: { ...form.getHeaders(), Authorization: `Bearer ${this.token}` }, timeout: 30_000 },
      );
      return res.data?.id ?? null;
    } catch (err) {
      this.logger.error(`uploadMedia failed: ${err.message}`);
      return null;
    }
  }

  /** Download a WhatsApp media URL (requires Bearer token) and return a Buffer. */
  async downloadMediaBuffer(url: string): Promise<Buffer | null> {
    try {
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${this.token}` },
        responseType: 'arraybuffer',
        timeout: 30_000,
      });
      return Buffer.from(res.data);
    } catch (err) {
      this.logger.error(`downloadMediaBuffer failed: ${err.message}`);
      return null;
    }
  }

  /** Resolve a WhatsApp media ID → direct download URL. */
  async resolveMediaId(mediaId: string): Promise<string | null> {
    try {
      const res = await axios.get(
        `https://graph.facebook.com/${this.gv}/${mediaId}`,
        { headers: { Authorization: `Bearer ${this.token}` }, timeout: 10_000 },
      );
      return res.data?.url ?? null;
    } catch (err) {
      this.logger.error(`resolveMediaId(${mediaId}) failed: ${err.message}`);
      return null;
    }
  }
}
