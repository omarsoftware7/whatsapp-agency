import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

const W = 1080;
const IMG_H = 1080;
const TOP_H = 110;
const BTM_H = 220;
const TOTAL_H = TOP_H + IMG_H + BTM_H;

let fontsLoaded = false;
function ensureFonts() {
  if (fontsLoaded) return;
  // Resolve relative to this file — works in both src/ and dist/
  const fontsDir = path.join(__dirname, '..', '..', '..', 'fonts');
  for (const [file, family] of [
    ['NotoSans-Regular.ttf', 'Noto Sans'],
    ['NotoArabic-Regular.ttf', 'Noto Naskh Arabic'],
    ['NotoHebrew-Regular.ttf', 'Noto Sans Hebrew'],
  ] as [string, string][]) {
    const p = path.join(fontsDir, file);
    if (fs.existsSync(p)) {
      GlobalFonts.registerFromPath(p, family);
    }
  }
  fontsLoaded = true;
}

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
      ensureFonts();

      const canvas = createCanvas(W, TOTAL_H);
      const ctx = canvas.getContext('2d');
      const FONT = '"Noto Sans Hebrew", "Noto Naskh Arabic", "Noto Sans", sans-serif';

      // ── Background ────────────────────────────────────────────────────────
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, TOTAL_H);

      // ── Top bar ───────────────────────────────────────────────────────────
      const AVATAR_R = 28;
      const AVATAR_CX = 20 + AVATAR_R;
      const AVATAR_CY = TOP_H / 2;

      // Separator line at bottom of top bar
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, TOP_H);
      ctx.lineTo(W, TOP_H);
      ctx.stroke();

      // Avatar — try logo first, fall back to coloured circle
      let avatarDrawn = false;
      if (logoUrl) {
        try {
          const logoBuf = await this.fetchBuffer(logoUrl);
          if (logoBuf) {
            const img = await loadImage(logoBuf);
            // Clip circle
            ctx.save();
            ctx.beginPath();
            ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_R, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, AVATAR_CX - AVATAR_R, AVATAR_CY - AVATAR_R, AVATAR_R * 2, AVATAR_R * 2);
            ctx.restore();
            avatarDrawn = true;
          }
        } catch { /* fall through */ }
      }
      if (!avatarDrawn) {
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Instagram gradient ring around avatar
      const grad = ctx.createLinearGradient(AVATAR_CX - AVATAR_R - 3, AVATAR_CY, AVATAR_CX + AVATAR_R + 3, AVATAR_CY);
      grad.addColorStop(0, '#f09433');
      grad.addColorStop(0.25, '#e6683c');
      grad.addColorStop(0.5, '#dc2743');
      grad.addColorStop(0.75, '#cc2366');
      grad.addColorStop(1, '#bc1888');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_R + 3, 0, Math.PI * 2);
      ctx.stroke();

      // Handle text
      ctx.font = `bold 30px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(`@${handle}`, AVATAR_CX + AVATAR_R + 16, AVATAR_CY);

      // Three dots
      ctx.fillStyle = '#aaaaaa';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(W - 28 + i * 12, AVATAR_CY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Design image ──────────────────────────────────────────────────────
      const designBuf = await this.fetchBuffer(designImageUrl);
      if (!designBuf) throw new Error('Could not fetch design image');
      const designImg = await loadImage(designBuf);
      ctx.drawImage(designImg, 0, TOP_H, W, IMG_H);

      // ── Bottom bar ─────────────────────────────────────────────────────────
      const BTM_Y = TOP_H + IMG_H;

      // Separator
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, BTM_Y);
      ctx.lineTo(W, BTM_Y);
      ctx.stroke();

      // Action icons (drawn as paths)
      const ICO_Y = BTM_Y + 50;
      const ICO_SIZE = 28;

      // Heart
      this.drawHeart(ctx, 22, ICO_Y - ICO_SIZE / 2, ICO_SIZE);

      // Comment bubble
      this.drawComment(ctx, 22 + ICO_SIZE + 22, ICO_Y - ICO_SIZE / 2, ICO_SIZE);

      // Send/Share arrow
      this.drawShare(ctx, 22 + (ICO_SIZE + 22) * 2, ICO_Y - ICO_SIZE / 2, ICO_SIZE);

      // Bookmark (right side)
      this.drawBookmark(ctx, W - 22 - ICO_SIZE, ICO_Y - ICO_SIZE / 2, ICO_SIZE);

      // Likes
      ctx.font = `bold 28px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.fillText('1,243 likes', 22, BTM_Y + 78);

      // Caption
      const captionText = caption.length > 100 ? caption.slice(0, 97) + '…' : caption;
      ctx.font = `28px ${FONT}`;
      ctx.fillStyle = '#d0d0d0';
      const captionY = BTM_Y + 118;

      // Bold username prefix
      ctx.font = `bold 28px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      const handleWidth = ctx.measureText(`@${handle} `).width;
      ctx.fillText(`@${handle} `, 22, captionY);

      ctx.font = `28px ${FONT}`;
      ctx.fillStyle = '#d0d0d0';
      ctx.fillText(captionText, 22 + handleWidth, captionY);

      const buf = canvas.toBuffer('image/png');
      this.logger.log(`📸 Instagram preview created (${Math.round(buf.length / 1024)}KB)`);
      return buf;
    } catch (err) {
      this.logger.error(`Instagram preview failed: ${err.message}`);
      return null;
    }
  }

  // ── Icon helpers ────────────────────────────────────────────────────────────

  private drawHeart(ctx: any, x: number, y: number, size: number) {
    const s = size;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + s * 0.85);
    ctx.bezierCurveTo(x, y + s * 0.5, x, y + s * 0.15, x + s / 2, y + s * 0.35);
    ctx.bezierCurveTo(x + s, y + s * 0.15, x + s, y + s * 0.5, x + s / 2, y + s * 0.85);
    ctx.stroke();
  }

  private drawComment(ctx: any, x: number, y: number, size: number) {
    const s = size;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.roundRect(x, y, s, s * 0.8, 5);
    ctx.moveTo(x + s * 0.2, y + s * 0.8);
    ctx.lineTo(x + s * 0.1, y + s);
    ctx.lineTo(x + s * 0.45, y + s * 0.8);
    ctx.stroke();
  }

  private drawShare(ctx: any, x: number, y: number, size: number) {
    const s = size;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.15, y + s * 0.2);
    ctx.lineTo(x + s * 0.85, y + s * 0.5);
    ctx.lineTo(x + s * 0.15, y + s * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.85, y + s * 0.5);
    ctx.lineTo(x, y + s * 0.5);
    ctx.stroke();
  }

  private drawBookmark(ctx: any, x: number, y: number, size: number) {
    const s = size;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x + s / 2, y + s * 0.7);
    ctx.lineTo(x, y + s);
    ctx.closePath();
    ctx.stroke();
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
