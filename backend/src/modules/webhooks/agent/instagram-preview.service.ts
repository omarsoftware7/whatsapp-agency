import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import satori from 'satori';

const W = 800;
const IMG_H = 740;
const TOP_H = 110;
const BTM_H = 320;
const TOTAL_H = TOP_H + IMG_H + BTM_H;

function hasRTL(text: string) {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(text);
}

function loadFonts() {
  const dir = path.join(__dirname, '..', '..', '..', 'fonts');
  return [
    { name: 'Noto', data: fs.readFileSync(path.join(dir, 'NotoSans-Regular.ttf')),   weight: 400 as const, style: 'normal' as const },
    { name: 'Noto', data: fs.readFileSync(path.join(dir, 'NotoArabic-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
    { name: 'Noto', data: fs.readFileSync(path.join(dir, 'NotoHebrew-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  ].filter(f => f.data);
}

async function toDataUri(buf: Buffer, mime = 'image/jpeg') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// SVG path icons (Instagram-style, 24×24 viewBox)
function svgIcon(d: string, size = 28): any {
  return {
    type: 'svg',
    props: {
      width: size, height: size,
      viewBox: '0 0 24 24',
      style: { display: 'flex' },
      children: [{
        type: 'path',
        props: { d, fill: 'none', stroke: '#ffffff', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      }],
    },
  };
}

const ICON_HEART     = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';
const ICON_COMMENT   = 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z';
const ICON_SEND      = 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z';
const ICON_BOOKMARK  = 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z';

@Injectable()
export class InstagramPreviewService {
  private readonly logger = new Logger(InstagramPreviewService.name);
  private fonts: any[] | null = null;

  private getFonts() {
    if (!this.fonts) this.fonts = loadFonts();
    return this.fonts;
  }

  async create(
    designImageUrl: string,
    handle: string,
    caption: string,
    logoUrl?: string | null,
  ): Promise<Buffer | null> {
    try {
      const designBuf = await this.fetch(designImageUrl);
      if (!designBuf) throw new Error('Could not fetch design image');

      const designResized = await sharp(designBuf).resize(W, IMG_H, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
      const designUri = await toDataUri(designResized);

      let logoUri: string | null = null;
      if (logoUrl) {
        try {
          const logoBuf = await this.fetch(logoUrl);
          if (logoBuf) {
            const logoSmall = await sharp(logoBuf).resize(68, 68, { fit: 'cover' }).png().toBuffer();
            logoUri = await toDataUri(logoSmall, 'image/png');
          }
        } catch { /* ignore */ }
      }

      const rtl = hasRTL(caption);
      const captionShort = caption.length > 140 ? caption.slice(0, 137) + '…' : caption;
      const ff = '"Noto", sans-serif';

      const el: any = {
        type: 'div',
        props: {
          style: {
            display: 'flex', flexDirection: 'column',
            width: W, height: TOTAL_H,
            backgroundColor: '#000000',
            fontFamily: ff,
          },
          children: [

            // ── TOP BAR ──────────────────────────────────────────────────────
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', alignItems: 'center',
                  height: TOP_H, padding: '0 18px',
                  borderBottom: '1px solid #1a1a1a',
                },
                children: [
                  // Avatar with gradient ring
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 74, height: 74, borderRadius: 37,
                        background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #bc1888)',
                        padding: 3, marginRight: 14, flexShrink: 0,
                      },
                      children: [{
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex', width: 68, height: 68, borderRadius: 34,
                            overflow: 'hidden', backgroundColor: '#333',
                          },
                          children: logoUri ? [{
                            type: 'img',
                            props: { src: logoUri, width: 68, height: 68 },
                          }] : [],
                        },
                      }],
                    },
                  },
                  // Handle
                  {
                    type: 'div',
                    props: {
                      style: { flex: 1, color: '#ffffff', fontSize: 30, fontWeight: 700 },
                      children: `@${handle}`,
                    },
                  },
                  // Three dots (drawn as circles)
                  {
                    type: 'svg',
                    props: {
                      width: 28, height: 8, viewBox: '0 0 28 8',
                      style: { display: 'flex' },
                      children: [
                        { type: 'circle', props: { cx: 2,  cy: 4, r: 2, fill: '#888' } },
                        { type: 'circle', props: { cx: 14, cy: 4, r: 2, fill: '#888' } },
                        { type: 'circle', props: { cx: 26, cy: 4, r: 2, fill: '#888' } },
                      ],
                    },
                  },
                ],
              },
            },

            // ── DESIGN IMAGE ─────────────────────────────────────────────────
            {
              type: 'img',
              props: {
                src: designUri,
                width: W, height: IMG_H,
                style: { display: 'flex', flexShrink: 0 },
              },
            },

            // ── BOTTOM BAR ───────────────────────────────────────────────────
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', flexDirection: 'column',
                  padding: '18px 20px 12px',
                  borderTop: '1px solid #1a1a1a',
                  gap: 10,
                },
                children: [

                  // Icons row
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: 20 },
                      children: [
                        svgIcon(ICON_HEART),
                        svgIcon(ICON_COMMENT),
                        svgIcon(ICON_SEND),
                        { type: 'div', props: { style: { flex: 1 } } },
                        svgIcon(ICON_BOOKMARK),
                      ],
                    },
                  },

                  // Likes
                  {
                    type: 'div',
                    props: {
                      style: { color: '#ffffff', fontSize: 26, fontWeight: 700 },
                      children: '1,243 likes',
                    },
                  },

                  // Caption — handle + text, RTL-aware
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: rtl ? 'row-reverse' : 'row',
                        flexWrap: 'wrap',
                        fontSize: 24,
                        lineHeight: 1.45,
                        direction: rtl ? 'rtl' : 'ltr',
                        width: '100%',
                      },
                      children: [
                        {
                          type: 'span',
                          props: {
                            style: {
                              color: '#ffffff', fontWeight: 700,
                              marginLeft: rtl ? 8 : 0,
                              marginRight: rtl ? 0 : 8,
                            },
                            children: `@${handle}`,
                          },
                        },
                        {
                          type: 'span',
                          props: { style: { color: '#c8c8c8' }, children: captionShort },
                        },
                      ],
                    },
                  },

                  // Timestamp
                  {
                    type: 'div',
                    props: { style: { color: '#555', fontSize: 20 }, children: '2 HOURS AGO' },
                  },

                ],
              },
            },

          ],
        },
      };

      const svg = await satori(el, { width: W, height: TOTAL_H, fonts: this.getFonts() });
      const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
      this.logger.log(`📸 Preview: ${Math.round(buf.length / 1024)} KB`);
      return buf;
    } catch (err) {
      this.logger.error(`Instagram preview failed: ${err.message}`);
      return null;
    }
  }

  private async fetch(url: string): Promise<Buffer | null> {
    try {
      const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 25_000 });
      return Buffer.from(r.data);
    } catch { return null; }
  }
}
