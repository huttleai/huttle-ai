import { supabase } from '../config/supabase';

const HUMANIZE_URL = '/api/ai/humanize';
const DEFAULT_TIMEOUT_MS = 8000;

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
  linkedin: 'LinkedIn',
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
  const allowed = new Set(['Instagram', 'TikTok', 'Facebook', 'YouTube', 'X', 'LinkedIn', 'Email']);
  if (allowed.has(titled)) return titled;
  if (titled === 'Twitter') return 'X';
  return 'Instagram';
}

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    /* fail silently; request may 401 and we return original text */
  }
  return headers;
}

/**
 * @param {{ text: string, brandVoiceType: string, platform: string, timeoutMs?: number }} args
 * @returns {Promise<string>}
 */
async function humanizeContent({ text, brandVoiceType, platform, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const t = typeof text === 'string' ? text : String(text ?? '');
  if (!t.trim()) return t;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
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

    if (!res.ok) return t;

    const data = await res.json().catch(() => ({}));
    const out = typeof data.humanized === 'string' ? data.humanized : t;
    return out.trim() ? out : t;
  } catch {
    return t;
  } finally {
    clearTimeout(timer);
  }
}

export default humanizeContent;
