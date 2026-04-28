import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import satori from 'satori';

const W = 800;
const IMG_H = 800;
const TOP_H = 110;
const BTM_H = 280;
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
      // ── Fetch images ──────────────────────────────────────────────────────
      const designBuf = await this.fetch(designImageUrl);
      if (!designBuf) throw new Error('Could not fetch design image');

      // Resize design to W×W square
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
      const captionShort = caption.length > 130 ? caption.slice(0, 127) + '…' : caption;
      const ff = '"Noto", sans-serif';

      // ── Build satori element tree ─────────────────────────────────────────
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

            // ── TOP BAR ─────────────────────────────────────────────────────
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', alignItems: 'center',
                  height: TOP_H, padding: '0 18px',
                  borderBottom: '1px solid #1a1a1a',
                },
                children: [
                  // Avatar circle with gradient border
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
                  // Dots
                  {
                    type: 'div',
                    props: {
                      style: { color: '#888', fontSize: 28, letterSpacing: 4 },
                      children: '...',
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
                style: { display: 'flex' },
              },
            },

            // ── BOTTOM BAR ───────────────────────────────────────────────────
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', flexDirection: 'column',
                  flex: 1, padding: '16px 18px',
                  borderTop: '1px solid #1a1a1a',
                  gap: 12,
                },
                children: [

                  // Icons row
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: 22 },
                      children: [
                        this.icon('♡'),
                        this.icon('◻'),
                        this.icon('▷'),
                        { type: 'div', props: { style: { flex: 1 } } },
                        this.icon('⊡'),
                      ],
                    },
                  },

                  // Likes
                  {
                    type: 'div',
                    props: {
                      style: { color: '#ffffff', fontSize: 28, fontWeight: 700 },
                      children: '1,243 likes',
                    },
                  },

                  // Caption
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex', flexWrap: 'wrap',
                        fontSize: 26,
                        direction: rtl ? 'rtl' : 'ltr',
                        textAlign: rtl ? 'right' : 'left',
                        width: '100%',
                      },
                      children: [
                        {
                          type: 'span',
                          props: {
                            style: { color: '#ffffff', fontWeight: 700, marginRight: rtl ? 0 : 6, marginLeft: rtl ? 6 : 0 },
                            children: `@${handle}`,
                          },
                        },
                        {
                          type: 'span',
                          props: { style: { color: '#c8c8c8' }, children: ' ' + captionShort },
                        },
                      ],
                    },
                  },

                  // Timestamp
                  {
                    type: 'div',
                    props: { style: { color: '#666', fontSize: 22 }, children: '2 hours ago' },
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

  private icon(char: string): any {
    return {
      type: 'div',
      props: { style: { color: '#ffffff', fontSize: 32 }, children: char },
    };
  }

  private async fetch(url: string): Promise<Buffer | null> {
    try {
      const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 25_000 });
      return Buffer.from(r.data);
    } catch { return null; }
  }
}
