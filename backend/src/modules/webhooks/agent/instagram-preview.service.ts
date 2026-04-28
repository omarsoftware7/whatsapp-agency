import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import satori from 'satori';

const W      = 800;
const IMG_H  = 720;
const TOP_H  = 110;
const BTM_H  = 340;
const TOTAL_H = TOP_H + IMG_H + BTM_H;

// Each font MUST have a unique name — same name → satori picks only the first
// at that weight/style and never tries the others for missing glyphs.
function loadFonts() {
  const dir = path.join(__dirname, '..', '..', '..', 'fonts');
  return [
    { name: 'NotoArabic', data: fs.readFileSync(path.join(dir, 'NotoArabic-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
    { name: 'NotoHebrew', data: fs.readFileSync(path.join(dir, 'NotoHebrew-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
    { name: 'NotoSans',   data: fs.readFileSync(path.join(dir, 'NotoSans-Regular.ttf')),   weight: 400 as const, style: 'normal' as const },
  ].filter(f => f.data);
}

function hasArabic(t: string) { return /[\u0600-\u06FF]/.test(t); }
function hasHebrew(t: string) { return /[\u0590-\u05FF]/.test(t); }
function hasRTL(t: string)    { return hasArabic(t) || hasHebrew(t); }

function captionFontFamily(t: string) {
  if (hasArabic(t)) return '"NotoArabic", "NotoSans", sans-serif';
  if (hasHebrew(t)) return '"NotoHebrew", "NotoSans", sans-serif';
  return '"NotoSans", sans-serif';
}
const LATIN_FF = '"NotoSans", sans-serif';

async function toDataUri(buf: Buffer, mime = 'image/jpeg') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function svgIcon(d: string, size = 26): any {
  return {
    type: 'svg',
    props: {
      width: size, height: size, viewBox: '0 0 24 24',
      style: { display: 'flex', flexShrink: 0 },
      children: [{
        type: 'path',
        props: { d, fill: 'none', stroke: '#ffffff', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      }],
    },
  };
}

const ICON_HEART    = 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';
const ICON_COMMENT  = 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z';
const ICON_SEND     = 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z';
const ICON_BOOKMARK = 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z';

const AV = 54;   // outer avatar diameter
const AVI = 48;  // inner logo diameter (3px ring on each side)

@Injectable()
export class InstagramPreviewService {
  private readonly logger = new Logger(InstagramPreviewService.name);
  private fonts: ReturnType<typeof loadFonts> | null = null;

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

      const designResized = await sharp(designBuf)
        .resize(W, IMG_H, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toBuffer();
      const designUri = await toDataUri(designResized);

      let logoUri: string | null = null;
      if (logoUrl) {
        try {
          const logoBuf = await this.fetch(logoUrl);
          if (logoBuf) {
            // flatten() removes transparency → gradient ring won't bleed through
            const logoSmall = await sharp(logoBuf)
              .resize(AVI, AVI, { fit: 'cover' })
              .flatten({ background: '#000000' })
              .jpeg({ quality: 95 })
              .toBuffer();
            logoUri = await toDataUri(logoSmall, 'image/jpeg');
          }
        } catch { /* ignore */ }
      }

      const rtl        = hasRTL(caption);
      const captionFF  = captionFontFamily(caption);
      // Strip newlines to avoid satori rendering them as gaps; replace with space
      const captionClean = caption.replace(/\n+/g, ' ').trim();
      const captionShort = captionClean.length > 150 ? captionClean.slice(0, 147) + '…' : captionClean;

      const el: any = {
        type: 'div',
        props: {
          style: {
            display: 'flex', flexDirection: 'column',
            width: W, height: TOTAL_H,
            backgroundColor: '#000000',
            fontFamily: LATIN_FF,
          },
          children: [

            // ── TOP BAR ──────────────────────────────────────────────────────
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', alignItems: 'center',
                  height: TOP_H, padding: '0 20px',
                  borderBottom: '1px solid #1a1a1a',
                },
                children: [
                  // Avatar — gradient ring + logo (no transparency leak)
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: AV, height: AV, borderRadius: AV / 2,
                        background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#bc1888)',
                        padding: 3, marginRight: 14, flexShrink: 0,
                      },
                      children: [{
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex', width: AVI, height: AVI,
                            borderRadius: AVI / 2, overflow: 'hidden',
                            backgroundColor: '#000',
                          },
                          children: logoUri
                            ? [{ type: 'img', props: { src: logoUri, width: AVI, height: AVI } }]
                            : [],
                        },
                      }],
                    },
                  },
                  // @handle
                  {
                    type: 'div',
                    props: {
                      style: { flex: 1, color: '#ffffff', fontSize: 28, fontWeight: 700, fontFamily: LATIN_FF },
                      children: `@${handle}`,
                    },
                  },
                  // Three-dot menu
                  {
                    type: 'svg',
                    props: {
                      width: 24, height: 6, viewBox: '0 0 24 6', style: { display: 'flex' },
                      children: [
                        { type: 'circle', props: { cx: 2,  cy: 3, r: 2, fill: '#888' } },
                        { type: 'circle', props: { cx: 12, cy: 3, r: 2, fill: '#888' } },
                        { type: 'circle', props: { cx: 22, cy: 3, r: 2, fill: '#888' } },
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
                src: designUri, width: W, height: IMG_H,
                style: { display: 'flex', flexShrink: 0 },
              },
            },

            // ── BOTTOM BAR ───────────────────────────────────────────────────
            {
              type: 'div',
              props: {
                style: {
                  display: 'flex', flexDirection: 'column',
                  padding: '18px 20px 14px',
                  borderTop: '1px solid #1a1a1a',
                  gap: 10,
                },
                children: [

                  // Action icons
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: 18 },
                      children: [
                        svgIcon(ICON_HEART), svgIcon(ICON_COMMENT), svgIcon(ICON_SEND),
                        { type: 'div', props: { style: { flex: 1 } } },
                        svgIcon(ICON_BOOKMARK),
                      ],
                    },
                  },

                  // Likes
                  {
                    type: 'div',
                    props: {
                      style: { color: '#ffffff', fontSize: 24, fontWeight: 700, fontFamily: LATIN_FF },
                      children: '1,243 likes',
                    },
                  },

                  // Caption block — two sub-rows stacked, aligned to the reading edge
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex', flexDirection: 'column',
                        alignItems: rtl ? 'flex-end' : 'flex-start',
                        width: '100%', gap: 2,
                      },
                      children: [
                        // Bold @handle on its own line
                        {
                          type: 'div',
                          props: {
                            style: {
                              color: '#ffffff', fontWeight: 700,
                              fontSize: 23, fontFamily: LATIN_FF,
                            },
                            children: `@${handle}`,
                          },
                        },
                        // Caption text — direction controls HarfBuzz shaping + wrapping
                        {
                          type: 'div',
                          props: {
                            style: {
                              color: '#c8c8c8', fontSize: 23,
                              fontFamily: captionFF,
                              direction: rtl ? 'rtl' : 'ltr',
                              textAlign: rtl ? 'right' : 'left',
                              width: '100%',
                            },
                            children: captionShort,
                          },
                        },
                      ],
                    },
                  },

                  // Timestamp
                  {
                    type: 'div',
                    props: {
                      style: { color: '#555', fontSize: 19, fontFamily: LATIN_FF },
                      children: '2 HOURS AGO',
                    },
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
