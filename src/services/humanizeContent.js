import { supabase } from '../config/supabase';

const HUMANIZE_URL = '/api/ai/humanize';
/** Allow long scripts; keep below serverless maxDuration and Anthropic latency. */
const DEFAULT_TIMEOUT_MS = 55000;
const HUMANIZE_MAX_CHARS = 48000;

const VOICE_MAP = {
  professional: 'brand_business',
  friendly: 'solo_creator',
  bold: 'influencer',
  educational: 'expert',
  casual: 'solo_creator',
  luxurious: 'clinic',
  engaging: 'solo_creator',
  funny: 'solo_creator',
  inspirational: 'solo_creator',
};

const PLATFORM_MAP = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  twitter: 'X',
  x: 'X',
  email: 'Email',
};

/**
 * Maps saved brand voice / tone labels to humanize API `brandVoiceType`.
 * @param {string|null|undefined} voice
 * @returns {string}
 */
export function mapBrandVoiceToHumanizeType(voice) {
  const key = String(voice || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!key) return 'solo_creator';
  if (VOICE_MAP[key]) return VOICE_MAP[key];
  const first = key.split('_')[0];
  if (VOICE_MAP[first]) return VOICE_MAP[first];
  return 'solo_creator';
}

/**
 * Maps internal platform ids (e.g. instagram) to API platform labels.
 * @param {string|null|undefined} platform
 * @returns {string}
 */
export function normalizeHumanizePlatform(platform) {
  const raw = String(platform || '').trim();
  if (!raw) return 'Instagram';
  const key = raw.toLowerCase();
  if (PLATFORM_MAP[key]) return PLATFORM_MAP[key];
  const titled = raw.charAt(0).toUpperCase() + raw.slice(1);
  const allowed = new Set(['Instagram', 'TikTok', 'Facebook', 'YouTube', 'X', 'Email']);
  if (allowed.has(titled)) return titled;
  if (titled === 'Twitter') return 'X';
  return 'Instagram';
}

/**
 * Client-side guardrails before calling `/api/ai/humanize`.
 * @param {{ text: unknown, brandVoiceType?: string, platform?: string }} args
 * @returns {{ ok: true, payload: { text: string, brandVoiceType: string, platform: string } } | { ok: false, reason: string }}
 */
export function validateHumanizeRequest({ text, brandVoiceType, platform }) {
  const t = typeof text === 'string' ? text : String(text ?? '');
  if (!t.trim()) return { ok: false, reason: 'empty_text' };
  if (t.length > HUMANIZE_MAX_CHARS) return { ok: false, reason: 'text_too_long' };
  const voice =
    typeof brandVoiceType === 'string' && brandVoiceType.trim()
      ? brandVoiceType.trim()
      : 'solo_creator';
  return {
    ok: true,
    payload: {
      text: t,
      brandVoiceType: voice,
      platform: normalizeHumanizePlatform(platform),
    },
  };
}

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    /* request may 401; caller keeps original text */
  }
  return headers;
}

/**
 * Calls humanize API; on any failure returns original text (generation flow must not break).
 * Logs concise warnings for non-OK responses.
 *
 * @param {{ text: string, brandVoiceType: string, platform: string }} payload
 * @param {number} [timeoutMs]
 * @returns {Promise<string>}
 */
export async function humanizeContentOrOriginal(payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { text: t, brandVoiceType, platform } = payload;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const outbound = { textLen: t.length, platform, brandVoiceType };
  try {
    console.log('[humanizeContent] outbound', outbound);
    const headers = await getAuthHeaders();
    const res = await fetch(HUMANIZE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: t,
        brandVoiceType,
        platform,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errBody = await res.json();
        detail = typeof errBody?.error === 'string' ? errBody.error : '';
      } catch {
        try {
          detail = (await res.text()).slice(0, 200);
        } catch {
          detail = '';
        }
      }
      console.warn('[humanizeContent] humanize failed, using original', {
        status: res.status,
        detail: detail || res.statusText,
      });
      return t;
    }

    const data = await res.json().catch(() => ({}));
    const out = typeof data.humanized === 'string' ? data.humanized : t;
    const next = out.trim() ? out : t;
    if (next !== t) {
      console.log('[humanizeContent] success', { ...outbound, outLen: next.length });
    }
    return next;
  } catch (e) {
    const name = e?.name || 'Error';
    const message = e?.message || String(e);
    console.warn('[humanizeContent] humanize error, using original', { name, message });
    return t;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{ text: string, brandVoiceType: string, platform: string, timeoutMs?: number }} args
 * @returns {Promise<string>}
 */
async function humanizeContent(args) {
  const checked = validateHumanizeRequest(args);
  if (!checked.ok) {
    const raw = typeof args.text === 'string' ? args.text : String(args.text ?? '');
    if (checked.reason === 'text_too_long') {
      console.warn('[humanizeContent] text exceeds max length, returning original');
    }
    return raw;
  }
  return humanizeContentOrOriginal(checked.payload, args.timeoutMs);
}

export default humanizeContent;
