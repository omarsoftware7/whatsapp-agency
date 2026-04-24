import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KieService {
  private readonly logger = new Logger(KieService.name);
  private readonly baseUrl = 'https://api.kie.ai/api/v1';

  constructor(private readonly config: ConfigService) {}

  private get headers() {
    const key = this.config.get('KIE_API_KEY');
    return { Authorization: `Bearer ${key}`, 'X-API-Key': key };
  }

  async generateVideo(prompt: string, imageUrls: string[], aspectRatio = '1:1'): Promise<string> {
    const res = await axios.post(
      `${this.baseUrl}/veo/generate`,
      { prompt, model: 'veo3_fast', aspectRatio, imageUrls },
      { headers: this.headers },
    );
    return res.data.data?.taskId;
  }

  async pollVideo(taskId: string, maxAttempts = 30, intervalMs = 10000): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(intervalMs);
      const res = await axios.get(`${this.baseUrl}/veo/record-info`, {
        params: { taskId },
        headers: this.headers,
      });
      const data = res.data.data;
      if (data?.successFlag === 1 && data?.resultUrls?.[0]) {
        return data.resultUrls[0];
      }
      if (data?.failFlag === 1) throw new Error('KIE video generation failed');
    }
    throw new Error('KIE video generation timed out');
  }

  private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}
