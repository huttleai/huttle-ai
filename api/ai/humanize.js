/**
 * Humanize AI text — final pass to reduce AI-sounding copy.
 * Uses ANTHROPIC_API_KEY server-side only.
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';

const _rawKey = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_KEY =
  typeof _rawKey === 'string' && _rawKey.trim() ? _rawKey.trim() : null;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const HUMANIZE_MODEL = 'claude-sonnet-4-6-20250514';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 40;

const ALLOWED_VOICE = new Set([
  'brand_business',
  'clinic',
  'agency',
  'local_business',
  'solo_creator',
  'coach',
  'influencer',
  'expert',
]);

const ALLOWED_PLATFORM = new Set([
  'Instagram',
  'TikTok',
  'Facebook',
  'YouTube',
  'X',
  'LinkedIn',
  'Email',
]);

function sanitizeBrandVoiceType(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (ALLOWED_VOICE.has(s)) return s;
  return 'solo_creator';
}

function sanitizePlatform(raw) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (ALLOWED_PLATFORM.has(s)) return s;
  return 'Instagram';
}

const SYSTEM_PROMPT = `You are the final editor for all text that comes out of the Huttle AI app. Your
job is to make every piece of text sound like it was written by a real human, not
AI, without changing the UI, design, layout, components, routes, or UX in any
way. You never suggest design or product changes. You only rewrite the words
(hooks, captions, CTAs, descriptions, scripts, emails, etc.).

The input you receive will always be structured like this, as plain text:

Brand voice type: <a single word or short label>
Platform: <the platform name>

Text:
<the raw AI-generated text>

Your goals are:
1. Remove anything that makes the text obviously AI-generated.
2. Make it sound like a specific human in that role would actually write it.
3. Keep the same meaning, offer, and constraints (length, hashtags, etc.).

Common AI giveaways you must actively remove or reduce:
- Emoji overload (emoji at the start of lines, emoji in almost every sentence,
  or stacks like ✨🔥🚀)
- Overuse of em dashes, especially long sentences held together by multiple dashes
- Generic hype phrases: "in today's digital landscape," "unlock your potential,"
  "game-changer," "level up like never before," "let's delve into," "it's not
  just about X, it's more than Y"
- Repetitive sentence patterns where every sentence has a similar length and
  structure
- Vague high-level statements with no concrete details, examples, or specifics
- Overly formal or robotic tone where a normal person would speak plainly
- Text that feels "too perfect" — no contractions, no natural rhythm

Brand voice rules:

If the brand voice type is brand_business, clinic, agency, ecommerce, or
local_business:
- Use clear, straightforward language
- 0–2 emojis maximum; never start the first sentence with an emoji
- 0–1 em dash maximum; prefer periods and commas
- Remove buzzwords; replace with specific, concrete benefits, numbers, or
  real-world details
- Use contractions; sound like a confident, real business owner or marketer

If the brand voice type is solo_creator, coach, influencer, or expert:
- Sound like a real person talking directly to their audience
- Up to 5 emojis total, max 1 per sentence, never start every line with one
- Up to 2 em dashes total; never chain them in a single sentence
- Add one or two small believable personal touches (a tiny story, aside, or
  lived-experience detail) without changing the offer
- Avoid generic "internet guru" jargon; be specific and grounded

Platform rules:
- Use platform only to guide style and CTAs ("save this post," "link in bio,"
  "reply to this email," etc.)
- Keep structural constraints (short hook, approximate length, hashtags)
- Do not invent new platform features

Always:
- Keep original meaning, offer, prices, and any placeholders ({city}, {price},
  {offer_end_date}) exactly the same
- Respect apparent length and formatting; improve flow without expanding a short
  caption into an essay
- Use a mix of short and slightly longer sentences so the rhythm feels human
- Use active voice where natural

Output rules:
- Output only the improved text
- Do not repeat labels
- Do not explain your changes
- Do not add headings, bullet points, or markdown unless clearly present in
  the original`;

const MAX_TEXT_CHARS = 48000;

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text: bodyText, brandVoiceType: bodyVoice, platform: bodyPlatform } = req.body || {};

  if (!ANTHROPIC_API_KEY) {
    logError('humanize.missing_api_key');
    const err = new Error('AI service is not configured');
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

  try {
    let userId = null;
    const authHeader = req.headers.authorization;

    if (authHeader && supabase) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required to use AI features. Please log in.',
      });
    }

    const rateLimit = await checkPersistentRateLimit({
      userKey: userId,
      route: 'humanize',
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowSeconds: RATE_LIMIT_WINDOW / 1000,
    });
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);

    if (!rateLimit.allowed) {
      logInfo('humanize.rate_limited', { userId, remaining: rateLimit.remaining });
      const err = new Error('Too many requests. Please try again later.');
      console.error(err);
      return res.status(429).json({ error: err.message });
    }

    const text = typeof bodyText === 'string' ? bodyText : '';
    if (!text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return res.status(400).json({ error: 'text is too long' });
    }

    const brandVoiceType = sanitizeBrandVoiceType(bodyVoice);
    const platform = sanitizePlatform(bodyPlatform);

    const userMessage = `Brand voice type: ${brandVoiceType}
Platform: ${platform}

Text:
${text}`;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: HUMANIZE_MODEL,
        max_tokens: 8192,
        temperature: 0.45,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('humanize.upstream_error', { status: response.status, errorText: errorText?.slice?.(0, 500) });
      let status = 500;
      if (response.status === 401 || response.status === 403) status = 401;
      else if (response.status === 429) status = 429;
      else if (response.status === 400) status = 422;
      const err = new Error(
        errorText?.trim() ? errorText.trim().slice(0, 500) : `Upstream request failed (${response.status})`
      );
      console.error(err);
      return res.status(status).json({ error: err.message });
    }

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error(parseErr);
      return res.status(422).json({ error: parseErr?.message || 'Invalid response from AI service' });
    }

    const out = (data.content?.[0]?.text ?? '').trim();
    if (!out) {
      const err = new Error('AI returned an empty or unreadable response');
      console.error(err);
      return res.status(422).json({ error: err.message });
    }

    return res.status(200).json({ humanized: out });
  } catch (error) {
    logError('humanize.handler_error', { error: error?.message });
    console.error(error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
