import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type IntentType =
  | 'APPROVE'
  | 'REJECT'
  | 'MENU_CHOICE'
  | 'CONTENT'
  | 'COMMAND_ABORT'
  | 'COMMAND_NEW'
  | 'COMMAND_FORGET'
  | 'UNSUPPORTED_MEDIA'
  | 'UNKNOWN';

export interface IntentResult {
  intent: IntentType;
  menuChoice: string | null;
  confidence: number;
}

// Arabic-Indic numerals map
const ARABIC_INDIC: Record<string, string> = {
  '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6',
};

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);

  constructor(private readonly config: ConfigService) {}

  async classify(
    text: string,
    messageType: string,
    stage: string,
  ): Promise<IntentResult> {
    // Non-text/non-image messages → unsupported
    if (
      ['audio', 'video', 'sticker', 'document', 'location', 'contacts', 'reaction', 'order'].includes(
        messageType,
      )
    ) {
      return { intent: 'UNSUPPORTED_MEDIA', menuChoice: null, confidence: 1.0 };
    }

    if (!text?.trim()) {
      return { intent: 'UNKNOWN', menuChoice: null, confidence: 0 };
    }

    const t = text.trim();

    // ── Exact commands (fast path, no AI needed) ─────────────────────────────
    if (t === 'abort#' || t === 'ABORT#') return { intent: 'COMMAND_ABORT', menuChoice: null, confidence: 1.0 };
    if (t === '/new' || t === '/NEW') return { intent: 'COMMAND_NEW', menuChoice: null, confidence: 1.0 };
    if (t === 'forget#' || t === 'FORGET#') return { intent: 'COMMAND_FORGET', menuChoice: null, confidence: 1.0 };

    // ── Menu choice: single digit 1-6 in any numeral system ──────────────────
    const singleDigit = ARABIC_INDIC[t] ?? ((/^[1-6]$/.test(t)) ? t : null);
    if (singleDigit) {
      return { intent: 'MENU_CHOICE', menuChoice: singleDigit, confidence: 1.0 };
    }

    // ── AI classification via Gemini ─────────────────────────────────────────
    try {
      return await this.classifyWithGemini(t, messageType, stage);
    } catch (err) {
      this.logger.warn(`Gemini intent failed (${err.message}), using keyword fallback`);
      return this.keywordFallback(t, stage);
    }
  }

  private async classifyWithGemini(
    text: string,
    messageType: string,
    stage: string,
  ): Promise<IntentResult> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const prompt = `You are an intent classifier for a WhatsApp marketing chatbot.

Stage the user is currently at: "${stage}"
Message type: "${messageType}"
User message: "${text}"

Classify the intent as ONE of:
- APPROVE — user agrees/approves in ANY language or form, including:
    typos (نعمم→نعم, okk, yeaah), colloquial (يلا, يلاه, سبسب, بتجنن, عظيم, ممتاز, تمام تمام),
    Hebrew (כן, אוקי, בסדר, סבבה, נהדר, מעולה, יאללה), English (yes, sure, yep, agreed, perfect, great, 👍, ✅, ❤️, 🔥)
- REJECT — user says no or wants changes: no, لا, لأ, לא, change, غير, بدل, مش حلو, مش, try again, حاول تاني, شيء ثاني
- MENU_CHOICE — user picks a numbered option; extract the digit (1-6, including Arabic-Indic ١-٦)
- CONTENT — user provides creative brief, product description, or any informational text
- COMMAND_ABORT — user wants to cancel current task (abort#, إلغاء, cancel)
- COMMAND_NEW — user wants to start fresh (/new, جديد, חדש, restart)
- COMMAND_FORGET — user wants to reset their profile (forget#)
- UNKNOWN — cannot determine intent

Respond with ONLY valid JSON, no markdown:
{"intent":"APPROVE","menu_choice":null,"confidence":0.95}`;

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 80 },
      },
      { timeout: 8000 },
    );

    const raw: string =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      intent: (parsed.intent as IntentType) ?? 'UNKNOWN',
      menuChoice: parsed.menu_choice ?? null,
      confidence: parsed.confidence ?? 0.8,
    };
  }

  // ── Keyword fallback (no Gemini) ────────────────────────────────────────────
  private keywordFallback(text: string, _stage: string): IntentResult {
    const t = text.toLowerCase().trim();

    const APPROVE = [
      'yes', 'y', 'yep', 'yeah', 'ok', 'okay', 'sure', 'great', 'perfect', 'approve',
      'approved', 'agreed', 'correct', 'good', 'looks good', 'love it', 'amazing',
      // Arabic
      'نعم', 'نعمم', 'اوكي', 'أوكي', 'موافق', 'تمام', 'حسنا', 'حسناً', 'طيب', 'بالتأكيد',
      'ممتاز', 'رائع', 'عظيم', 'يلا', 'يلاه', 'صح', 'صحيح',
      // Hebrew
      'כן', 'בסדר', 'אוקי', 'סבבה', 'נהדר', 'מעולה', 'יאללה', 'נכון',
    ];
    const REJECT = [
      'no', 'nope', 'nah', 'reject', 'change', 'different', 'again', 'redo',
      'لا', 'لأ', 'لا يعجبني', 'غير', 'بدل', 'مش', 'مش حلو', 'حاول', 'تاني',
      'לא', 'שנה', 'אחר', 'שוב',
    ];

    if (APPROVE.some((k) => t.includes(k))) return { intent: 'APPROVE', menuChoice: null, confidence: 0.75 };
    if (REJECT.some((k) => t.includes(k))) return { intent: 'REJECT', menuChoice: null, confidence: 0.75 };

    // Check for leading digit
    const digitMatch = t.match(/^([1-6])/);
    if (digitMatch) return { intent: 'MENU_CHOICE', menuChoice: digitMatch[1], confidence: 0.85 };

    // Long text → assume content
    if (t.length > 10) return { intent: 'CONTENT', menuChoice: null, confidence: 0.6 };

    return { intent: 'UNKNOWN', menuChoice: null, confidence: 0 };
  }
}
