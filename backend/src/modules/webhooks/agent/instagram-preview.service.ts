import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

// ── Canvas dimensions ──────────────────────────────────────────────────────
// 800px wide → when WhatsApp displays at ~390px screen width (scale 0.49)
// top bar renders ~54px, image ~390px, bottom ~83px — similar to real Instagram
const W = 800;
const IMG_H = 800;
const TOP_H = 110;
const BTM_H = 170;
const TOTAL_H = TOP_H + IMG_H + BTM_H;

let fontsLoaded = false;
function ensureFonts() {
  if (fontsLoaded) return;
  const fontsDir = path.join(__dirname, '..', '..', '..', 'fonts');
  const entries: [string, string][] = [
    ['NotoSans-Regular.ttf',   'Noto Sans'],
    ['NotoArabic-Regular.ttf', 'Noto Naskh Arabic'],
    ['NotoHebrew-Regular.ttf', 'Noto Sans Hebrew'],
  ];
  for (const [file, family] of entries) {
    const p = path.join(fontsDir, file);
    if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, family);
  }
  fontsLoaded = true;
}

function hasRTL(text: string): boolean {
  return /[\u0600-\u06FF\u0590-\u05FF]/.test(text);
}

function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
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

      // ── Black background ──────────────────────────────────────────────────
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, TOTAL_H);

      // ── TOP BAR ───────────────────────────────────────────────────────────
      const AVATAR_R = 32;
      const AVATAR_CX = 18 + AVATAR_R;
      const AVATAR_CY = TOP_H / 2;

      // Instagram gradient ring
      const grad = ctx.createLinearGradient(
        AVATAR_CX - AVATAR_R - 3, AVATAR_CY - AVATAR_R - 3,
        AVATAR_CX + AVATAR_R + 3, AVATAR_CY + AVATAR_R + 3,
      );
      grad.addColorStop(0,    '#f09433');
      grad.addColorStop(0.33, '#e6683c');
      grad.addColorStop(0.66, '#dc2743');
      grad.addColorStop(1,    '#bc1888');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_R + 3, 0, Math.PI * 2);
      ctx.stroke();

      // Avatar image or placeholder circle
      let avatarDrawn = false;
      if (logoUrl) {
        try {
          const buf = await this.fetch(logoUrl);
          if (buf) {
            const img = await loadImage(buf);
            ctx.save();
            ctx.beginPath();
            ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_R, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img,
              AVATAR_CX - AVATAR_R, AVATAR_CY - AVATAR_R,
              AVATAR_R * 2, AVATAR_R * 2,
            );
            ctx.restore();
            avatarDrawn = true;
          }
        } catch { /* ignore */ }
      }
      if (!avatarDrawn) {
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(AVATAR_CX, AVATAR_CY, AVATAR_R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Handle text — use ASCII-safe handle to avoid box rendering
      const safeHandle = handle.replace(/[^\x00-\x7F]/g, '').trim() || 'business';
      ctx.font = `bold 32px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText(`@${safeHandle}`, AVATAR_CX + AVATAR_R + 16, AVATAR_CY);

      // Three-dot menu
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath();
        ctx.arc(W - 36 + i * 13, AVATAR_CY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Separator
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, TOP_H);
      ctx.lineTo(W, TOP_H);
      ctx.stroke();

      // ── DESIGN IMAGE ──────────────────────────────────────────────────────
      const designBuf = await this.fetch(designImageUrl);
      if (!designBuf) throw new Error('Could not fetch design image');
      const designImg = await loadImage(designBuf);
      ctx.drawImage(designImg, 0, TOP_H, W, IMG_H);

      // ── BOTTOM BAR ────────────────────────────────────────────────────────
      const BY = TOP_H + IMG_H;  // bottom section top Y

      // Separator
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, BY);
      ctx.lineTo(W, BY);
      ctx.stroke();

      // ── Action icons row (Y = BY + 46) ────────────────────────────────────
      const ICO_Y = BY + 46;
      const S = 30;   // icon bounding size

      // Heart
      this.heart(ctx, 18, ICO_Y - S / 2, S);

      // Comment bubble
      this.comment(ctx, 18 + S + 20, ICO_Y - S / 2, S);

      // Share / send
      this.share(ctx, 18 + (S + 20) * 2, ICO_Y - S / 2, S);

      // Bookmark (right-aligned)
      this.bookmark(ctx, W - 18 - S, ICO_Y - S / 2, S);

      // ── Likes ─────────────────────────────────────────────────────────────
      ctx.font = `bold 28px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText('1,243 likes', 18, BY + 72);

      // ── Caption ───────────────────────────────────────────────────────────
      const captionY = BY + 108;
      const isRTL = hasRTL(caption);
      const maxCaptionW = W - 36;

      // Bold @handle prefix
      ctx.font = `bold 26px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      const prefixWidth = ctx.measureText(`@${safeHandle} `).width;
      ctx.fillText(`@${safeHandle} `, 18, captionY);

      // Caption body — handle RTL
      ctx.font = `26px ${FONT}`;
      ctx.fillStyle = '#c8c8c8';

      if (isRTL) {
        // RTL: draw right-to-left, truncated to one line
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        const maxW = maxCaptionW - prefixWidth;
        let truncated = caption;
        while (truncated.length > 0 && ctx.measureText(truncated).width > maxW) {
          truncated = truncated.slice(0, -1);
        }
        if (truncated.length < caption.length) truncated = truncated.slice(0, -1) + '…';
        ctx.fillText(truncated, W - 18, captionY);
      } else {
        // LTR: wrap up to 2 lines
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        const lines = wrapText(ctx, caption, maxCaptionW - prefixWidth);
        ctx.fillText(lines[0] ?? '', 18 + prefixWidth, captionY);
        if (lines[1]) ctx.fillText(lines[1], 18, captionY + 34);
      }

      const buf = canvas.toBuffer('image/jpeg', 90);
      this.logger.log(`📸 Preview: ${Math.round(buf.length / 1024)}KB`);
      return buf;
    } catch (err) {
      this.logger.error(`Instagram preview failed: ${err.message}`);
      return null;
    }
  }

  // ── Icon path helpers ──────────────────────────────────────────────────────

  private heart(ctx: any, x: number, y: number, s: number) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + s * 0.82);
    ctx.bezierCurveTo(x + s * 0.05, y + s * 0.5, x + s * 0.05, y + s * 0.1, x + s / 2, y + s * 0.32);
    ctx.bezierCurveTo(x + s * 0.95, y + s * 0.1, x + s * 0.95, y + s * 0.5, x + s / 2, y + s * 0.82);
    ctx.stroke();
  }

  private comment(ctx: any, x: number, y: number, s: number) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // Rounded rectangle bubble
    const r = s * 0.15;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + s - r, y);
    ctx.quadraticCurveTo(x + s, y, x + s, y + r);
    ctx.lineTo(x + s, y + s * 0.65);
    ctx.quadraticCurveTo(x + s, y + s * 0.8, x + s - r, y + s * 0.8);
    ctx.lineTo(x + s * 0.35, y + s * 0.8);
    ctx.lineTo(x + s * 0.15, y + s);
    ctx.lineTo(x + s * 0.22, y + s * 0.8);
    ctx.lineTo(x + r, y + s * 0.8);
    ctx.quadraticCurveTo(x, y + s * 0.8, x, y + s * 0.65);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
  }

  private share(ctx: any, x: number, y: number, s: number) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Paper-plane style
    ctx.moveTo(x, y + s * 0.5);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.6, y + s);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.5);
    ctx.lineTo(x + s * 0.6, y + s * 0.5);
    ctx.stroke();
  }

  private bookmark(ctx: any, x: number, y: number, s: number) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y);
    ctx.lineTo(x + s * 0.9, y);
    ctx.lineTo(x + s * 0.9, y + s);
    ctx.lineTo(x + s / 2, y + s * 0.72);
    ctx.lineTo(x + s * 0.1, y + s);
    ctx.closePath();
    ctx.stroke();
  }

  private async fetch(url: string): Promise<Buffer | null> {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 25_000 });
      return Buffer.from(res.data);
    } catch {
      return null;
    }
  }
}
