import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import axios from 'axios';

const W = 1080;
const IMG_H = 1080;
const TOP_H = 85;
const BTM_H = 175;
const TOTAL_H = TOP_H + IMG_H + BTM_H;
const LOGO_SIZE = 56;
const LOGO_X = 14;
const LOGO_Y = 14;

@Injectable()
export class InstagramPreviewService {
  private readonly logger = new Logger(InstagramPreviewService.name);

  async create(
    designImageUrl: string,
    handle: string,
    caption: string,
    logoUrl?: string | null,
  ): Promise<Buffer | null> {
    try {
      // ── Download & resize design image ──────────────────────────────────
      const designBuf = await this.fetchBuffer(designImageUrl);
      if (!designBuf) throw new Error('Could not fetch design image');

      const designResized = await sharp(designBuf)
        .resize(W, IMG_H, { fit: 'cover' })
        .png()
        .toBuffer();

      // ── Circular logo avatar ─────────────────────────────────────────────
      let logoCircle: Buffer | null = null;
      if (logoUrl) {
        try {
          const logoBuf = await this.fetchBuffer(logoUrl);
          if (logoBuf) {
            const mask = Buffer.from(
              `<svg width="${LOGO_SIZE}" height="${LOGO_SIZE}">` +
              `<circle cx="${LOGO_SIZE / 2}" cy="${LOGO_SIZE / 2}" r="${LOGO_SIZE / 2}" fill="white"/>` +
              `</svg>`,
            );
            logoCircle = await sharp(logoBuf)
              .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover' })
              .composite([{ input: mask, blend: 'dest-in' }])
              .png()
              .toBuffer();
          }
        } catch { /* avatar falls back to placeholder circle */ }
      }

      const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      const safeHandle = esc(handle.replace(/\s+/g, '').toLowerCase());
      const captionSnippet = esc(caption.length > 90 ? caption.slice(0, 87) + '…' : caption);

      // ── Top bar SVG ──────────────────────────────────────────────────────
      const avatarPlaceholder = logoCircle
        ? '' // will be composited separately
        : `<circle cx="${LOGO_X + LOGO_SIZE / 2}" cy="${LOGO_Y + LOGO_SIZE / 2}" r="${LOGO_SIZE / 2}" fill="#333"/>`;

      const topSvg = Buffer.from(
        `<svg width="${W}" height="${TOP_H}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="${W}" height="${TOP_H}" fill="#000"/>` +
        avatarPlaceholder +
        `<text x="${LOGO_X + LOGO_SIZE + 12}" y="50" fill="white" font-size="28" font-family="Arial,Helvetica,sans-serif" font-weight="600">@${safeHandle}</text>` +
        `<text x="${W - 22}" y="52" fill="#aaa" font-size="34" font-family="Arial,sans-serif" text-anchor="end">•••</text>` +
        `</svg>`,
      );

      // ── Bottom bar SVG ───────────────────────────────────────────────────
      const bottomSvg = Buffer.from(
        `<svg width="${W}" height="${BTM_H}" xmlns="http://www.w3.org/2000/svg">` +
        `<rect width="${W}" height="${BTM_H}" fill="#000"/>` +
        `<line x1="0" y1="0" x2="${W}" y2="0" stroke="#262626" stroke-width="1"/>` +
        // Action icons
        `<text x="18" y="55" fill="white" font-size="38" font-family="Arial,sans-serif">♡</text>` +
        `<text x="78" y="55" fill="white" font-size="34" font-family="Arial,sans-serif">✉</text>` +
        `<text x="136" y="58" fill="white" font-size="32" font-family="Arial,sans-serif">▷</text>` +
        `<text x="${W - 18}" y="55" fill="white" font-size="34" font-family="Arial,sans-serif" text-anchor="end">⊕</text>` +
        // Likes
        `<text x="18" y="100" fill="white" font-size="27" font-family="Arial,sans-serif" font-weight="bold">1,243 likes</text>` +
        // Caption line
        `<text x="18" y="140" fill="white" font-size="25" font-family="Arial,sans-serif">` +
        `<tspan font-weight="bold">@${safeHandle} </tspan>` +
        `<tspan fill="#d0d0d0">${captionSnippet}</tspan>` +
        `</text>` +
        `</svg>`,
      );

      // ── Composite ────────────────────────────────────────────────────────
      const composites: sharp.OverlayOptions[] = [
        { input: designResized, top: TOP_H, left: 0 },
        { input: topSvg, top: 0, left: 0 },
        { input: bottomSvg, top: TOP_H + IMG_H, left: 0 },
      ];
      if (logoCircle) {
        composites.push({ input: logoCircle, top: LOGO_Y, left: LOGO_X });
      }

      const result = await sharp({
        create: { width: W, height: TOTAL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
      })
        .composite(composites)
        .png()
        .toBuffer();

      this.logger.log(`📸 Instagram preview created (${Math.round(result.length / 1024)}KB)`);
      return result;
    } catch (err) {
      this.logger.error(`Instagram preview failed: ${err.message}`);
      return null;
    }
  }

  private async fetchBuffer(url: string): Promise<Buffer | null> {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 25_000 });
      return Buffer.from(res.data);
    } catch {
      return null;
    }
  }
}
