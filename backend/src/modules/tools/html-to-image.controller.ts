import { Controller, Post, Body, UseGuards, BadRequestException, Logger } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { R2Service } from '../../common/services/r2.service';
import * as puppeteer from 'puppeteer-core';

@Controller('tools/html-to-image')
@UseGuards(ApiKeyGuard)
export class HtmlToImageController {
  private readonly logger = new Logger(HtmlToImageController.name);

  constructor(private readonly r2: R2Service) {}

  @Post()
  async convert(@Body() body: { html: string; width?: number; height?: number; filename?: string }) {
    if (!body.html) throw new BadRequestException('html required');

    const width = body.width ?? 375;
    const height = body.height ?? 812;

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height });
      await page.setContent(body.html, { waitUntil: 'networkidle0', timeout: 15000 });

      const screenshot = await page.screenshot({ type: 'png', fullPage: false }) as Buffer;

      const filename = body.filename
        ? body.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        : `post_${Date.now()}.png`;

      const url = await this.r2.upload(
        this.r2.buildKey('generated', filename),
        screenshot,
        'image/png',
      );

      this.logger.log(`HTML→image: ${url}`);
      return { url, width, height };
    } finally {
      await browser.close();
    }
  }
}
