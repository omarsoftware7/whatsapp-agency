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

// NotoArabic and NotoHebrew are listed first so satori resolves RTL glyphs
// before falling back to NotoSans for Latin/numbers.
// Each font MUST have a unique name — if they share a name satori only uses
// the first one it loaded for that weight/style and never checks the others.
function loadFonts() {
  const dir = path.join(__dirname, '..', '..', '..', 'fonts');
  return [
    { name: 'NotoArabic', data: fs.readFileSync(path.join(dir, 'NotoArabic-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
    { name: 'NotoHebrew', data: fs.readFileSync(path.join(dir, 'NotoHebrew-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
    { name: 'NotoSans',   data: fs.readFileSync(path.join(dir, 'NotoSans-Regular.ttf')),   weight: 400 as const, style: 'normal' as const },
  ].filter(f => f.data);
}

function hasArabic(text: string)  { return /[\u0600-\u06FF]/.test(text); }
function hasHebrew(text: string)  { return /[\u0590-\u05FF]/.test(text); }
function hasRTL(text: string)     { return hasArabic(text) || hasHebrew(text); }

// Satori resolves font-family as a CSS fallback list.
// Put the RTL font first so Arabic/Hebrew glyphs are found immediately;
// NotoSans covers Latin/digits in both directions.
function fontFamily(text: string) {
  if (hasArabic(text)) return '"NotoArabic", "NotoSans", sans-serif';
  if (hasHebrew(text)) return '"NotoHebrew", "NotoSans", sans-serif';
  return '"NotoSans", sans-serif';
}

async function toDataUri(buf: Buffer, mime = 'image/jpeg') {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function svgIcon(d: string, size = 26): any {
  return {
    type: 'svg',
    props: {
      width: size, height: size,
      viewBox: '0 0 24 24',
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

const AVATAR_SIZE  = 56;
const AVATAR_INNER = 50;
const AVATAR_R     = AVATAR_SIZE / 2;
const INNER_R      = AVATAR_INNER / 2;

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

      const designResized = await sharp(designBuf).resize(W, IMG_H, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
      const designUri = await toDataUri(designResized);

      let logoUri: string | null = null;
      if (logoUrl) {
        try {
          const logoBuf = await this.fetch(logoUrl);
          if (logoBuf) {
            const logoSmall = await sharp(logoBuf)
              .resize(AVATAR_INNER, AVATAR_INNER, { fit: 'cover' })
              .png()
              .toBuffer();
            logoUri = await toDataUri(logoSmall, 'image/png');
          }
        } catch { /* ignore */ }
      }

      const rtl = hasRTL(caption);
      const captionShort = caption.length > 140 ? caption.slice(0, 137) + '…' : caption;
      const captionFF = fontFamily(caption);
      const latinFF = '"NotoSans", sans-serif';

      const el: any = {
        type: 'div',
        props: {
          style: {
            display: 'flex', flexDirection: 'column',
            width: W, height: TOTAL_H,
            backgroundColor: '#000000',
            fontFamily: latinFF,
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
                  // Avatar with Instagram gradient ring
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_R,
                        background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #bc1888)',
                        padding: 2, marginRight: 12, flexShrink: 0,
                      },
                      children: [{
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex', width: AVATAR_INNER, height: AVATAR_INNER,
                            borderRadius: INNER_R, overflow: 'hidden',
                            backgroundColor: '#111',
                          },
                          children: logoUri ? [{
                            type: 'img',
                            props: { src: logoUri, width: AVATAR_INNER, height: AVATAR_INNER },
                          }] : [],
                        },
                      }],
                    },
                  },
                  // Handle (always Latin font)
                  {
                    type: 'div',
                    props: {
                      style: { flex: 1, color: '#ffffff', fontSize: 28, fontWeight: 700, fontFamily: latinFF },
                      children: `@${handle}`,
                    },
                  },
                  // Three-dot menu
                  {
                    type: 'svg',
                    props: {
                      width: 24, height: 6, viewBox: '0 0 24 6',
                      style: { display: 'flex' },
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
                  padding: '18px 20px 14px',
                  borderTop: '1px solid #1a1a1a',
                  gap: 10,
                },
                children: [

                  // Action icons row
                  {
                    type: 'div',
                    props: {
                      style: { display: 'flex', alignItems: 'center', gap: 18 },
                      children: [
                        svgIcon(ICON_HEART),
                        svgIcon(ICON_COMMENT),
                        svgIcon(ICON_SEND),
                        { type: 'div', props: { style: { flex: 1 } } },
                        svgIcon(ICON_BOOKMARK),
                      ],
                    },
                  },

                  // Likes count
                  {
                    type: 'div',
                    props: {
                      style: { color: '#ffffff', fontSize: 24, fontWeight: 700, fontFamily: latinFF },
                      children: '1,243 likes',
                    },
                  },

                  // Caption — handle bold + caption text, script-aware font
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        flexDirection: rtl ? 'row-reverse' : 'row',
                        flexWrap: 'wrap',
                        fontSize: 23,
                        lineHeight: 1.5,
                        fontFamily: captionFF,
                        direction: rtl ? 'rtl' : 'ltr',
                        width: '100%',
                      },
                      children: [
                        {
                          type: 'span',
                          props: {
                            style: {
                              color: '#ffffff', fontWeight: 700,
                              fontFamily: latinFF,
                              marginLeft: rtl ? 8 : 0,
                              marginRight: rtl ? 0 : 8,
                            },
                            children: `@${handle}`,
                          },
                        },
                        {
                          type: 'span',
                          props: {
                            style: { color: '#c8c8c8', fontFamily: captionFF },
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
                      style: { color: '#555', fontSize: 19, fontFamily: latinFF },
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
