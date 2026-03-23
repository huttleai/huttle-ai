/**
 * Grok API Service (xAI Grok 4 Fast)
 * 
 * Used for:
 * - Creative remixes and idea sparks
 * - Narrative insights and content generation
 * - Dynamic suggestions for posts
 * - Qualitative scoring and content quality analysis
 * 
 * All functions now use centralized brand context for consistent brand alignment
 * Platform-specific guidelines are injected for optimized content per platform
 * 
 * SECURITY: All API calls now go through the server-side proxy to protect API keys
 * 
 * DEMO MODE: When VITE_DEMO_MODE=true or API fails, returns fitness-themed mock data
 */

import { callClaudeAPI } from './claudeAPI';
import {
  getRealtimeHashtagResearch,
  getRealtimeCaptionPatterns,
  getRealtimeHookPatterns,
  getRealtimeCTAPatterns,
  getRealtimeVisualPatterns,
} from './perplexityAPI';
import { algorithmSignals } from '../data/algorithmSignals';
import {
  buildSystemPrompt,
  getNiche,
  getTargetAudience,
  buildBrandContext,
  buildPromptBrandSection,
  getPromptBrandProfile
} from '../utils/brandContextBuilder';
import { buildBrandContext as buildCreatorBrandBlock } from '../utils/buildBrandContext'; // HUTTLE AI: brand context injected
import { buildPlatformContext, getPlatform, getHashtagGuidelines, getHookGuidelines, getCTAGuidelines } from '../utils/platformGuidelines';
import { supabase } from '../config/supabase';
import { parseFullPostHookList } from '../utils/fullPostHooksParser';
import { 
  isDemoMode, 
  simulateDelay, 
  getCaptionMocks, 
  getHashtagMocks, 
  getHookMocks, 
  getCTAMocks, 
  getContentScoreMock,
  getVisualIdeaMocks 
} from '../data/demo/demoMockData';

// SECURITY: Use server-side proxy instead of exposing API key in client
const GROK_PROXY_URL = '/api/ai/grok';
const HOOK_TYPE_ALIASES = {
  question: 'Question',
  teaser: 'Teaser',
  shocking_stat: 'Shocking Stat',
  story: 'Story',
  bold_claim: 'Bold Claim',
};

/** Normalize UI labels ("Shocking Stat") and slug keys ("shocking_stat") to canonical hook type labels. */
function normalizeFullPostHookTypeLabel(hookType) {
  if (hookType == null || hookType === '') return 'Question';
  if (typeof hookType !== 'string') return 'Question';
  const trimmed = hookType.trim();
  if (!trimmed) return 'Question';
  const key = trimmed.toLowerCase().replace(/\s+/g, '_');
  return HOOK_TYPE_ALIASES[key] || trimmed;
}
const NO_FABRICATED_STATS_GUARDRAIL = 'Do not invent specific statistics or percentages. If referencing data, use general language like "studies show" or "research suggests" rather than fabricating specific numbers like "73% of users".';
const NO_PLACEHOLDER_GUARDRAIL = 'Never include placeholder text like [Your Name], [Insert Link], or [Add Emoji Here] in your output. Either fill it in with a reasonable example or omit it.';
const READY_TO_USE_GUARDRAIL = 'Your output must be copy-paste ready. A user should be able to take your output directly to their social media app and post it without any editing required.';

function buildPromptGuardrails({ includeStats = false, readyToUse = false } = {}) {
  return [
    includeStats ? NO_FABRICATED_STATS_GUARDRAIL : null,
    NO_PLACEHOLDER_GUARDRAIL,
    readyToUse ? READY_TO_USE_GUARDRAIL : null,
  ].filter(Boolean).join('\n');
}

// HUTTLE AI: brand context injected — prepend creator brand profile to any system prompt
function buildSystemPromptWithBrandBlock(basePrompt, brandData) {
  const brandBlock = buildCreatorBrandBlock(brandData, brandData);
  const fullPrompt = buildSystemPrompt(basePrompt, brandData);
  return brandBlock ? `${brandBlock}\n${fullPrompt}` : fullPrompt;
}

const AI_POWER_BRAIN_BASE = `You are Huttle AI's AI Power Brain: a cross-platform social growth strategist,
copy chief, and creative director for short-form and feed content.

You deeply understand:
- Instagram, TikTok, YouTube, and X algorithms and content norms.
- Brand voice, ideal customers, and offers.
- Conversion psychology, storytelling frameworks, and retention patterns.

You generate outputs that are specific, non-generic, and performance-oriented.
You always follow the exact output format and JSON schemas specified in the
user message. You prefer concrete, testable ideas over vague advice.`;

const AI_POWER_TOOL_SPECIALIZATIONS = {
  captions:
    'You are acting as a senior performance copywriter for social captions. Optimize for scroll-stopping hooks, clarity, saving/sharing behavior, and platform-appropriate structure.',
  hooks:
    'You are acting as a viral hook engineer. Optimize for first-3-seconds retention and thumb-stopping curiosity tailored to the chosen format.',
  ctas:
    'You are acting as a conversion strategist. Design clear, low-friction CTAs that match the user\'s goal, audience, and platform culture.',
  scorer:
    'You are acting as a ruthless content editor and performance rater. Score content 0–100 and propose specific, high-impact rewrites.',
  visuals:
    'You are acting as a social-first creative director and storyboard artist. Design visuals that communicate the message instantly in the feed.',
  hashtags:
    'You are acting as a hashtag strategist and growth researcher. Tier hashtags by competition and realistic discoverability.',
};

/**
 * Shared system prompt for AI Power Tools (Captions, Hooks, CTAs, Scorer, Visuals, Hashtags).
 * @param {'captions'|'hooks'|'ctas'|'scorer'|'visuals'|'hashtags'} tool
 */
function buildAIPowerBrainSystemPrompt(tool, brandData, extraRules = '') {
  const spec = AI_POWER_TOOL_SPECIALIZATIONS[tool] || '';
  const composed = [AI_POWER_BRAIN_BASE, spec, extraRules].filter(Boolean).join('\n\n');
  return buildSystemPromptWithBrandBlock(composed.trim(), brandData);
}

function formatAlgorithmSignalsForScorer(platform) {
  let key = String(platform || 'instagram').toLowerCase();
  if (key === 'x') key = 'twitter';
  const pack = algorithmSignals[key] || algorithmSignals.instagram;
  if (!pack?.signals?.length) return '';
  return pack.signals
    .map((s) => `- (${s.weight}% signal weight) ${s.label}`)
    .join('\n');
}

function clampScore(n, lo = 0, hi = 100) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(x)));
}

function captionsFromVariantArray(raw, isSingle) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const cleaned = raw
    .map((v, idx) => {
      const caption = String(v?.caption || '').trim();
      if (!caption) return null;
      return {
        variantId: Number(v?.variantId) || idx + 1,
        length: v?.length || 'medium',
        toneSummary: String(v?.toneSummary || '').trim(),
        caption,
        primaryAngle: String(v?.primaryAngle || '').trim(),
        recommendedCTAType: v?.recommendedCTAType || 'engagement',
        notes: String(v?.notes || '').trim(),
      };
    })
    .filter(Boolean);
  if (cleaned.length === 0) return null;
  const limited = isSingle ? cleaned.slice(0, 1) : cleaned.slice(0, 5);
  const captionText = limited
    .map((v, i) => `${i + 1}. ${v.caption}`)
    .join('\n\n');
  return { captionVariants: limited, captionText };
}

function hooksFromHookIdeasArray(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const lines = raw
    .map((h, i) => {
      const hook = String(h?.hook || '').trim();
      if (!hook) return null;
      return `${i + 1}. ${hook}`;
    })
    .filter(Boolean);
  return lines.length ? lines.join('\n') : null;
}

const CTA_STYLE_BUCKETS = ['Soft', 'Engagement', 'Traffic', 'Lead', 'Direct'];

function mapCtaIdeaToStyledRow(item, index) {
  if (item?.cta && item?.style && item?.tip != null && item?.goal == null && item?.placement == null) {
    return {
      style: String(item.style),
      cta: String(item.cta).trim(),
      tip: String(item.tip || '').trim(),
    };
  }
  const cta = String(item?.cta || '').trim();
  if (!cta) return null;
  const goal = String(item?.goal || 'engagement');
  const placement = String(item?.placement || 'caption_end');
  const notes = String(item?.notes || '').trim();
  const mechanic = String(item?.mechanic || '').trim();
  const friction = String(item?.friction || '').trim();
  let style = CTA_STYLE_BUCKETS[index % CTA_STYLE_BUCKETS.length];
  if (goal === 'sales') style = 'Direct';
  else if (goal === 'dms_leads') style = 'Lead';
  else if (goal === 'engagement') style = placement.includes('screen') ? 'Traffic' : 'Engagement';
  const tip = [notes, mechanic && `Mechanic: ${mechanic}`, friction && `Friction: ${friction}`, `Placement: ${placement}`]
    .filter(Boolean)
    .join(' · ');
  return { style, cta, tip: tip || notes };
}

function normalizeStyledCtasPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const list = Array.isArray(parsed.ctas) ? parsed.ctas : Array.isArray(parsed) ? parsed : null;
  if (!list) return null;
  if (list[0]?.style && list[0]?.cta && list[0]?.goal == null) {
    return {
      ctas: list.map((row) => ({
        style: String(row.style || 'Soft'),
        cta: String(row.cta || '').trim(),
        tip: String(row.tip || '').trim(),
      })).filter((r) => r.cta),
      platformTip: String(parsed.platformTip || '').trim(),
    };
  }
  const rows = list.map((item, i) => mapCtaIdeaToStyledRow(item, i)).filter(Boolean);
  if (rows.length === 0) return null;
  return {
    ctas: rows,
    platformTip: String(parsed.platformTip || '').trim(),
  };
}

function normalizeContentScoreV2(parsed) {
  if (!parsed || typeof parsed !== 'object' || parsed.overallScore == null) return null;

  const fixes = Array.isArray(parsed.fixes) ? parsed.fixes : [];
  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
  const risks = Array.isArray(parsed.risks) ? parsed.risks : [];

  const suggestions = [
    ...strengths.slice(0, 2).map((s) => `Strength: ${s}`),
    ...risks.slice(0, 3).map((r) => `Risk: ${r}`),
    ...fixes.slice(0, 4).map((f) => `${f.area}: ${f.issue} → ${f.suggestedRewrite} (${f.impact || 'performance'})`),
  ].filter(Boolean).slice(0, 7);

  const firstFix = fixes[0];
  const rewriteExample = firstFix?.suggestedRewrite || '';

  const hookScore = clampScore(parsed.hookScore);
  const clarityScore = clampScore(parsed.clarityScore);
  const valueScore = clampScore(parsed.valueScore);
  const algoScore = clampScore(parsed.algorithmAlignmentScore);
  const humanScore = clampScore(parsed.humanizerScore);

  return {
    overall: clampScore(parsed.overallScore),
    breakdown: {
      hookStrength: hookScore,
      audienceRelevance: valueScore,
      clarityOfMessage: clarityScore,
      callToAction: clampScore(Math.round((valueScore + clarityScore + hookScore) / 3)),
      platformFit: algoScore,
    },
    suggestions: suggestions.length ? suggestions : ['Tighten the hook, clarify the payoff, and end with one specific next step.'],
    rewriteExample,
    weakestSection: firstFix
      ? { name: firstFix.area, rewriteExample, section: firstFix.area }
      : null,
    raw: parsed,
    humanizerScore: humanScore,
  };
}

function shootGuideFromVisualConcepts(concepts, topic, platformLabel, contentFormat) {
  const list = Array.isArray(concepts) ? concepts : [];
  const beats = list.flatMap((c) => (Array.isArray(c?.sceneBeats) ? c.sceneBeats : []).map((b) => String(b || '').trim()).filter(Boolean));
  const motifs = [...new Set(list.flatMap((c) => (Array.isArray(c?.visualMotifs) ? c.visualMotifs : []).map((m) => String(m || '').trim()).filter(Boolean)))];
  const prompts = list.map((c) => String(c?.promptOrGuide || '').trim()).filter(Boolean);

  const shotList =
    beats.length >= 4
      ? beats.slice(0, 8)
      : [
          ...beats,
          ...prompts.slice(0, Math.max(0, 4 - beats.length)).map((p, i) => `Beat ${i + 1}: ${p}`),
        ].slice(0, 8);

  const primary = list[0] || {};
  const secondary = list[1] || primary;
  return {
    shotList: shotList.length ? shotList : [`Establishing frame for ${topic}`, `Detail or proof moment`, `Face-to-camera or voiceover beat`, `Result or CTA visual`],
    lighting: prompts[0] || `Natural, soft light suited to ${topic} on ${platformLabel}.`,
    composition: prompts[1] || secondary.promptOrGuide || `Rule of thirds, clear subject separation, format-native framing for ${contentFormat}.`,
    propsAndStyling: motifs.length ? motifs.join('; ') : `Props and wardrobe authentic to ${topic}; avoid clutter.`,
    moodAndPalette: [primary.hookAlignment, primary.difficulty ? `Difficulty: ${primary.difficulty}` : '', motifs.slice(0, 3).join(', ')].filter(Boolean).join(' · ') || `On-brand, scroll-stopping mood for ${platformLabel}.`,
    platformTips: prompts[prompts.length - 1] || `Optimize aspect ratio and pacing for ${platformLabel} ${contentFormat}.`,
  };
}

function normalizeVisualFormatLabel(fmt) {
  const f = String(fmt || 'image').toLowerCase();
  if (f.includes('carousel')) return 'carousel';
  if (f.includes('reel')) return 'reel';
  if (f.includes('story')) return 'story';
  if (f.includes('video')) return 'video';
  return 'image';
}

function resolveCreatorPromptType(promptProfile, brandData = null) {
  const explicitCreatorType = promptProfile?.creator_type || promptProfile?.creatorType || null;
  if (explicitCreatorType === 'brand_business' || explicitCreatorType === 'solo_creator') {
    return explicitCreatorType;
  }

  return brandData?.profileType === 'brand' || brandData?.profileType === 'business'
    ? 'brand_business'
    : 'solo_creator';
}

function getCreatorPromptGuidance(promptProfile, brandData = null) {
  const creatorType = resolveCreatorPromptType(promptProfile, brandData);

  if (creatorType === 'brand_business') {
    return {
      creatorType,
      label: 'Brand / Business',
      instructions: `BRAND/BUSINESS VOICE RULES:
- Write in brand voice or polished third-person framing when needed
- Keep the tone professional, service-focused, and authority-building
- Prioritize conversion intent, bookings, consultations, and trust signals
- Position the brand as the expert guide or provider
- Avoid overly diary-like, personal-creator storytelling unless the input explicitly calls for it`,
    };
  }

  return {
    creatorType: 'solo_creator',
    label: 'Solo Creator',
    instructions: `SOLO CREATOR VOICE RULES:
- Default to first-person voice when it feels natural ("I", "me", "my")
- Sound personal, relatable, authentic, and emotionally real
- Prioritize growth, community-building, conversation, and audience connection
- Use trend-aware language and creator-native phrasing when it fits the platform
- Avoid stiff corporate phrasing or generic business-speak`,
  };
}

function getCaptionPlatformInstructions(platform) {
  const normalizedPlatform = (platform || 'instagram').toLowerCase();

  switch (normalizedPlatform) {
    case 'facebook':
      return 'Facebook format: conversational and slightly longer-form, with natural paragraph spacing and no excessive emojis.';
    case 'linkedin':
      return 'LinkedIn format: professional, insight-led, no emojis, and structured like a thought-leadership post.';
    case 'tiktok':
      return 'TikTok format: punchy, trend-aware, short, and direct. Keep the rhythm fast.';
    case 'youtube':
      return 'YouTube format: keyword-rich description style with a clear topic promise and scannable formatting.';
    case 'instagram':
    default:
      return 'Instagram format: up to 2200 characters, line breaks every 2-3 sentences, and at most 1-2 emojis.';
  }
}

function _getHashtagOutputRules(platform, city) {
  const normalizedPlatform = (platform || 'instagram').toLowerCase();

  if (normalizedPlatform === 'tiktok') {
    return {
      count: '5-7',
      outputLabel: 'hashtags',
      formatRule: 'Use TikTok-friendly hashtags. Include #fyp or #foryou only when it fits naturally, not as filler.',
      cityRule: city ? `Include 1 city-specific tag if realistic for ${city}.` : 'Do not force city tags if location is unavailable.'
    };
  }

  if (normalizedPlatform === 'facebook') {
    return {
      count: '4-6',
      outputLabel: 'hashtags',
      formatRule: 'Use fewer, highly relevant Facebook hashtags. Prioritize clarity over volume.',
      cityRule: city ? `Include 1 city-specific tag if realistic for ${city}.` : 'Do not force city tags if location is unavailable.'
    };
  }

  if (normalizedPlatform === 'linkedin') {
    return {
      count: '4-6',
      outputLabel: 'hashtags',
      formatRule: 'Use professional, industry-specific hashtags only. Keep them polished and credibility-focused.',
      cityRule: city ? `Include 1 location-aware professional tag if realistic for ${city}.` : 'Do not force city tags if location is unavailable.'
    };
  }

  if (normalizedPlatform === 'youtube') {
    return {
      count: '5-7',
      outputLabel: 'search keywords',
      formatRule: 'Return search-friendly discovery terms instead of casual filler hashtags. Prefix with # only if it feels natural for YouTube descriptions.',
      cityRule: city ? `Include 1-2 local discovery terms if realistic for ${city}.` : 'Do not force city keywords if location is unavailable.'
    };
  }

  return {
    count: '8-10',
    outputLabel: 'hashtags',
    formatRule: 'Use Instagram-ready hashtags with a clear HIGH / MEDIUM / NICHE spread.',
    cityRule: city ? `Include 1-2 city-specific niche hashtags if realistic for ${city}.` : 'Do not force city tags if location is unavailable.'
  };
}

function getAudiencePainPointGuidance(niche) {
  const value = (niche || '').toLowerCase();

  if (/med\s*spa|medical spa|aesthetic|injectable|botox|facial/.test(value)) {
    return 'Pain points to draw from: visible aging, skin confidence, busy schedules, wanting natural-looking results, skepticism about treatments.';
  }

  if (/fitness|trainer|coach|wellness|gym|nutrition/.test(value)) {
    return 'Pain points to draw from: weight-loss plateaus, low motivation, inconsistent routines, lack of accountability, limited time.';
  }

  if (/real estate|realtor|broker|property|mortgage/.test(value)) {
    return 'Pain points to draw from: market anxiety, pricing uncertainty, finding the right home, preparing a property to sell, timing the market.';
  }

  return 'Pain points to draw from: the audience\'s biggest frustrations, doubts, time constraints, and desired outcomes within this niche.';
}

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) {
    console.warn('Could not get auth session:', e);
  }
  
  return headers;
}

function getGrokProxyErrorMessage(errorData, status) {
  if (errorData?.message && typeof errorData.message === 'string') return errorData.message;
  if (typeof errorData?.error === 'string') return errorData.error;
  return `API error: ${status}`;
}

function truncateForAiPrompt(text, maxChars = 2800) {
  const t = String(text || '').trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}\n[…truncated for length]`;
}

const DEFAULT_GROK_MODEL_CLIENT = 'grok-4-1-fast-non-reasoning';

function resolveGrokModelIdClientFallback() {
  const chat = (import.meta.env.VITE_GROK_CHAT_MODEL || '').trim();
  const legacy = (import.meta.env.VITE_GROK_MODEL || '').trim();
  return chat || legacy || DEFAULT_GROK_MODEL_CLIENT;
}

/**
 * Feature → model id. Values come from Vite `define` (GROK_MODEL_NON_REASONING / GROK_MODEL_REASONING at build time).
 * @param {'fast'|'reasoning'} [mode]
 */
function getGrokModel(mode = 'fast') {
  const fast = String(__GROK_FAST_MODEL__ || '').trim();
  const reasoning = String(__GROK_REASONING_MODEL__ || '').trim();
  if (mode === 'reasoning' && reasoning) return reasoning;
  if (fast) return fast;
  return resolveGrokModelIdClientFallback();
}

/** Maps to `GROK_MODEL_REASONING` / `__GROK_REASONING_MODEL__` — Full Post Builder + richer copy/analysis. */
const GROK_MODE_QUALITY = 'reasoning';

/**
 * Make a request to the Grok API via the secure proxy (API key server-only; model chosen here, forwarded in body).
 * Proxy body is only: model, messages, temperature, optional max_tokens (number).
 * @param {object[]} messages
 * @param {number} [temperature]
 * @param {{ max_tokens?: number, mode?: 'fast'|'reasoning', grok_debug_fullpost?: boolean, grok_debug_fullpost_step?: string, forceCacheRefresh?: boolean }} [requestOptions]
 */
async function callGrokAPI(messages, temperature = 0.7, requestOptions = {}) {
  const headers = await getAuthHeaders();
  const grokMode = requestOptions.mode === 'reasoning' ? 'reasoning' : 'fast';
  const model = getGrokModel(grokMode);

  const normalizedMessages = Array.isArray(messages)
    ? messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
      }))
    : [];

  const safeTemp =
    typeof temperature === 'number' && Number.isFinite(temperature) ? temperature : Number(temperature) || 0.7;

  /** @type {Record<string, unknown>} */
  const body = {
    model,
    messages: normalizedMessages,
    temperature: safeTemp,
  };

  const mtRaw = requestOptions.max_tokens;
  if (mtRaw != null) {
    const n = typeof mtRaw === 'number' ? mtRaw : Number(mtRaw);
    if (Number.isFinite(n) && n > 0) {
      const capped = Math.min(Math.floor(n), 8192);
      if (capped > 0) {
        body.max_tokens = capped;
      }
    }
  }

  if (requestOptions.grok_debug_fullpost === true) {
    body.grok_debug_fullpost = true;
  }
  const dbgStep = typeof requestOptions.grok_debug_fullpost_step === 'string'
    ? requestOptions.grok_debug_fullpost_step.trim().slice(0, 64)
    : '';
  if (dbgStep) {
    body.grok_debug_fullpost_step = dbgStep;
  }

  if (requestOptions.forceCacheRefresh === true) {
    body.forceCacheRefresh = true;
  }

  const response = await fetch(GROK_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = getGrokProxyErrorMessage(errorData, response.status);
    const err = new Error(msg);
    if (errorData.code) err.code = errorData.code;
    err.status = response.status;
    throw err;
  }

  return response.json();
}

function normalizeMomentumLabel(value, fallback = 'Rising') {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'rising') return 'Rising';
  if (normalized === 'peaking') return 'Peaking';
  if (normalized === 'declining') return 'Declining';

  return fallback;
}

function normalizeResearchPayload(researchData) {
  if (!researchData) return null;

  if (typeof researchData === 'string') {
    return parseJsonFromResponse(researchData);
  }

  if (typeof researchData === 'object') {
    return researchData;
  }

  return null;
}

function normalizeNicheAnalysisPayload(rawAnalysis, platform) {
  if (!rawAnalysis || typeof rawAnalysis !== 'object') {
    return null;
  }

  const normalizedPlatform = getPlatform(platform)?.name || platform || 'Instagram';

  const trendingThemes = Array.isArray(rawAnalysis.trendingThemes)
    ? rawAnalysis.trendingThemes
      .map((theme) => ({
        name: String(theme?.name || '').trim(),
        why: String(theme?.why || '').trim(),
        bestFormat: String(theme?.bestFormat || '').trim(),
        momentum: normalizeMomentumLabel(theme?.momentum),
      }))
      .filter((theme) => theme.name && theme.why)
      .slice(0, 5)
    : [];

  const hookPatterns = Array.isArray(rawAnalysis.hookPatterns)
    ? rawAnalysis.hookPatterns
      .map((hook) => String(hook || '').trim())
      .filter(Boolean)
      .slice(0, 4)
    : [];

  const contentGaps = Array.isArray(rawAnalysis.contentGaps)
    ? rawAnalysis.contentGaps
      .map((gap) => ({
        topic: String(gap?.topic || '').trim(),
        reason: String(gap?.reason || '').trim(),
        label: String(gap?.label || 'Untapped Opportunity').trim() || 'Untapped Opportunity',
      }))
      .filter((gap) => gap.topic && gap.reason)
      .slice(0, 3)
    : [];

  const contentIdeas = Array.isArray(rawAnalysis.contentIdeas)
    ? rawAnalysis.contentIdeas
      .map((idea) => ({
        title: String(idea?.title || '').trim(),
        format: String(idea?.format || '').trim(),
        hook: String(idea?.hook || '').trim(),
        platformFit: String(idea?.platformFit || normalizedPlatform).trim() || normalizedPlatform,
        momentum: normalizeMomentumLabel(idea?.momentum),
        whyThisWorks: String(idea?.whyThisWorks || '').trim(),
        hashtags: Array.isArray(idea?.hashtags)
          ? idea.hashtags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 5)
          : [],
      }))
      .filter((idea) => idea.title && idea.hook)
      .slice(0, 10)
    : [];

  return {
    trendingThemes,
    hookPatterns,
    contentGaps,
    contentIdeas,
  };
}

function nicheAnalysisHasRenderableContent(analysis) {
  if (!analysis || typeof analysis !== 'object') return false;
  const { trendingThemes, hookPatterns, contentGaps, contentIdeas } = analysis;
  return (
    (Array.isArray(trendingThemes) && trendingThemes.length > 0)
    || (Array.isArray(hookPatterns) && hookPatterns.length > 0)
    || (Array.isArray(contentGaps) && contentGaps.length > 0)
    || (Array.isArray(contentIdeas) && contentIdeas.length > 0)
  );
}

function normalizeRankedHashtagData(rawItems, hashtagCount) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  const normalizeCompetitionTier = (rawTier, score) => {
    const t = String(rawTier || '').trim().toLowerCase();
    if (t === 'popular' || t === 'medium' || t === 'niche') {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    const legacy = String(rawTier || '').toUpperCase();
    if (legacy === 'HIGH' || legacy === 'POPULAR') return 'Popular';
    if (legacy === 'MEDIUM') return 'Medium';
    if (legacy === 'NICHE' || legacy === 'LOW') return 'Niche';
    const s = Number.isFinite(score) ? score : 0;
    if (s >= 80) return 'Popular';
    if (s >= 55) return 'Medium';
    return 'Niche';
  };

  return rawItems
    .map((item, index) => {
      const rawTag = String(item?.tag || item?.hashtag || '').trim();
      if (!rawTag) return null;

      const parsedScore = Number.parseInt(item?.score ?? item?.engagementScore ?? 0, 10);
      const score = Number.isFinite(parsedScore)
        ? Math.min(Math.max(parsedScore, 0), 100)
        : Math.max(90 - (index * 5), 40);
      const volumeLabel = String(item?.volumeLabel || '').trim();
      const estimatedPosts = volumeLabel
        || String(item?.estimatedPosts || item?.posts || item?.postCount || '').trim()
        || 'Unknown';
      const rawMomentum = String(item?.momentum || item?.trend || '').trim().toLowerCase();
      const momentum = rawMomentum === 'rising' || rawMomentum === 'peaking' || rawMomentum === 'stable'
        ? rawMomentum.charAt(0).toUpperCase() + rawMomentum.slice(1)
        : 'Stable';
      const tier = normalizeCompetitionTier(item?.tier, score);

      return {
        tag: rawTag.startsWith('#') ? rawTag : `#${rawTag.replace(/^#*/, '')}`,
        score,
        posts: estimatedPosts,
        estimatedPosts,
        volumeLabel: volumeLabel || estimatedPosts,
        momentum,
        reason: String(item?.rationale || item?.reason || item?.why || '').trim(),
        tier,
      };
    })
    .filter(Boolean)
    .slice(0, hashtagCount);
}

export async function generateTrendIdeas(brandData, trendTopic) {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    await simulateDelay(1000, 2000);
    const mockIdeas = [
      `1. Create a "Day in the Life" fitness routine video featuring ${trendTopic}. Show real, relatable moments that resonate with your audience.`,
      `2. Share a transformation story carousel highlighting ${trendTopic}. Include before/after photos and key milestones.`,
      `3. Host a live Q&A session about ${trendTopic}. Engage your audience directly and build community.`,
      `4. Create a myth-busting post debunking common misconceptions about ${trendTopic}.`,
      `5. Share a behind-the-scenes look at your ${trendTopic} process. Authenticity builds trust!`
    ];
    return {
      success: true,
      ideas: mockIdeas.join('\n\n'),
      usage: { demo: true }
    };
  }

  try {
    const systemPrompt = buildSystemPromptWithBrandBlock(
      'You are an expert content creator assistant. Generate creative, engaging content ideas that resonate with the target audience.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Generate 5 creative content ideas for "${trendTopic}". 
            
Make sure each idea:
- Matches the brand voice and tone
- Appeals to the target audience
- Fits the niche/industry
- Can be adapted for the preferred platforms

Number them 1-5 with brief descriptions.`
      }
    ], 0.8, { mode: GROK_MODE_QUALITY });

    return {
      success: true,
      ideas: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    await simulateDelay(500, 800);
    const mockIdeas = [
      `1. Create a "Day in the Life" fitness routine video featuring ${trendTopic}. Show real, relatable moments.`,
      `2. Share a transformation story carousel highlighting ${trendTopic}. Include before/after photos.`,
      `3. Host a live Q&A session about ${trendTopic}. Engage your audience directly.`,
      `4. Create a myth-busting post debunking common misconceptions about ${trendTopic}.`,
      `5. Share a behind-the-scenes look at your ${trendTopic} process.`
    ];
    return {
      success: true,
      ideas: mockIdeas.join('\n\n'),
      usage: { fallback: true },
      note: 'Using demo content due to API unavailability'
    };
  }
}

export async function generateCaption(contentData, brandData, options = {}) {
  const fullPostBuilder = options.fullPostBuilder === true;
  // Check if demo mode is enabled AND no real topic provided - return mock data
  if (isDemoMode() && !contentData.topic?.trim()) {
    await simulateDelay(1000, 2000);
    const length = contentData.length || 'medium';
    const mockCaptions = getCaptionMocks(length, 4);
    return {
      success: true,
      caption: mockCaptions.map((c, i) => `${i + 1}. ${c}`).join('\n\n'),
      usage: { demo: true }
    };
  }

  try {
    const promptProfile = getPromptBrandProfile(brandData, {
      tone: contentData.tone || brandData?.brandVoice,
      platforms: [contentData.platform || 'instagram'],
    });
    const creatorPromptGuidance = getCreatorPromptGuidance(promptProfile, brandData);
    const isSingleCaptionMode = Boolean(contentData.selectedHook || contentData.singleCaption);
    const platform = contentData.platform || 'instagram';
    const platformContext = buildPlatformContext(platform, 'caption');
    const platformData = getPlatform(platform);
    const hashtagGuidelines = getHashtagGuidelines(platform);
    const hookGuidelines = getHookGuidelines(platform);
    const ctaGuidelines = getCTAGuidelines(platform);

    let researchText = '';
    if (!fullPostBuilder) {
      const captionResearch = await getRealtimeCaptionPatterns(
        { topic: contentData.topic, platform },
        brandData
      );
      researchText = captionResearch.success ? (captionResearch.research || '').trim() : '';
    }
    const researchBlock = researchText
      ? `Research context (live web signals):\n${researchText}\n`
      : 'Research context: Live pattern scan unavailable — rely on strong platform-native strategy.\n';

    const brandSection = buildPromptBrandSection(brandData, {
      tone: promptProfile.tone,
      platforms: promptProfile.platforms,
    });

    const contentGoal = contentData.goal || 'engagement';
    const contentGoalLabel =
      contentGoal === 'sales'
        ? 'Drive sales / conversions'
        : contentGoal === 'dms' || contentGoal === 'leads'
          ? 'Drive DMs and leads'
          : 'Drive engagement (saves, comments, shares)';

    const variantTarget = isSingleCaptionMode ? 1 : 4;
    const systemPrompt = buildAIPowerBrainSystemPrompt(
      'captions',
      brandData,
      `${buildPromptGuardrails({ includeStats: true, readyToUse: true })}\n\nReturn ONLY valid JSON (no markdown, no commentary): a JSON array of exactly ${variantTarget} CaptionVariant objects exactly as specified in the user message.`
    );

    const trendBlock =
      contentData.formatType || contentData.nicheAngle || contentData.trendDescription
        ? `Additional trending / production context:
${contentData.formatType ? `- Format: ${contentData.formatType}` : ''}
${contentData.nicheAngle ? `- Niche angle: ${contentData.nicheAngle}` : ''}
${contentData.trendDescription ? `- Trend brief: ${contentData.trendDescription}` : ''}
`
        : '';

    let userMessage = `${brandSection}

${researchBlock}
${trendBlock}
Generate captions for this context:
- Platform: ${platformData?.name || platform}
- Post idea / keywords: ${contentData.topic}
- Desired LENGTH: ${contentData.length || 'medium'} (short ≈ tight 1–2 short paragraphs; medium = standard feed caption; long = richer arc but stay within the character limit)
- Desired TONE: ${promptProfile.tone}
- Primary GOAL: ${contentGoalLabel}
- Creator type: ${creatorPromptGuidance.label}
- Audience: ${promptProfile.targetAudience}
- Niche: ${promptProfile.niche}

Platform requirements:
${platformContext}
- Character limit: ${platformData?.charLimit || 2200}
- Hook style hint: ${hookGuidelines.style}
- Include ${hashtagGuidelines.count} hashtags (${hashtagGuidelines.style}), only after a final blank line
- CTA style hint: ${ctaGuidelines.style} (examples: ${ctaGuidelines.examples.slice(0, 3).join(', ')})
- ${getCaptionPlatformInstructions(platform)}
${contentData.selectedHook ? `- Use this exact opening line for every variant: ${JSON.stringify(contentData.selectedHook)}` : ''}
${creatorPromptGuidance.creatorType === 'solo_creator'
  ? '- Prefer authentic first-person creator voice.'
  : '- Prefer polished brand/service voice with clear outcomes.'}
- ${promptProfile.contentStyle}

JSON contract — return ONLY a JSON array with exactly ${variantTarget} objects. Each object MUST match:
{
  "variantId": number,
  "length": "short" | "medium" | "long",
  "toneSummary": string,
  "caption": string,
  "primaryAngle": string,
  "recommendedCTAType": "engagement" | "sales" | "dms" | "traffic",
  "notes": string
}`;

    const captionRegenNonce =
      typeof options.forceFreshRegeneration === 'string' && options.forceFreshRegeneration.trim()
        ? options.forceFreshRegeneration.trim().slice(0, 80)
        : '';
    if (captionRegenNonce) {
      userMessage += `\n\n— Regeneration request (${captionRegenNonce}) — Produce a meaningfully different caption body while honoring every constraint above (including the exact opening hook line when provided). Vary structure, examples, and phrasing.`;
    }

    const grokCaptionOpts = { mode: fullPostBuilder ? GROK_MODE_QUALITY : 'fast' };
    if (fullPostBuilder) {
      grokCaptionOpts.max_tokens = 8192;
      grokCaptionOpts.grok_debug_fullpost = true;
      grokCaptionOpts.grok_debug_fullpost_step = 'caption';
    }
    if (captionRegenNonce) {
      grokCaptionOpts.forceCacheRefresh = true;
    }

    const data = await callGrokAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      0.7,
      grokCaptionOpts,
    );

    const parsed = parseJsonFromResponse(data.content || '');
    const shaped = captionsFromVariantArray(parsed, isSingleCaptionMode);
    const captionOut =
      shaped?.captionText || (typeof data.content === 'string' ? data.content : '') || '';

    return {
      success: true,
      caption: captionOut,
      captionVariants: shaped?.captionVariants,
      usage: data.usage,
      research: researchText,
      realtime: Boolean(researchText),
      streamlined: fullPostBuilder || !researchText,
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback: generate simple captions using the user's actual topic
    const topic = contentData.topic || 'your content';
    const fallbackCaptions = [
      `1. Discover the amazing world of ${topic}! Ready to transform your approach? Let us show you how.`,
      `2. Everything you need to know about ${topic} starts here. Follow for more insights!`,
      `3. ${topic} has never been more exciting! Here's why you should pay attention right now.`,
      `4. Want to master ${topic}? Save this post and share it with someone who needs to see it!`
    ];
    return {
      success: true,
      caption: fallbackCaptions.join('\n\n'),
      usage: { fallback: true },
      note: 'Using fallback content due to API unavailability'
    };
  }
}

/**
 * Grok-only caption polish when Claude enhance is unavailable (e.g. proxy 404).
 */
export async function enhanceCaptionWithGrokFallback(
  { caption, platform, topic, selectedHook },
  brandData = null,
  options = {}
) {
  const platformSlug = platform || 'instagram';
  const platformData = getPlatform(platformSlug);
  const promptProfile = getPromptBrandProfile(brandData, { platforms: [platformSlug] });
  const systemPrompt = buildAIPowerBrainSystemPrompt(
    'captions',
    brandData,
    `${buildPromptGuardrails({ includeStats: true, readyToUse: true })}

Return ONLY the improved caption as plain text. No JSON, no numbering, no markdown fences.`,
  );
  let userMessage = `${buildPromptBrandSection(brandData, { platforms: [platformSlug] })}

Polish this caption for ${platformData?.name || platformSlug} — same meaning, stronger rhythm, brand tone: ${promptProfile.tone}.
Topic: ${topic || '—'}
Opening hook in use: ${selectedHook || '—'}

Caption:
${truncateForAiPrompt(caption, 4000)}`;

  const regenNonce =
    typeof options.forceFreshRegeneration === 'string' && options.forceFreshRegeneration.trim()
      ? options.forceFreshRegeneration.trim().slice(0, 80)
      : '';
  if (regenNonce) {
    userMessage += `\n\n— Polish pass (${regenNonce}) — Apply a fresh editorial pass; do not return the same wording verbatim.`;
  }

  const data = await callGrokAPI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    0.5,
    {
      mode: GROK_MODE_QUALITY,
      max_tokens: 4096,
      grok_debug_fullpost: true,
      grok_debug_fullpost_step: 'caption_enhance',
      ...(regenNonce ? { forceCacheRefresh: true } : {}),
    },
  );
  const out = String(data.content || '').trim();
  if (!out) return { success: false, error: 'Empty response' };
  return { success: true, caption: out, usage: data.usage };
}

export async function scoreContentQuality(content, brandData = null, options = {}) {
  const fullPostBuilder = options.fullPostBuilder === true;
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    await simulateDelay(800, 1500);
    const mockScore = getContentScoreMock(content);
    return {
      success: true,
      analysis: JSON.stringify(mockScore),
      score: mockScore,
      usage: { demo: true }
    };
  }

  try {
    const creatorBlock = buildCreatorBrandBlock(brandData, brandData);
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const brandSection = brandContext ? `\n${creatorBlock}\nBrand Profile to evaluate against:\n${brandContext}` : (creatorBlock || '');
    const promptProfile = getPromptBrandProfile(brandData);
    const platformSlug = String(
      (Array.isArray(promptProfile.platforms) && promptProfile.platforms[0]) || 'instagram'
    ).toLowerCase();
    const platformDisplay = getPlatform(platformSlug)?.name || platformSlug;
    const signalBlock =
      formatAlgorithmSignalsForScorer(platformSlug) || formatAlgorithmSignalsForScorer('instagram');

    const scorerSystem = buildAIPowerBrainSystemPrompt(
      'scorer',
      brandData,
      `${buildPromptGuardrails({ includeStats: true })}

Return ONLY one JSON object matching the ContentScore schema in the user message. No markdown fences or prose.
If content is empty or under 20 characters, return: { "error": "Content too short to analyze. Provide the full post text including hashtags and CTA for an accurate score." }`
    );

    const messages = [
      {
        role: 'system',
        content: scorerSystem,
      },
      {
        role: 'user',
        content: `Score this draft for ${platformDisplay}.

${buildPromptBrandSection(brandData, { platforms: [platformSlug] })}

Algorithm-weighted signals for this platform (use to inform algorithmAlignmentScore; guidance, not a rigid checklist):
${signalBlock}

Content to analyze:
${truncateForAiPrompt(content, 14000)}
${brandSection}

Return ONLY valid JSON with this exact shape:
{
  "overallScore": number,
  "hookScore": number,
  "clarityScore": number,
  "valueScore": number,
  "algorithmAlignmentScore": number,
  "humanizerScore": number,
  "strengths": string[],
  "risks": string[],
  "fixes": [
    { "area": "hook" | "body" | "cta" | "structure" | "tone", "issue": string, "suggestedRewrite": string, "impact": string }
  ]
}

Rules:
- All six scores are 0–100 integers.
- strengths: 2–4 items; risks: 2–4 items; fixes: 3–6 items with concrete suggestedRewrite lines.
- Be ruthless and specific; avoid generic praise.`,
      },
    ];
    const grokScorerOpts = { mode: GROK_MODE_QUALITY, max_tokens: 4096 };
    if (fullPostBuilder) {
      grokScorerOpts.grok_debug_fullpost = true;
      grokScorerOpts.grok_debug_fullpost_step = 'quality_score';
    }

    let data;
    try {
      data = await callClaudeAPI([...messages], 0.3);
    } catch (claudeError) {
      console.warn('Quality score: Claude unavailable, using Grok:', claudeError?.message);
      try {
        data = await callGrokAPI([...messages], 0.3, grokScorerOpts);
      } catch (grokError) {
        console.warn('Quality score: Grok fallback failed:', grokError?.message);
        return {
          success: false,
          error: 'Scoring is temporarily unavailable.',
          code: 'SCORING_UNAVAILABLE',
        };
      }
    }

    const parsed = parseJsonFromResponse(data.content || '');
    if (parsed?.error) {
      return {
        success: false,
        error: typeof parsed.error === 'string' ? parsed.error : 'Could not score content.',
        analysis: data.content || '',
        usage: data.usage,
      };
    }

    const v2 = normalizeContentScoreV2(parsed);
    if (v2) {
      return {
        success: true,
        analysis: data.content || '',
        score: {
          overall: v2.overall,
          breakdown: v2.breakdown,
          suggestions: v2.suggestions,
          rewriteExample: v2.rewriteExample,
          weakestSection: v2.weakestSection,
          raw: v2.raw,
          humanizerScore: v2.humanizerScore,
        },
        usage: data.usage,
      };
    }

    if (parsed?.totalScore != null) {
      return {
        success: true,
        analysis: data.content || '',
        score: {
          overall: parsed.totalScore,
          breakdown: {
            hookStrength: parsed.categoryScores?.hookStrength?.score ?? 0,
            audienceRelevance: parsed.categoryScores?.audienceRelevance?.score ?? 0,
            clarityOfMessage: parsed.categoryScores?.clarityOfMessage?.score ?? 0,
            callToAction: parsed.categoryScores?.callToAction?.score ?? 0,
            platformFit: parsed.categoryScores?.platformFit?.score ?? 0,
          },
          suggestions: [
            ...(Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : []),
            parsed.weakestSection?.rewriteExample
              ? `Rewrite example for ${parsed.weakestSection.name}: ${parsed.weakestSection.rewriteExample}`
              : null,
          ].filter(Boolean),
          weakestSection: parsed.weakestSection || null,
          raw: parsed,
        },
        usage: data.usage,
      };
    }

    return {
      success: true,
      analysis: data.content || '',
      usage: data.usage,
    };
  } catch (error) {
    console.error('Content quality scoring error:', error);
    return {
      success: false,
      error: 'Scoring is temporarily unavailable.',
      code: 'SCORING_UNAVAILABLE',
    };
  }
}

export async function generateContentPlan(goals, brandData, days = 7) {
  try {
    const systemPrompt = buildSystemPromptWithBrandBlock(
      'You are an AI content strategist. Create detailed, actionable content calendars that align with brand goals.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Create a detailed ${days}-day content calendar to achieve: ${goals}

Include for each day:
- Post type (reel, carousel, story, etc.)
- Topic/theme
- Optimal posting time
- Platform recommendations
- Brief content outline

Make sure all content aligns with the brand voice and appeals to the target audience.`
      }
    ], 0.6, { mode: GROK_MODE_QUALITY });

    return {
      success: true,
      plan: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

const HOOK_BUILDER_THEME_BY_FULL_POST_TYPE = {
  Question: 'curiosity',
  Teaser: 'intrigue',
  'Shocking Stat': 'surprise',
  Story: 'storytelling',
  'Bold Claim': 'authority',
};

/** Slug → canonical theme (Full Post hook slugs + identity for theme keys if passed through). */
const FULL_POST_HOOK_SLUG_TO_HOOK_BUILDER_THEME = {
  question: 'curiosity',
  teaser: 'intrigue',
  shocking_stat: 'surprise',
  story: 'storytelling',
  bold_claim: 'authority',
  curiosity: 'curiosity',
  intrigue: 'intrigue',
  surprise: 'surprise',
  storytelling: 'storytelling',
  authority: 'authority',
};

/** Canonical Hook Builder theme → substring for demo `getHookMocks` (matches mock `theme` labels). */
const HOOK_BUILDER_MOCK_THEME_NEEDLE = {
  curiosity: 'question',
  intrigue: 'teaser',
  surprise: 'statistic',
  storytelling: 'story',
  authority: 'shocking',
};

const HOOK_BUILDER_THEME_DIRECTIVES = {
  curiosity:
    'Theme "curiosity": compelling questions that stop the scroll; most hooks end with "?". Avoid generic "what if everything you knew about [topic] was wrong" — ask something only someone who understands the topic would ask.',
  intrigue:
    'Theme "intrigue": tease a concrete secret, result, or insider angle about the topic — not vague mystery; do not reveal the payoff in the hook line.',
  surprise:
    'Theme "surprise": counterintuitive contrasts or real-feeling pattern breaks about the topic; do not invent fake statistics or precise percentages — use qualitative surprises grounded in reality.',
  storytelling:
    'Theme "storytelling": first person, mid-moment, with tangible sensory or emotional detail about the topic — not abstract "I was deep into [topic]" or "I didn\'t plan to care about [topic]" frames.',
  authority:
    'Theme "authority": strong, specific, disagreeable opinions about the topic — not vague motivation; someone familiar with the subject should feel you took a real stance.',
  _default:
    'Match the requested hook theme in every object; stay stylistically consistent with that theme.',
};

/**
 * Map UI / Full Post fallback theme strings to a canonical theme key for prompts and guardrails.
 * @param {string} theme
 * @returns {string}
 */
function normalizeHookBuilderThemeKey(theme) {
  const t = String(theme ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!t) return 'curiosity';
  const aliases = {
    question: 'curiosity',
    curiosity: 'curiosity',
    teaser: 'intrigue',
    intrigue: 'intrigue',
    shocking: 'surprise',
    shocking_stat: 'surprise',
    statistic: 'surprise',
    fact: 'surprise',
    surprise: 'surprise',
    story: 'storytelling',
    storytelling: 'storytelling',
    bold_claim: 'authority',
    bold: 'authority',
    authority: 'authority',
  };
  return aliases[t] || t;
}

/**
 * Map Full Post Builder hook-type label to Hook Builder theme slug (for fallback generation).
 * @param {string} fullPostHookType
 * @returns {string}
 */
export function mapFullPostHookTypeToHookBuilderTheme(fullPostHookType) {
  const label = normalizeFullPostHookTypeLabel(fullPostHookType);
  const byLabel = HOOK_BUILDER_THEME_BY_FULL_POST_TYPE[label];
  if (byLabel) return byLabel;
  const slug = String(fullPostHookType ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return FULL_POST_HOOK_SLUG_TO_HOOK_BUILDER_THEME[slug] || 'curiosity';
}

/**
 * @param {object} [options]
 * @param {boolean} [options.skipRealtimeResearch] — skip Perplexity hook-pattern call (quieter + fewer deps; use for Full Post fallback).
 */
export async function generateHooks(input, brandData, theme = 'question', platform = 'instagram', options = {}) {
  const skipRealtimeResearch = options.skipRealtimeResearch === true;
  const themeRaw = typeof theme === 'string' && theme.trim() ? theme.trim() : 'question';
  const canonicalTheme = normalizeHookBuilderThemeKey(themeRaw);
  const themeDirective =
    HOOK_BUILDER_THEME_DIRECTIVES[canonicalTheme] || HOOK_BUILDER_THEME_DIRECTIVES._default;

  // Check if demo mode is enabled AND no real input - return mock data
  if (isDemoMode() && !input?.trim()) {
    await simulateDelay(800, 1500);
    const mockNeedle = HOOK_BUILDER_MOCK_THEME_NEEDLE[canonicalTheme] || themeRaw;
    const mockHooks = getHookMocks(mockNeedle, 4);
    return {
      success: true,
      hooks: mockHooks.map((h, i) => `${i + 1}. ${h.text}`).join('\n'),
      usage: { demo: true }
    };
  }

  try {
    const promptProfile = getPromptBrandProfile(brandData, { platforms: [platform] });
    const niche = promptProfile.niche;
    const brandVoice = promptProfile.tone;
    const audience = promptProfile.targetAudience;
    const creatorPromptGuidance = getCreatorPromptGuidance(promptProfile, brandData);
    const hookGuidelines = getHookGuidelines(platform);
    const platformData = getPlatform(platform);

    const hookResearch = skipRealtimeResearch
      ? { success: false, research: '' }
      : await getRealtimeHookPatterns({ topic: input, platform }, brandData);
    const researchText = hookResearch.success ? (hookResearch.research || '').trim() : '';
    const researchBlock = researchText
      ? `Research context (live web signals):\n${researchText}\n`
      : 'Research context: Live pattern scan unavailable — rely on platform-native hook craft.\n';

    const topicTrimmed = String(input ?? '').trim();
    const topicQuoted = topicTrimmed ? `"${topicTrimmed}"` : 'the topic';
    const topicSpecificityAndCasing = `Topic-specificity and language (mandatory for every hook):
- Every hook must reference a real detail, experience, misconception, pain point, or insight specific to ${topicQuoted}. Do NOT write generic sentence templates with the topic word inserted. If the hook would still make sense with any random topic swapped in, rewrite it.
- Use natural English grammar: the topic should be lowercase mid-sentence unless it is a proper noun or brand name (e.g. write "the truth about microneedling" not "the truth about Microneedling" when the topic is a common noun).`;

    const systemPrompt = buildAIPowerBrainSystemPrompt(
      'hooks',
      brandData,
      `${themeDirective}

Generate hooks using the "${canonicalTheme}" theme (user-selected label: "${themeRaw}"). The hooks must feel stylistically consistent with this theme; do not default to generic question-style hooks unless the theme is curiosity.

${topicSpecificityAndCasing}

${buildPromptGuardrails({ includeStats: true, readyToUse: true })}

Return ONLY valid JSON (no markdown): a JSON array of 6–10 HookIdea objects as defined in the user message. Each "hook" field must be one sentence and ≤20 words.`
    );

    const userMessage = `${buildPromptBrandSection(brandData, { platforms: [platform] })}

${researchBlock}
Generate hooks using the "${themeRaw}" theme. Stylistic target (canonical): "${canonicalTheme}". Every hook must match this theme; see system message for theme rules and topic-specificity rules.

Generate hooks for:
- Platform: ${platformData?.name || platform}
- Topic / idea: ${topicTrimmed || input}
- Hook theme (mandatory): ${themeRaw} → apply "${canonicalTheme}" style to every hook
- Niche: ${niche}
- Audience: ${audience}
- Brand tone: ${brandVoice}
- Creator type: ${creatorPromptGuidance.label}
${getAudiencePainPointGuidance(niche)}

Platform hook guidance:
- Style: ${hookGuidelines.style}
- Examples: ${hookGuidelines.examples.join(', ')}
- Tip: ${hookGuidelines.tip}
${creatorPromptGuidance.creatorType === 'solo_creator'
  ? '- Prefer first-person, relatable creator-native phrasing.'
  : '- Prefer authority, outcomes, and credibility-forward phrasing.'}

Return ONLY a JSON array with 6–10 objects. Each object:
{
  "hook": string (one sentence, ≤20 words, copy-paste ready),
  "pattern": string (e.g. counterintuitive question, POV, bold claim),
  "emotionTarget": string (e.g. curiosity, relief, FOMO),
  "bestFor": string (e.g. Reels, TikTok, Shorts, Carousel cover),
  "complexity": "simple" | "moderate" | "story-driven"
}

At least 6 of the hooks must clearly embody "${canonicalTheme}" (theme "${themeRaw}"); any remaining variety must still fit the same theme (no mixing in unrelated hook types).`;

    const data = await callGrokAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      0.8,
      { mode: GROK_MODE_QUALITY },
    );

    const parsed = parseJsonFromResponse(data.content || '');
    const hooksText = hooksFromHookIdeasArray(parsed) || (typeof data.content === 'string' ? data.content : '');

    return {
      success: true,
      hooks: hooksText,
      hookIdeas: Array.isArray(parsed) ? parsed : undefined,
      usage: data.usage,
      research: researchText,
      realtime: Boolean(researchText),
    };
  } catch (error) {
    console.error('Grok API Error:', error);

    const t = String(input || 'this').trim() || 'this';
    const fallbackByCanonical = {
      curiosity: [
        `1. What if everything you thought about ${t} was wrong?`,
        `2. Why do so many people still get ${t} backwards?`,
        `3. Is ${t} actually the bottleneck you think it is?`,
        `4. Have you been making ${t} harder than it needs to be?`,
      ],
      intrigue: [
        `1. The part of ${t} nobody explains until it's too late...`,
        `2. I almost didn't share this about ${t}...`,
        `3. There's a hidden layer to ${t} most people miss.`,
        `4. Wait until you see what changes ${t} completely.`,
      ],
      surprise: [
        `1. Everything you assumed about ${t}? Flip it.`,
        `2. The quiet pattern behind ${t} that breaks the usual rules.`,
        `3. ${t} works backward from what most people expect.`,
        `4. If ${t} feels obvious, you're probably skipping the real move.`,
      ],
      storytelling: [
        `1. I was deep into ${t} when everything clicked.`,
        `2. I didn't plan to care about ${t} until this moment.`,
        `3. Last week I messed up ${t} — and learned fast.`,
        `4. Here's the honest version of my ${t} story.`,
      ],
      authority: [
        `1. ${t} is overrated unless you fix this first.`,
        `2. Stop treating ${t} like a hobby if you want real results.`,
        `3. Most advice about ${t} is backwards — here's what actually works.`,
        `4. If you're serious about ${t}, commit to this non-negotiable.`,
      ],
    };
    const fallbackHooks = fallbackByCanonical[canonicalTheme] || [
      `1. What if everything you knew about ${t} was wrong?`,
      `2. Stop scrolling — this changes everything about ${t}.`,
      `3. I tried ${t} for 30 days. Here's what happened...`,
      `4. The truth about ${t} that nobody talks about.`,
    ];
    return {
      success: true,
      hooks: fallbackHooks.join('\n'),
      usage: { fallback: true },
      note: 'Using fallback hooks due to API unavailability'
    };
  }
}

export async function generateFullPostHooks(
  { topic, hookType = 'Question', platform = 'instagram', formatType, nicheAngle, trendDescription },
  brandData
) {
  try {
    const promptProfile = getPromptBrandProfile(brandData, { platforms: [platform] });
    const platformData = getPlatform(platform);
    const safeHookType = normalizeFullPostHookTypeLabel(hookType);
    const topicTrimmed = String(topic ?? '').trim();
    const platformName = platformData?.name || platform;
    const topicQuoted = topicTrimmed ? `"${topicTrimmed}"` : 'the topic';

    const trendBlock = formatType || nicheAngle || trendDescription
      ? `
TRENDING CONTEXT (hooks must fit this format and angle):
${formatType ? `- Format: ${formatType}` : ''}
${nicheAngle ? `- Niche angle: ${nicheAngle}` : ''}
${trendDescription ? `- Brief: ${trendDescription}` : ''}
`
      : '';

    const fullPostHooksInstruction = `You are a viral social media copywriter. Generate exactly 4 hooks about ${topicQuoted} in the "${safeHookType}" style for ${platformName}.

CRITICAL RULES:
1. Every hook must show SPECIFIC knowledge about ${topicQuoted}. Reference real details, experiences, common misconceptions, pain points, or outcomes that someone familiar with the subject would recognize. Do NOT write generic templates that could apply to any topic — if you could swap the topic word for any other word and the hook still works, it is too generic. Rewrite it.

2. Hook style — follow "${safeHookType}" strictly:
   - "Question": A specific, compelling question about the topic that the reader needs answered. Must end with "?". Bad: "What if everything you knew about [topic] was wrong?" (generic). Good: a question referencing a real aspect of the topic.
   - "Teaser": Tease a specific secret, result, or insider insight about the topic. Create curiosity about something concrete, not vague mystery.
   - "Shocking Stat": A surprising contrast, counterintuitive truth, or unexpected pattern about the topic. Do NOT invent fake numbers. Use qualitative surprises grounded in reality.
   - "Story": Start mid-moment in a real-feeling personal experience with the topic. Use first person. Reference tangible sensory or emotional details — not abstract statements about "caring" or being "deep into" the topic.
   - "Bold Claim": A strong, specific, opinionated statement about the topic that takes a real stance. Not vague motivation — a concrete opinion someone could disagree with.

3. Capitalization: Use natural English grammar. The topic phrase should be lowercase mid-sentence unless it is a proper noun or brand name (e.g. write "the truth about microneedling" not "the truth about Microneedling" when microneedling is a common noun).

4. Each hook must be one sentence, under 20 words, and immediately make someone stop scrolling.

5. Do NOT just insert the topic word into a generic sentence frame. Every hook must be specific enough that it could ONLY be about this topic.

Generate exactly 4 hooks in the "${safeHookType}" style ONLY. Do not mix styles.`;

    // Full Post Builder: non-reasoning model + explicit max_tokens (model id from getGrokModel via proxy body).
    const systemMsg = {
      role: 'system',
      content: buildAIPowerBrainSystemPrompt(
        'hooks',
        brandData,
        `Full Post Builder mode: output exactly 4 hooks.
Format (required): plain numbered lines only, one hook per line:
1. First hook here
2. Second hook here
3. Third hook here
4. Fourth hook here
Do not wrap in markdown code fences. Do not use JSON unless you output ONLY a JSON array of 4 strings.

${fullPostHooksInstruction}

Each hook must be platform-native for ${platformName} and strictly follow the "${safeHookType}" rules above.

${buildPromptGuardrails({ includeStats: true, readyToUse: true })}`,
      ),
    };

    const userMsg = {
      role: 'user',
      content: `${buildPromptBrandSection(brandData, { platforms: [platform] })}
${trendBlock}
Generate 4 hooks for this full-post workflow. Use ONLY the "${safeHookType}" style (see system message). Do not mix hook styles.

Topic: ${topicQuoted}
Platform: ${platformName}
${getAudiencePainPointGuidance(promptProfile.niche)}

Requirements:
- Hook type (mandatory): ${safeHookType} — all four lines must match this style
- Match the creator's brand tone: ${promptProfile.tone}
- Stay under 20 words per hook; one sentence each
- Show topic-specific knowledge — no generic mad-lib frames; obey capitalization rule (lowercase common nouns mid-sentence)
- Make each hook platform-native for ${platformName}

Return only the four numbered hooks (or a JSON array of 4 strings). No preamble or explanation.`,
    };

    const data = await callGrokAPI([systemMsg, userMsg], 0.7, {
      mode: GROK_MODE_QUALITY,
      max_tokens: 1024,
      grok_debug_fullpost: true,
    });

    const rawContent = typeof data.content === 'string' ? data.content : '';
    const hooks = parseFullPostHookList(rawContent);

    if (!hooks.length) {
      return {
        success: false,
        code: 'HOOKS_EMPTY',
        error: 'The model returned no usable hooks. Try again.',
        content: rawContent,
        usage: data.usage,
      };
    }

    return {
      success: true,
      hooks,
      content: rawContent,
      usage: data.usage,
    };
  } catch (error) {
    console.error('Full post hook generation error:', error);
    const code = typeof error?.code === 'string' ? error.code : 'GROK_REQUEST_FAILED';
    const message = typeof error?.message === 'string' ? error.message : 'Hook generation failed';
    return {
      success: false,
      code,
      error: message,
      status: typeof error?.status === 'number' ? error.status : undefined,
    };
  }
}

export { parseFullPostHookList };

/**
 * Generate styled CTAs grouped by category (Direct, Soft, Urgency, Question, Story)
 * @param {Object} params - { promoting, goalType, platform }
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Styled CTAs grouped by category
 */
export async function generateStyledCTAs(params, brandData, platform = 'instagram', options = {}) {
  const fullPostBuilder = options.fullPostBuilder === true;
  const { promoting, goalType, selectedHook, caption } = params;
  const captionForPrompt = fullPostBuilder ? truncateForAiPrompt(caption, 3200) : caption;

  const goalLabels = {
    'followers': 'Grow followers',
    'engagement': 'Drive Engagement (comments, shares, saves)',
    'sales': 'Drive Sales/Conversions (purchases, sign-ups, downloads)',
    'leads': 'Generate leads',
    'dms': 'Drive DMs/Leads (direct messages, inquiries)'
  };

  // Demo mode
  if (isDemoMode()) {
    await simulateDelay(800, 1500);
    return {
      success: true,
      ctas: [
        { style: 'Soft', cta: `Save this for your next session`, tip: 'Low-pressure CTAs boost saves and shares' },
        { style: 'Engagement', cta: `Comment YES if this is on your list`, tip: 'Comment CTAs boost engagement signals' },
        { style: 'Traffic', cta: `Get the full details through the link in bio`, tip: 'Traffic CTAs work when the destination is clear' },
        { style: 'Lead', cta: `DM me "YES" for the next steps`, tip: 'Lead CTAs turn warm interest into conversations' },
        { style: 'Direct', cta: `Grab your spot this week before it fills up`, tip: 'Direct CTAs work best for high-intent audiences' }
      ],
      platformTip: `On ${platform}, mix save/comment CTAs with one clear conversion CTA.`
    };
  }

  try {
    const platformData = getPlatform(platform);
    const ctaGuidelines = getCTAGuidelines(platform);
    const promptProfile = getPromptBrandProfile(brandData, { platforms: [platform] });
    const creatorPromptGuidance = getCreatorPromptGuidance(promptProfile, brandData);

    let researchText = '';
    let streamlined = fullPostBuilder;
    if (!fullPostBuilder) {
      const ctaResearch = await getRealtimeCTAPatterns(
        { promoting, platform, goalType },
        brandData
      );
      researchText = ctaResearch.success ? (ctaResearch.research || '').trim() : '';
      if (!ctaResearch.success || !researchText) streamlined = true;
    }
    const researchBlock = researchText
      ? `Research context (live web signals):\n${researchText}\n`
      : 'Research context: Live pattern scan unavailable — rely on platform-native conversion craft.\n';

    const primaryGoalModel =
      goalType === 'sales'
        ? 'sales'
        : goalType === 'dms' || goalType === 'leads'
          ? 'dms_leads'
          : 'engagement';

    const systemPrompt = buildAIPowerBrainSystemPrompt(
      'ctas',
      brandData,
      `${buildPromptGuardrails({ readyToUse: true })}

Return ONLY valid JSON (no markdown): one object with "platformTip" (string) and "ctas" (array of 5–7 CTAIdea objects) as defined in the user message.`
    );

    const userMessage = `${buildPromptBrandSection(brandData, { platforms: [platform] })}

${researchBlock}
Generate CTAs for:
- What they promote: ${promoting}
- Selected GOAL: ${goalLabels[goalType] || goalType} (primary model goal key: ${primaryGoalModel})
- Platform: ${platformData?.name || platform}
- Brand tone: ${promptProfile.tone}
- Creator type: ${creatorPromptGuidance.label}
- Optional hook: ${selectedHook || 'Not provided'}
- Optional caption context: ${captionForPrompt || 'Not provided'}

Platform CTA guidance:
- Style: ${ctaGuidelines.style}
- Examples: ${ctaGuidelines.examples.join(', ')}
- Native patterns: ${platform === 'instagram' ? 'bio link, save, comment, DM' : platform === 'facebook' ? 'comment, share, button' : platform === 'tiktok' ? 'comment, follow, stitch/duet, DM' : platform === 'linkedin' ? 'comment, message, profile CTA' : 'platform-native next step'}
${creatorPromptGuidance.creatorType === 'solo_creator'
  ? '- Bias toward community, conversation, and creator-led trust.'
  : '- Bias toward bookings, consultations, lead capture, and clear outcomes.'}

Goal bias:
- Engagement / followers → low-friction saves, shares, comments; keyword comments.
- Sales → benefit + urgency without spam; clear next step to buy or sign up.
- DMs / leads → conversational DM prompts and lead-magnet framing.

Return ONLY JSON:
{
  "platformTip": string,
  "ctas": [
    {
      "cta": string,
      "goal": "engagement" | "sales" | "dms_leads",
      "friction": "low" | "medium" | "high",
      "placement": "caption_end" | "on_screen_text" | "voiceover" | "first_comment",
      "mechanic": string,
      "notes": string
    }
  ]
}

Require 5–7 items in "ctas". Each "cta" is the final line to paste.`;

    const grokCtaOpts = { mode: fullPostBuilder ? GROK_MODE_QUALITY : 'fast', max_tokens: 4096 };
    if (fullPostBuilder) {
      grokCtaOpts.grok_debug_fullpost = true;
      grokCtaOpts.grok_debug_fullpost_step = 'ctas';
    }

    const data = await callGrokAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      0.7,
      grokCtaOpts,
    );

    const parsed = parseJsonFromResponse(data.content || '');
    const shaped = normalizeStyledCtasPayload(parsed);
    if (shaped?.ctas?.length) {
      return {
        success: true,
        ctas: shaped.ctas,
        platformTip: shaped.platformTip || '',
        ctaIdeas: Array.isArray(parsed?.ctas) ? parsed.ctas : undefined,
        usage: data.usage,
        research: researchText,
        realtime: Boolean(researchText),
        streamlined,
      };
    }

    // Fallback parsing
    return {
      success: true,
      ctas: [
        { style: 'Soft', cta: `Save this for when you're ready to revisit ${promoting}.`, tip: 'Low pressure drives saves.' },
        { style: 'Engagement', cta: `Comment YES if ${promoting} is on your radar.`, tip: 'Comments signal interest to the algorithm.' },
        { style: 'Traffic', cta: `Get the full breakdown for ${promoting} through the link in bio.`, tip: 'Clear destination boosts click intent.' },
        { style: 'Lead', cta: `DM me "${promoting}" and I'll send the next steps.`, tip: 'Lead CTAs reduce friction for warm prospects.' },
        { style: 'Direct', cta: `Book your ${promoting} this week before spots fill up.`, tip: 'Direct CTAs work best for ready buyers.' }
      ],
      platformTip: `On ${platformData?.name || platform}, questions and soft CTAs drive the most engagement.`,
      usage: data.usage,
      streamlined,
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: true,
      ctas: [
        { style: 'Soft', cta: `Save this for later if ${promoting} is something you want to try.`, tip: 'Soft CTAs boost saves.' },
        { style: 'Engagement', cta: `Comment YES if you want more tips on ${promoting}.`, tip: 'Comment prompts drive algorithmic engagement.' },
        { style: 'Traffic', cta: `The full guide to ${promoting} is linked in bio.`, tip: 'Traffic CTAs work when the next step is obvious.' },
        { style: 'Lead', cta: `DM me "${promoting}" for details and pricing.`, tip: 'DM CTAs work well for leads.' },
        { style: 'Direct', cta: `Book your ${promoting} today if you want to start this week.`, tip: 'Direct CTAs convert warm audiences.' }
      ],
      platformTip: `Mix different CTA styles for best results on ${platform}.`,
      usage: { fallback: true },
      streamlined: true,
    };
  }
}

export async function generateCTAs(goal, brandData, platform = 'instagram') {
  // Check if demo mode is enabled AND no real goal - return mock data
  if (isDemoMode() && !goal?.trim()) {
    await simulateDelay(800, 1500);
    const mockCTAs = getCTAMocks(goal, 5);
    return {
      success: true,
      ctas: mockCTAs.map((c, i) => `${i + 1}. ${c}`).join('\n'),
      usage: { demo: true }
    };
  }

  try {
    const promptProfile = getPromptBrandProfile(brandData, { platforms: [platform] });
    const niche = promptProfile.niche;
    const brandVoice = promptProfile.tone;
    const audience = promptProfile.targetAudience;
    const creatorPromptGuidance = getCreatorPromptGuidance(promptProfile, brandData);
    
    // Get platform-specific CTA guidelines
    const ctaGuidelines = getCTAGuidelines(platform);
    const platformData = getPlatform(platform);

    const systemPrompt = buildSystemPromptWithBrandBlock(
      `You are a call-to-action specialist. Create compelling, action-oriented CTAs that drive conversions.

CREATOR-TYPE BRANCHING:
${creatorPromptGuidance.instructions}`,
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Suggest 5 urgent CTAs for goal: "${goal}"

PLATFORM: ${platformData?.name || 'Social Media'}
Platform CTA style: ${ctaGuidelines.style}
Platform CTA examples: ${ctaGuidelines.examples.join(', ')}
Platform tip: ${ctaGuidelines.tip}
Creator type: ${creatorPromptGuidance.label}

Niche: ${niche.toLowerCase()}
Target audience: ${audience.toLowerCase()}

Each CTA must:
- Match the ${brandVoice} brand voice
- Be optimized for ${platformData?.name || 'social media'} (what works best on this platform)
- Create urgency or desire
- Feel natural, not pushy
- Use platform-specific language and conventions
- ${creatorPromptGuidance.creatorType === 'solo_creator'
  ? 'Use personal-brand, first-person, community-oriented phrasing where natural.'
  : 'Use polished brand/service language with authority and conversion intent.'}

Number them 1-5. Include a brief explanation of why each CTA works for ${platformData?.name || 'this platform'}.`
      }
    ], 0.7, { mode: GROK_MODE_QUALITY });

    return {
      success: true,
      ctas: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback: generate CTAs using the user's actual goal
    const fallbackCTAs = [
      `1. Ready to ${goal}? Comment "YES" below and let's make it happen!`,
      `2. Want to ${goal}? Tap the link in bio to get started today.`,
      `3. Don't wait to ${goal} — save this post and take action NOW.`,
      `4. Share this with someone who wants to ${goal} too!`,
      `5. Drop a comment if you're serious about ${goal} — we'll help you get there.`
    ];
    return {
      success: true,
      ctas: fallbackCTAs.join('\n'),
      usage: { fallback: true },
      note: 'Using fallback CTAs due to API unavailability'
    };
  }
}

export async function generateHashtags(input, brandData, platform = 'instagram', options = {}) {
  const request = typeof input === 'string'
    ? { topic: input, platform }
    : { ...(input || {}), platform: input?.platform || platform };
  const topic = request.topic || '';
  const selectedHook = request.selectedHook || '';
  const caption = request.caption || '';
  const isFullPostBuilderRequest = typeof input === 'object' && input !== null;
  const fullPostBuilder = options.fullPostBuilder === true && isFullPostBuilderRequest;
  const captionForPrompt = truncateForAiPrompt(caption, 2400);

  // Check if demo mode is enabled AND no real input - return mock data
  if (isDemoMode() && !topic?.trim()) {
    await simulateDelay(800, 1500);
    const hashtagCount = isFullPostBuilderRequest ? 10 : (getHashtagGuidelines(platform)?.max || 10);
    const mockHashtags = getHashtagMocks(hashtagCount);
    return {
      success: true,
      hashtags: mockHashtags.map(h => `${h.tag} (Score: ${h.score}%, ${h.posts} posts)`).join('\n'),
      hashtagData: mockHashtags,
      usage: { demo: true }
    };
  }

  try {
    const platformData = getPlatform(platform);
    const hashtagCount = isFullPostBuilderRequest ? 10 : (getHashtagGuidelines(platform)?.max || 10);
    const realtimeResearch = fullPostBuilder
      ? { success: false, research: '', citations: [] }
      : await getRealtimeHashtagResearch({
        topic,
        platform,
        selectedHook,
        caption: captionForPrompt,
      }, brandData);
    const niche = getNiche(brandData, topic || 'general creator');
    const audience = getTargetAudience(brandData, 'general audience');
    const liveResearchText = realtimeResearch.success
      ? (realtimeResearch.research || 'No live research returned.')
      : '';
    const hasRealtimeResearch = Boolean(realtimeResearch.success && liveResearchText.trim());
    const platformLabel = platformData?.name || platform;
    const systemPrompt = buildAIPowerBrainSystemPrompt(
      'hashtags',
      brandData,
      `Your job is to generate ${platformLabel}-ready hashtags that are:
- Strategically tiered by competition (Popular, Medium, Niche)
- Grounded in real-world volume ranges from live research data when provided
- Optimized for small–mid sized accounts to actually rank, not just chase vanity reach
You must respect the JSON response contract provided in the user message.
If live research data is incomplete or noisy, you prioritize realism and clear ranges over fabricated precision.
Never invent absurdly high volumes for narrow compound hashtags (e.g., variations of a term cannot exceed their parent hashtag's total volume).
Apply the brand voice and audience details (if provided) only to influence which hashtags you choose—not the output format.

${buildPromptGuardrails({ readyToUse: true })}`
    );

    const brandSection = buildPromptBrandSection(brandData, {
      niche,
      targetAudience: audience,
      platforms: [platform],
    });

    const researchBlock = hasRealtimeResearch
      ? liveResearchText.trim()
      : 'Live research unavailable. Use conservative, realistic volume tiers and platform-native knowledge for this niche. Prefer range labels over fake exact counts.';

    const tierMixNote =
      hashtagCount >= 8
        ? `- Popular (1M+ posts): 2–3 broad discovery hashtags strongly tied to the niche and platform.
- Medium (100K–1M posts): 3–4 intent-rich hashtags with solid volume but less saturation.
- Niche (<100K posts): 2–3 community or long-tail hashtags where a smaller account can realistically rank.`
        : `- Include a deliberate mix of Popular, Medium, and Niche tiers scaled to exactly ${hashtagCount} total tags (e.g., at least one Popular for discovery, multiple Medium for intent, multiple Niche for rankability).`;

    let userMessage = `You are generating hashtags for the following context:

Platform: ${platformLabel}
Keywords / niche: ${topic}

Candidate Hashtag Research (from live web data):
${researchBlock}

Brand context:
${brandSection}

Objective:
Return exactly ${hashtagCount} **high-quality hashtags** that will help this post get discovered by the right people.
We want a deliberate mix of three competition tiers, aligned with the Instagram Tips card in the UI:

${tierMixNote}

Use the research data to inform **relative** volume and momentum.
If you do not have a trustworthy exact count for a hashtag, assign it to the most reasonable tier and express volume as a range label (e.g., "10K–50K", "50K–250K", "250K–1M+", "1M+", "Unknown").
Never assign higher volume to a narrow variant than its parent hashtag if that contradicts the research.

Scoring:
For each hashtag, compute a composite score (0–100) that blends:
- Relevance to the user's keywords/niche and selected platform.
- Competition fit (bonus for Medium and Niche tags where this content can stand out).
- Momentum (prefer tags that are growing, not obviously declining, based on the research text).

Brand voice:
If brand voice details are provided, gently bias hashtag choices toward that brand's positioning and audience, **without** drifting off-topic or changing the output format.

Return JSON ONLY as a single array. Each object must have exactly these keys and value types:
- "tag": string starting with #
- "tier": one of Popular, Medium, Niche
- "volumeLabel": one of 10K–50K, 50K–250K, 250K–1M+, 1M+, Unknown (use en dash ranges; Unknown when uncertain)
- "score": integer 0–100
- "rationale": 1–2 short sentences

Example shape (one element shown; your response must be a full array of ${hashtagCount} objects):

[
  {
    "tag": "#skincareroutine",
    "tier": "Medium",
    "volumeLabel": "250K–1M+",
    "score": 78,
    "rationale": "High intent for this niche with room to rank versus mega-broad tags."
  }
]

Rules:
- Exactly ${hashtagCount} objects in the array, no duplicates.
- Use only valid hashtag strings for the 'tag' field.
- Do not include any extra keys, commentary, markdown, or prose outside the JSON array.

Post context (optional):
- Selected hook: ${selectedHook || 'Not provided'}
- Caption context: ${captionForPrompt || 'Not provided'}`;

    const regenNonce =
      typeof options.forceFreshRegeneration === 'string' && options.forceFreshRegeneration.trim()
        ? options.forceFreshRegeneration.trim().slice(0, 80)
        : '';
    if (regenNonce) {
      userMessage += `\n\n— Regeneration request (${regenNonce}) — Produce a substantively different set of hashtags (new tags and/or tier mix) while staying on-topic and platform-appropriate. Avoid repeating a previous default list.`;
    }

    const grokHashtagOpts = { mode: fullPostBuilder ? GROK_MODE_QUALITY : 'fast', max_tokens: 4096 };
    if (fullPostBuilder) {
      grokHashtagOpts.grok_debug_fullpost = true;
      grokHashtagOpts.grok_debug_fullpost_step = 'hashtags';
    }
    if (regenNonce) {
      grokHashtagOpts.forceCacheRefresh = true;
    }

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ], 0.4, grokHashtagOpts);
    const hashtagData = normalizeRankedHashtagData(parseJsonFromResponse(data.content), hashtagCount);

    if (hashtagData.length === 0) {
      throw new Error('Could not parse ranked hashtags response.');
    }

    const streamlined = fullPostBuilder || !hasRealtimeResearch;

    return {
      success: true,
      hashtags: data.content || '',
      hashtagData,
      citations: realtimeResearch.citations || [],
      research: liveResearchText,
      usage: data.usage,
      realtime: hasRealtimeResearch,
      streamlined,
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback: generate hashtags from the user's actual input
    const words = (topic || 'content').split(/\s+/).filter(w => w.length > 2);
    const baseTag = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    const fallbackHashtags = [
      { tag: `#${baseTag}`, score: 90, posts: '1.2M' },
      { tag: `#${words[0] || 'Content'}Tips`, score: 85, posts: '800K' },
      { tag: `#${words[0] || 'Content'}Life`, score: 80, posts: '500K' },
      { tag: `#${baseTag}Community`, score: 75, posts: '300K' },
      { tag: `#${words[0] || 'Content'}Goals`, score: 70, posts: '200K' },
    ];
    return {
      success: true,
      hashtags: fallbackHashtags.map(h => `${h.tag} (Score: ${h.score}%, ${h.posts} posts)`).join('\n'),
      hashtagData: fallbackHashtags,
      usage: { fallback: true },
      note: 'Using fallback hashtags due to API unavailability',
      realtime: false,
      streamlined: true,
    };
  }
}

export async function improveContent(content, suggestions, brandData) {
  try {
    const niche = getNiche(brandData);
    const systemPrompt = buildSystemPromptWithBrandBlock(
      `You are a content improvement specialist for ${niche}. Enhance content while maintaining brand voice.`,
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Improve this content based on these suggestions: ${suggestions.join(', ')}.

Original content:
${content}

Requirements:
- Address all suggestions
- Maintain the core message
- Keep the brand voice consistent
- Ensure it appeals to the target audience

Provide the improved version.`
      }
    ], 0.7, { mode: GROK_MODE_QUALITY });

    return {
      success: true,
      improvedContent: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Polish a voice transcript into a social media caption
 * @param {string} transcript - Raw voice transcript
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} platform - Target platform
 * @returns {Promise<Object>} Polished caption with hashtags
 */
export async function polishVoiceTranscript(transcript, brandData, platform = 'social media') {
  try {
    const systemPrompt = buildSystemPromptWithBrandBlock(
      'You are an expert social media content writer. Transform raw voice transcripts into polished, engaging social media captions while preserving the original message and intent.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Transform this voice transcript into a polished ${platform} caption:

"${transcript}"

Requirements:
- Keep the core message and intent
- Match the brand voice
- Fix any speech-to-text errors
- Add engaging hooks and CTAs
- Keep it concise and punchy
- Add 5-10 relevant hashtags at the end

Return ONLY the polished caption with hashtags, no explanations.`
      }
    ], 0.6, { mode: GROK_MODE_QUALITY });

    const content = data.content || '';
    
    // Separate caption from hashtags
    const hashtagMatch = content.match(/(#\w+\s*)+$/);
    const hashtags = hashtagMatch ? hashtagMatch[0].trim() : '';
    const caption = content.replace(/(#\w+\s*)+$/, '').trim();

    return {
      success: true,
      caption,
      hashtags,
      fullContent: content,
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate A/B caption variations
 * @param {string} originalCaption - Original caption to create variations of
 * @param {Object} brandData - Brand data from BrandContext
 * @param {number} count - Number of variations to generate
 * @returns {Promise<Object>} Array of caption variations
 */
export async function generateCaptionVariations(originalCaption, brandData, count = 3) {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    await simulateDelay(800, 1500);
    const mockVariations = [
      {
        id: 1,
        hookType: 'Question Hook',
        caption: `What if I told you this could change everything? 🤔\n\n${originalCaption.substring(0, 100)}...\n\nDrop a 💪 if you're ready to level up!`
      },
      {
        id: 2,
        hookType: 'Bold Statement',
        caption: `Stop scrolling. This is important. 🛑\n\n${originalCaption.substring(0, 100)}...\n\nSave this post for later - you'll thank me! 📌`
      },
      {
        id: 3,
        hookType: 'Story Hook',
        caption: `3 months ago, I never thought I'd be sharing this...\n\n${originalCaption.substring(0, 100)}...\n\nHas this ever happened to you? Comment below! 👇`
      }
    ];
    return {
      success: true,
      variations: mockVariations.slice(0, count),
      usage: { demo: true }
    };
  }

  try {
    const systemPrompt = buildSystemPromptWithBrandBlock(
      'You are an expert social media copywriter. Create engaging caption variations that test different hooks, tones, and CTAs while maintaining the core message.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Create ${count} unique variations of this caption, each with a different approach:

Original: "${originalCaption}"

For each variation:
1. Use a different hook style (question, bold statement, story, statistic)
2. Vary the CTA (comment, share, save, follow, link)
3. Keep the core message but change the tone slightly

Format as:
VARIATION 1: [Hook Type]
[Caption]

VARIATION 2: [Hook Type]
[Caption]

etc.`
      }
    ], 0.8, { mode: GROK_MODE_QUALITY });

    const content = data.content || '';
    
    // Parse variations
    const variations = [];
    const variationMatches = content.split(/VARIATION \d+:/i).filter(v => v.trim());
    
    variationMatches.forEach((v, index) => {
      const lines = v.trim().split('\n');
      const hookType = lines[0]?.replace(/^\[|\]$/g, '').trim() || `Variation ${index + 1}`;
      const caption = lines.slice(1).join('\n').trim();
      if (caption) {
        variations.push({ hookType, caption, id: index + 1 });
      }
    });

    return {
      success: true,
      variations: variations.length > 0 ? variations : [{ hookType: 'Original', caption: originalCaption, id: 1 }],
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    await simulateDelay(500, 800);
    const mockVariations = [
      {
        id: 1,
        hookType: 'Question Hook',
        caption: `What if I told you this could change everything? 🤔\n\n${originalCaption.substring(0, 100)}...\n\nDrop a 💪 if you're ready!`
      },
      {
        id: 2,
        hookType: 'Bold Statement',
        caption: `Stop scrolling. This is important. 🛑\n\n${originalCaption.substring(0, 100)}...\n\nSave this post! 📌`
      },
      {
        id: 3,
        hookType: 'Story Hook',
        caption: `3 months ago, I never thought I'd share this...\n\n${originalCaption.substring(0, 100)}...\n\nComment below! 👇`
      }
    ];
    return {
      success: true,
      variations: mockVariations.slice(0, count),
      usage: { fallback: true },
      note: 'Using demo variations due to API unavailability'
    };
  }
}

/**
 * Remix content with mode-specific system prompts
 * @param {string} content - Content to remix
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} mode - 'viral', 'sales', 'educational', or 'community'
 * @param {Array<string>} platforms - Target platforms for the remix output
 * @returns {Promise<Object>} Remixed content with { success, remixed, mode, usage }
 */
export async function remixContentWithMode(content, brandData, mode = 'viral', platforms = []) {
  try {
    const systemPrompts = {
      viral: "You are a Social Media Virality Expert. Your goal is maximum reach. Take the user's input and rewrite it to be punchy, relatable, and shareable. Use short sentences, trending formats, and emojis. Optimize for engagement, shares, and saves.",
      sales: "You are a Conversion Critic and Direct Response Copywriter. Your goal is revenue, not just views. Rewrite the user's input using the PAS (Problem-Agitation-Solution) framework. 1) Hook: Call out a specific customer pain point. 2) Body: Agitate the pain and present the offer as the solution. 3) CTA: Write an imperative Call to Action that requires a comment (e.g., 'Comment GUIDE'). 4) Objection: Add a P.S. handling a price or time objection.",
      educational: "You are an Educational Content Strategist. Your goal is to teach and provide value. Rewrite the user's input to be informative, clear, and actionable. Use numbered tips, bite-sized insights, and practical takeaways. Make the audience feel like they learned something valuable.",
      community: "You are a Community Building Expert. Your goal is to spark conversations and foster connection. Rewrite the user's input to invite discussion, share relatable experiences, and encourage audience participation. Use open-ended questions, polls, and 'this or that' formats."
    };

    const platformList = platforms.length > 0 ? platforms.join(', ') : 'Instagram, TikTok, X';

    const baseSystemPrompt = systemPrompts[mode] || systemPrompts.viral;
    const systemPrompt = buildSystemPromptWithBrandBlock(baseSystemPrompt, brandData);

    const modeLabels = {
      viral: 'maximum viral reach and engagement',
      sales: 'maximum sales conversion',
      educational: 'educational value and practical takeaways',
      community: 'community building and conversation'
    };
    const modeGoal = modeLabels[mode] || modeLabels.viral;

    const userPrompts = {
      sales: `Remix this content for ${modeGoal}: "${content}"

Create exactly 3 variations for each of these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Start with a pain-point hook that stops the scroll
- Agitate the problem to create urgency
- Present the solution naturally
- End with a comment-based CTA (e.g., "Comment READY to get started")
- Add a P.S. that handles a common objection
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section, and clearly label Variation 1, Variation 2, and Variation 3 for every platform.`,
      educational: `Remix this content for ${modeGoal}: "${content}"

Create exactly 3 variations for each of these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Start with a curiosity-driven hook
- Break down the information into clear, numbered tips or steps
- Use simple language and practical examples
- End with a takeaway or actionable next step
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section, and clearly label Variation 1, Variation 2, and Variation 3 for every platform.`,
      community: `Remix this content for ${modeGoal}: "${content}"

Create exactly 3 variations for each of these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Start with a relatable statement or shared experience
- Include open-ended questions to spark discussion
- Use "this or that" or poll-style formats where appropriate
- End with an invitation to share their own experience
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section, and clearly label Variation 1, Variation 2, and Variation 3 for every platform.`,
      viral: `Remix this trending content for ${modeGoal}: "${content}"

Create exactly 3 variations for each of these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Make it punchy and scroll-stopping
- Highly shareable and relatable
- Optimized for engagement and comments
- Include relevant emojis and trending formats
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section, and clearly label Variation 1, Variation 2, and Variation 3 for every platform.`
    };

    const userPrompt = userPrompts[mode] || userPrompts.viral;

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ], mode === 'sales' ? 0.7 : 0.8, { mode: GROK_MODE_QUALITY });

    return {
      success: true,
      remixed: data.content || '',
      ideas: data.content || '', // backward compat
      mode,
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate platform-specific remixes of content
 * @param {string} content - Original content to remix
 * @param {Object} brandData - Brand data from BrandContext
 * @param {Array} platforms - Array of platform names
 * @returns {Promise<Object>} Platform-specific versions
 */
export async function generatePlatformRemixes(originalContent, brandData, platforms = ['Instagram', 'TikTok', 'X', 'Facebook', 'YouTube']) {
  try {
    const systemPrompt = buildSystemPromptWithBrandBlock(
      'You are an expert cross-platform social media strategist. Adapt content for each platform while maintaining brand voice and maximizing engagement.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Adapt this content for each platform with platform-specific optimizations:

Original Content: "${originalContent}"

Platforms: ${platforms.join(', ')}

For each platform, consider:
- Character limits (Twitter: 280, Instagram: 2200)
- Hashtag best practices (Instagram: 10-15, Twitter: 2-3, TikTok: 3-5)
- Platform culture and tone
- Optimal CTA for that platform

Format as:
[PLATFORM_NAME]
Caption: [optimized caption]
Hashtags: [platform-appropriate hashtags]
---`
      }
    ], 0.7, { mode: GROK_MODE_QUALITY });

    const content_response = data.content || '';
    
    // Parse platform remixes
    const remixes = {};
    platforms.forEach(platform => {
      const regex = new RegExp(`\\[${platform}\\]([\\s\\S]*?)(?=\\[|---$|$)`, 'i');
      const match = content_response.match(regex);
      if (match) {
        const section = match[1];
        const captionMatch = section.match(/Caption:\s*([^\n]+(?:\n(?!Hashtags:)[^\n]+)*)/i);
        const hashtagMatch = section.match(/Hashtags:\s*([^\n]+)/i);
        remixes[platform.toLowerCase()] = {
          platform,
          caption: captionMatch ? captionMatch[1].trim() : originalContent,
          hashtags: hashtagMatch ? hashtagMatch[1].trim() : ''
        };
      }
    });

    return {
      success: true,
      remixes,
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: false,
      error: error.message,
      remixes: {}
    };
  }
}

/**
 * Generate visual/image content ideas
 * @param {string} prompt - Visual concept description
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} platform - Target platform for visual content
 * @param {'image'|'video'|'all'} mediaType - Type of media concepts to generate ('image' for static, 'video' for motion, 'all' for mixed)
 * @returns {Promise<Object>} Generated visual ideas
 */
export async function generateVisualIdeas(prompt, brandData, platform = 'instagram', mediaType = 'all') {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    await simulateDelay(1000, 2000);
    const mockIdeas = getVisualIdeaMocks(platform, 4, mediaType);
    return {
      success: true,
      ideas: mockIdeas.map((idea, i) => 
        `${i + 1}. ${idea.title}\n   Description: ${idea.description}\n   Style: ${idea.style}\n   Format: ${idea.type}\n   Platform: ${idea.platform}`
      ).join('\n\n'),
      visualData: mockIdeas,
      usage: { demo: true }
    };
  }

  const isVideo = mediaType === 'video';
  const isImage = mediaType === 'image';
  const isMixed = mediaType === 'all';

  try {
    const platformData = getPlatform(platform);
    const platformContext = buildPlatformContext(platform, 'visual');
    
    const systemRole = isVideo
      ? 'You are a video content strategist. Create compelling short-form and long-form video concepts (reels, tutorials, vlogs, clips) that align with brand identity. Focus exclusively on motion/video content — do NOT suggest static images or graphics.'
      : isImage
        ? 'You are a visual content strategist. Create compelling static image and graphic concepts (photos, carousels, infographics, quote cards) that align with brand identity. Focus exclusively on still imagery — do NOT suggest videos or reels.'
        : 'You are a visual content strategist. Create compelling image and video concepts that align with brand identity.';

    const systemPrompt = buildSystemPromptWithBrandBlock(systemRole, brandData);

    const formatGuidance = isVideo
      ? `MEDIA TYPE: VIDEO/MOTION CONTENT ONLY
- Suggest only video formats: reels, short clips, tutorials, vlogs, stories, TikToks
- Include duration suggestions (e.g., 15s, 30s, 60s)
- Suggest music/audio style, transitions, and pacing
- Do NOT suggest static images, photos, or graphics`
      : isImage
        ? `MEDIA TYPE: STATIC IMAGE/GRAPHIC CONTENT ONLY
- Suggest only image formats: photos, graphics, carousels, infographics, quote cards
- Include composition, color palette, and layout suggestions
- Suggest text overlay and typography if applicable
- Do NOT suggest videos, reels, or motion content`
        : `MEDIA TYPE: MIXED (IMAGES AND VIDEOS)
- Include a mix of static image and video/motion concepts
- For images: include composition, color palette, and layout suggestions
- For videos: include duration, pacing, and audio/music suggestions`;

    const contentLabel = isVideo ? 'video/motion' : isImage ? 'image/graphic' : 'visual';

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Generate 4 ${contentLabel} content ideas for: "${prompt}"

${platformContext}

${formatGuidance}

PLATFORM-SPECIFIC REQUIREMENTS:
- Optimize for ${platformData?.name || 'social media'}
- Consider ${platformData?.contentFormats?.join(', ') || 'various formats'}
- Match ${platformData?.audienceStyle || 'engaging visual style'}

For each idea, include:
- ${isMixed ? 'Visual/video' : isVideo ? 'Video' : 'Visual'} concept description optimized for ${platformData?.name || 'social media'}
- Recommended format
${isVideo ? '- Suggested duration and pacing\n- Audio/music style' : isImage ? '- Color palette suggestions\n- Composition and layout tips' : '- Color palette or audio/pacing suggestions as appropriate'}
- Why this works for ${platformData?.name || 'this platform'}

Make sure all concepts align with the brand identity and appeal to the target audience.
The content should be specifically relevant to the topic: "${prompt}"

Number them 1-4.`
      }
    ], 0.8, { mode: GROK_MODE_QUALITY });

    return {
      success: true,
      ideas: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    await simulateDelay(500, 1000);
    const mockIdeas = getVisualIdeaMocks(platform, 4, mediaType);
    return {
      success: true,
      ideas: mockIdeas.map((idea, i) => 
        `${i + 1}. ${idea.title}\n   Description: ${idea.description}\n   Style: ${idea.style}\n   Format: ${idea.type}\n   Platform: ${idea.platform}`
      ).join('\n\n'),
      visualData: mockIdeas,
      usage: { fallback: true },
      note: `Using demo ${mediaType} ideas due to API unavailability`
    };
  }
}

/**
 * Generate visual brainstorm results — AI Image Prompts or Manual Shoot Guide
 * @param {Object} params - { topic, platform, contentFormat, outputType }
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Generated prompts or shoot guide
 */
export async function generateVisualBrainstorm(params, brandData) {
  const { topic, platform, contentFormat, outputType } = params;

  // Demo mode fallback
  if (isDemoMode()) {
    await simulateDelay(1000, 2000);
    if (outputType === 'ai-prompt') {
      return {
        success: true,
        type: 'ai-prompt',
        prompts: [
          `Silhouette of a person doing ${topic}, golden hour lighting, warm orange and purple sky, gentle atmosphere, shot from low angle, cinematic composition, 4:5 aspect ratio for ${platform}`,
          `Flat lay arrangement themed around ${topic}, minimalist aesthetic, soft natural light, pastel color palette, overhead shot, clean composition, square format`,
          `Dynamic action shot capturing the essence of ${topic}, vibrant colors, motion blur effect, shallow depth of field, editorial style photography, vertical format for mobile`
        ]
      };
    }
    return {
      success: true,
      type: 'shoot-guide',
      guide: {
        shotList: [
          `Wide establishing shot capturing the full scene of ${topic}`,
          `Close-up detail shot highlighting textures and key elements`,
          `Over-the-shoulder or POV perspective for viewer immersion`,
          `Behind-the-scenes candid moment showing authenticity`
        ],
        lighting: `Natural golden hour lighting recommended for ${topic}. Shoot during the first/last hour of sunlight for warm, flattering tones. If shooting indoors, position near large windows for soft diffused light.`,
        composition: `Use the rule of thirds to place your subject off-center. Try shooting from a low angle to add drama and presence. Include leading lines to draw the viewer's eye to the focal point.`,
        propsAndStyling: `Keep it minimal and authentic. Include items that relate directly to ${topic}. Use complementary colors that align with your brand palette. Ensure the background is clean and uncluttered.`,
        moodAndPalette: `Aim for an aspirational yet approachable mood. Color palette: warm earth tones mixed with your brand colors. The overall vibe should feel authentic, not overly staged.`,
        platformTips: `For ${platform} ${contentFormat}: Use ${contentFormat === 'Reel' || contentFormat === 'Video' || contentFormat === 'Story' ? '9:16 vertical' : contentFormat === 'Image' ? '4:5 portrait or 1:1 square' : '4:5 portrait'} aspect ratio. ${contentFormat === 'Carousel' ? 'Plan 5-8 slides with a strong cover image and clear visual progression.' : contentFormat === 'Reel' || contentFormat === 'Video' ? 'Keep it under 60 seconds. Hook in the first 2 seconds.' : 'Make the first image scroll-stopping — bold colors or intriguing composition.'}`
      }
    };
  }

  try {
    const platformData = getPlatform(platform);
    const platformContext = buildPlatformContext(platform, 'visual');
    const niche = getNiche(brandData, topic || 'creator content');
    const audience = getTargetAudience(brandData, 'general audience');
    const modelFormat = normalizeVisualFormatLabel(contentFormat);
    const targetOutputKey = outputType === 'ai-prompt' ? 'ai_image_prompt' : 'manual_shoot_guide';

    const visualResearch = await getRealtimeVisualPatterns(
      { topic, platform, contentFormat },
      brandData
    );
    const researchText = visualResearch.success ? (visualResearch.research || '').trim() : '';
    const researchBlock = researchText
      ? `Research context (live web signals):\n${researchText}\n`
      : 'Research context: Live visual trend scan unavailable — rely on platform-native visual strategy.\n';

    const systemPrompt = buildAIPowerBrainSystemPrompt(
      'visuals',
      brandData,
      `${buildPromptGuardrails({ readyToUse: true })}

Return ONLY valid JSON (no markdown): a JSON array of 3–6 VisualConcept objects exactly as specified in the user message.`
    );

    const userMessage = `${buildPromptBrandSection(brandData, {
      niche,
      targetAudience: audience,
      platforms: [platform],
    })}

${researchBlock}
Visual brainstorm request:
- Topic: ${topic}
- Platform: ${platformData?.name || platform}
- Content format (UI): ${contentFormat}
- Normalized format enum: ${modelFormat}
- Output mode: ${targetOutputKey} (${outputType === 'ai-prompt' ? 'AI image prompts' : 'manual shoot guide'})
${platformContext}

Rules:
- If output mode is ai_image_prompt: each concept's "promptOrGuide" must be one copy-paste AI image prompt (camera, lighting, composition, aspect ratio, style). 40–120 words.
- If output mode is manual_shoot_guide: each concept's "promptOrGuide" is a practical shoot brief; "sceneBeats" must list 3–7 ordered shots or moments.
- Every object must set "outputType" to "${targetOutputKey}" and "format" to "${modelFormat}".
- Vary conceptTitle, visualMotifs, hookAlignment, and difficulty across concepts.

Return ONLY a JSON array of 3–6 objects:
{
  "conceptTitle": string,
  "format": "image" | "carousel" | "video" | "story" | "reel",
  "outputType": "ai_image_prompt" | "manual_shoot_guide",
  "promptOrGuide": string,
  "sceneBeats": string[],
  "visualMotifs": string[],
  "hookAlignment": string,
  "difficulty": "easy" | "medium" | "advanced"
}`;

    const data = await callGrokAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      outputType === 'ai-prompt' ? 0.8 : 0.7,
      { mode: GROK_MODE_QUALITY },
    );

    const parsed = parseJsonFromResponse(data.content || '');

    if (outputType === 'ai-prompt') {
      let prompts = [];
      if (Array.isArray(parsed)) {
        const concepts = parsed.filter((c) => c && (c.outputType === 'ai_image_prompt' || !c.outputType));
        prompts = concepts.map((c) => String(c.promptOrGuide || '').trim()).filter(Boolean);
      }
      if (prompts.length < 3 && Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
        prompts = parsed.map(String).filter(Boolean);
      }
      if (prompts.length === 0) {
        try {
          const content = data.content || '';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const arr = JSON.parse(jsonMatch[0]);
            if (Array.isArray(arr)) {
              prompts = arr.filter((x) => typeof x === 'string').map(String);
            }
          }
        } catch {
          prompts = (data.content || '').split(/\d+\./).filter((p) => p.trim()).map((p) => p.trim());
        }
      }
      return {
        success: true,
        type: 'ai-prompt',
        prompts: prompts.slice(0, 6),
        usage: data.usage,
        visualConcepts: Array.isArray(parsed) ? parsed : undefined,
        research: researchText,
        realtime: Boolean(researchText),
      };
    }

    let guide = null;
    if (Array.isArray(parsed) && parsed.length) {
      const manual = parsed.filter(
        (c) => c && (c.outputType === 'manual_shoot_guide' || !c.outputType)
      );
      guide = shootGuideFromVisualConcepts(
        manual.length ? manual : parsed,
        topic,
        platformData?.name || platform,
        contentFormat
      );
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.shotList)) {
      guide = parsed;
    }

    if (!guide) {
      guide = {
        shotList: [`Wide shot of ${topic}`, `Close-up detail shot`, `Action/movement capture`, `Behind-the-scenes candid`],
        lighting: `Use natural light when possible for ${topic}. Golden hour provides the most flattering tones.`,
        composition: `Rule of thirds with the subject slightly off-center. Try multiple angles.`,
        propsAndStyling: `Keep props minimal and directly related to ${topic}. Ensure clean backgrounds.`,
        moodAndPalette: `Aim for an authentic, aspirational mood with warm tones.`,
        platformTips: `Optimize for ${platformData?.name || platform} ${contentFormat} format and aspect ratio.`,
      };
    }

    return {
      success: true,
      type: 'shoot-guide',
      guide,
      usage: data.usage,
      visualConcepts: Array.isArray(parsed) ? parsed : undefined,
      research: researchText,
      realtime: Boolean(researchText),
    };
  } catch (error) {
    console.error('Visual brainstorm error:', error);
    return { success: false, error: error.message || 'Failed to generate visual brainstorm' };
  }
}

/**
 * Score how "human" vs AI-generated content sounds.
 * Returns structured JSON with overall score, 4 dimension scores, and flagged phrases.
 */
export async function scoreHumanness(content, brandData = null, options = {}) {
  if (isDemoMode()) {
    await simulateDelay(800, 1500);
    return {
      success: true,
      score: {
        overall: 72,
        label: 'Mostly natural',
        dimensions: {
          sentenceVariety: { score: 78, feedback: 'Good mix of sentence lengths. One run-on sentence in paragraph 2.' },
          naturalVocabulary: { score: 65, feedback: 'Flagged 2 AI-typical phrases: "delve into" and "it\'s important to note".' },
          voiceConsistency: { score: 80, feedback: 'Tone mostly matches brand voice. Slight formality drift in closing.' },
          conversationalFlow: { score: 68, feedback: 'Transitions between paragraphs feel slightly mechanical.' },
        },
        flaggedPhrases: [
          { original: 'delve into this topic', suggestion: 'dig into this topic', dimension: 'naturalVocabulary' },
          { original: "It's important to note that", suggestion: 'Here\'s the thing —', dimension: 'naturalVocabulary' },
        ],
      },
      usage: { demo: true },
    };
  }

  try {
    const creatorBlock = buildCreatorBrandBlock(brandData, brandData); // HUTTLE AI: brand context injected
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const brandSection = brandContext ? `\n\nBrand Voice Profile:\n${brandContext}` : '';
    const creatorName = brandData?.brandName || brandData?.firstName || 'this creator';
    const creatorNiche = brandData?.niche || 'their niche';
    const creatorTone = brandData?.brandVoice || 'authentic';
    const creatorAudience = brandData?.targetAudience || 'their audience';

    const messages = [
      {
        role: 'system',
        content: `${creatorBlock}You are Human Voice Analyst — an expert in distinguishing AI-generated text from authentic human writing. You evaluate content strictly on how natural, human, and voice-consistent it sounds — NOT on grammar, quality, or persuasion.

Evaluate whether this content sounds authentically like ${creatorName}, a ${creatorNiche} creator with a ${creatorTone} voice targeting ${creatorAudience}.

SCORING DIMENSIONS (each 0–100):
- sentenceVariety: Do sentences vary in length and structure, or is there a repetitive pattern typical of LLMs?
- naturalVocabulary: Are there AI-typical phrases like "delve into", "it's important to note", "in today's world", "comprehensive guide", "in conclusion", "Moreover", "Furthermore", "landscape"? Flag each one.
- voiceConsistency: Does the tone match the provided brand voice profile? Flag any drift from ${creatorTone} voice.
- conversationalFlow: Do transitions feel natural or stiff? Does it read like speech or like a textbook?

OVERALL SCORE (0–100):
- 80-100: "Sounds like you"
- 60-79: "Mostly natural"
- 40-59: "Slightly robotic"
- 0-39: "AI detectable"

OUTPUT — Return ONLY valid JSON:
{
  "overall": 72,
  "label": "Mostly natural",
  "dimensions": {
    "sentenceVariety": { "score": 78, "feedback": "specific observation" },
    "naturalVocabulary": { "score": 65, "feedback": "specific observation" },
    "voiceConsistency": { "score": 80, "feedback": "specific observation" },
    "conversationalFlow": { "score": 68, "feedback": "specific observation" }
  },
  "flaggedPhrases": [
    { "original": "exact phrase from content", "suggestion": "more natural alternative", "dimension": "naturalVocabulary" }
  ]
}

RULES:
- Flag a minimum of 1 phrase and maximum of 5
- Each suggestion must be a drop-in replacement, not a rewrite of the whole sentence
- Never score above 90 unless the content genuinely reads like casual human speech
- Typical AI-sounding content should often land in the 40-70 range, not 80+
- Heavily penalize phrases like "In today's world", "It's important to", "As a [niche] professional", "In conclusion", "delve into", "Moreover", and "Furthermore"
- Do not evaluate content quality, grammar, or marketing effectiveness

${buildPromptGuardrails()}`,
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData)}

Analyze how human this content sounds. Score it and flag specific AI-sounding phrases with natural alternatives.${brandSection}

Content:
${truncateForAiPrompt(content, 8000)}`,
      },
    ];
    const fp = options.fullPostBuilder === true;
    const grokHumanOpts = { mode: fp ? GROK_MODE_QUALITY : 'fast', max_tokens: 2048 };
    if (fp) {
      grokHumanOpts.grok_debug_fullpost = true;
      grokHumanOpts.grok_debug_fullpost_step = 'humanizer';
    }
    const data = await callGrokAPI([...messages], 0.3, grokHumanOpts);

    const parsed = parseJsonFromResponse(data.content);
    if (parsed) {
      return { success: true, score: parsed, usage: data.usage };
    }
    if (fp) {
      return { success: true, unavailable: true, usage: data.usage };
    }
    return { success: true, rawAnalysis: data.content, usage: data.usage };
  } catch (error) {
    if (options.fullPostBuilder) {
      console.warn('Humanizer score skipped:', error?.message);
      return { success: true, unavailable: true };
    }
    console.error('Humanizer score error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Auto-improve a flagged phrase to sound more human.
 */
export async function autoImprovePhrase(fullContent, originalPhrase, brandData = null) {
  try {
    const messages = [
      {
        role: 'system',
        content: `You rewrite the full sentence containing the flagged phrase so it sounds more natural, human, and brand-consistent. You may lightly smooth the neighboring sentence if needed, but do not rewrite the whole draft. Pass a clear "make this more human" instruction through your rewrite. Return ONLY the improved full content with the local edit applied — no explanation, no JSON.

${buildPromptBrandSection(brandData)}`,
      },
      {
        role: 'user',
        content: `Replace this phrase: "${originalPhrase}"

Full content:
${fullContent}

Return the full content with that phrase rewritten to sound more human. Keep the meaning intact, avoid AI clichés, and make the local edit feel genuinely different.`,
      },
    ];
    const data = await callGrokAPI([...messages], 0.5, { mode: GROK_MODE_QUALITY });

    return { success: true, improvedContent: data.content || fullContent, usage: data.usage };
  } catch (error) {
    console.error('Auto-improve error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Predict performance of content on a given platform.
 * trendContext comes from a prior Perplexity search.
 */
export async function predictPerformance(content, platform, trendContext, brandData = null) {
  if (isDemoMode()) {
    await simulateDelay(1000, 2000);
    return {
      success: true,
      prediction: {
        engagementLevel: 'High',
        reachPotential: 'Growing',
        reachRange: '500-5K',
        platformFitScore: 78,
        platformFitNote: `This content is optimized for ${platform} at 78%.`,
        trendAlignment: 72,
        trendAlignmentNote: 'Topic aligns with 2 currently trending themes in your niche.',
        bestPostingWindow: 'Tuesday-Thursday, 7-9 PM',
        confidence: 'Medium',
        confidenceNote: 'Based on caption + hashtags. Add a hook for higher confidence.',
        reasoning: 'Content structure follows current high-performing patterns. Strong emotional hook but could benefit from a more specific CTA.',
      },
      usage: { demo: true },
    };
  }

  try {
    const creatorBlock = buildCreatorBrandBlock(brandData, brandData); // HUTTLE AI: brand context injected
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const messages = [
      {
        role: 'system',
        content: `${creatorBlock}You are Performance Predictor — a data analyst who evaluates social media content against current platform signals and trend alignment. You are cautious and honest. Never claim high confidence. Always label output as AI prediction.

OUTPUT — Return ONLY valid JSON:
{
  "engagementLevel": "Low" | "Medium" | "High" | "Viral Potential",
  "reachPotential": "Niche" | "Growing" | "Breakout" | "Trending",
  "reachRange": "under 500 views" | "500-5K" | "5K-50K" | "50K+",
  "platformFitScore": 78,
  "platformFitNote": "This content is optimized for [platform] at X%.",
  "trendAlignment": 72,
  "trendAlignmentNote": "one sentence",
  "bestPostingWindow": "Tuesday-Thursday, 7-9 PM",
  "confidence": "Low" | "Medium",
  "confidenceNote": "brief reason for confidence level",
  "reasoning": "2-3 sentence analysis"
}

RULES:
- Never set confidence to "High" — always "Low" or "Medium"
- platformFitScore under 60 must include a better-fitting platform suggestion in platformFitNote
- Base engagement prediction on content structure, not just topic
- If trendContext is provided, use it for trendAlignment scoring`,
      },
      {
        role: 'user',
        content: `Predict the performance of this content on ${platform}.
${brandContext ? `\nBrand context:\n${brandContext}` : ''}
${trendContext ? `\nCurrent trend context for this niche on ${platform}:\n${trendContext}` : ''}

Content:
${content}`,
      },
    ];
    let data;
    try {
      data = await callClaudeAPI([...messages], 0.3);
    } catch (claudeError) {
      if (claudeError.message?.includes('coming soon')) {
        data = await callGrokAPI([...messages], 0.3, { mode: GROK_MODE_QUALITY });
      } else {
        throw claudeError;
      }
    }

    const parsed = parseJsonFromResponse(data.content);
    if (parsed) {
      return { success: true, prediction: parsed, usage: data.usage };
    }
    return { success: true, rawAnalysis: data.content, usage: data.usage };
  } catch (error) {
    console.error('Performance prediction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze niche research data and generate structured content ideas.
 */
export async function analyzeNiche(researchData, brandData, platform = 'instagram') {
  if (isDemoMode()) {
    await simulateDelay(1500, 2500);
    return {
      success: true,
      analysis: {
        trendingThemes: [
          { name: 'Behind-the-scenes content', why: 'Audiences crave authenticity over polished content.', bestFormat: 'Reel', momentum: 'Rising' },
          { name: 'Myth-busting posts', why: 'Controversial takes drive massive comment engagement.', bestFormat: 'Carousel', momentum: 'Peaking' },
          { name: 'Day-in-the-life', why: 'Relatable lifestyle content builds parasocial connection.', bestFormat: 'Reel', momentum: 'Rising' },
        ],
        hookPatterns: [
          'How I [result] in [timeframe] without [common objection]',
          'The [adjective] truth about [topic] nobody tells you',
          'Stop doing [common mistake] — here\'s what works instead',
          'I tested [method] for [timeframe]. Here\'s what happened...',
        ],
        contentGaps: [
          { topic: 'Budget-friendly alternatives', reason: 'High search volume but few creators covering this angle.', label: 'Untapped Opportunity' },
          { topic: 'Common mistakes beginners make', reason: 'Questions flooding comments but no dedicated content.', label: 'Untapped Opportunity' },
        ],
        contentIdeas: [
          { title: '5 myths holding you back', format: 'Carousel', hook: 'Everyone believes #3 but it\'s completely wrong...', platformFit: 'Instagram' },
          { title: 'My morning routine breakdown', format: 'Reel', hook: 'I changed one thing and it changed everything.', platformFit: 'TikTok' },
          { title: 'The tool nobody talks about', format: 'Static Post', hook: 'I\'ve been keeping this secret for 6 months.', platformFit: 'Instagram' },
          { title: 'Honest review after 90 days', format: 'Reel', hook: 'Here\'s what they don\'t show you...', platformFit: 'TikTok' },
          { title: 'Beginner vs. Pro comparison', format: 'Carousel', hook: 'Which one are you? Slide to find out.', platformFit: 'Instagram' },
        ],
      },
      usage: { demo: true },
    };
  }

  try {
    const creatorBlock = buildCreatorBrandBlock(brandData, brandData); // HUTTLE AI: brand context injected
    const brandContext = brandData ? `${creatorBlock}${buildBrandContext(brandData)}` : '';
    const structuredResearch = normalizeResearchPayload(researchData);
    const researchContext = structuredResearch
      ? JSON.stringify(structuredResearch, null, 2)
      : String(researchData || '').trim();
    const messages = [
      {
        role: 'system',
        content: `You are a social media content strategist. Analyze the research data provided and classify each trend with a momentum label (Rising, Peaking, or Declining) based on signal strength. Generate specific, actionable content ideas and hooks a creator can use immediately.

OUTPUT — Return ONLY valid JSON:
{
  "trendingThemes": [
    { "name": "Theme name", "why": "Why it's working (1-2 sentences)", "bestFormat": "Reel|Carousel|Static|Story", "momentum": "Rising|Peaking|Declining" }
  ],
  "hookPatterns": [
    "How I [result] in [timeframe] without [common objection]"
  ],
  "contentGaps": [
    { "topic": "Underserved topic", "reason": "Why this is an opportunity", "label": "Untapped Opportunity" }
  ],
  "contentIdeas": [
    {
      "title": "Specific executable content idea",
      "format": "Reel|Carousel|Static",
      "hook": "Suggested opening hook",
      "platformFit": "Platform name",
      "momentum": "Rising|Peaking|Declining",
      "whyThisWorks": "Specific reason tied back to the research",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }
  ]
}

RULES:
- trendingThemes: 3-5 themes, each with momentum badge
- hookPatterns: 3-4 fillable templates with [brackets]
- contentGaps: 2-3 underserved topics with clear audience demand
- contentIdeas: 6-10 original ideas, specific enough to execute immediately (prioritize strongest first)
- Every momentum field must be exactly one of: Rising, Peaking, Declining
- Every content idea must be niche-specific, platform-specific, and grounded in the research findings
- Every content idea must include a direct hook, a momentum label, a whyThisWorks explanation, and 3-5 relevant hashtags
- All ideas must be original and aligned with the brand voice
- Never copy or closely paraphrase existing content
- Use competitor patterns and momentum_signals when provided
- Rank the content ideas from strongest opportunity to weakest opportunity`,
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, { platforms: [platform] })}

Based on this niche research, generate content intelligence:

Research data:
${researchContext}

Target platform: ${platform}
${brandContext ? `\nBrand profile:\n${brandContext}` : ''}

Generate trending themes, hook patterns, content gaps, and 6-10 ranked original content ideas.

For content ideas:
- Make them immediately executable, not generic
- Translate the research into opportunities for THIS user
- Use "Rising" when the research suggests the topic is gaining traction, "Peaking" when it is hottest now, and "Declining" when it is fading
- Include 3-5 relevant hashtags for each idea
- Include one strong hook per idea`,
      },
    ];
    const data = await callGrokAPI(messages, 0.7, { mode: GROK_MODE_QUALITY, max_tokens: 4096 });

    const parsed = parseJsonFromResponse(data.content);
    const normalizedAnalysis = normalizeNicheAnalysisPayload(parsed, platform);
    if (normalizedAnalysis && nicheAnalysisHasRenderableContent(normalizedAnalysis)) {
      return { success: true, analysis: normalizedAnalysis, usage: data.usage };
    }
    const textFallback = String(data.content || '').trim();
    if (textFallback.length > 0) {
      const platformName = getPlatform(platform)?.name || platform || 'Instagram';
      return {
        success: true,
        analysis: {
          trendingThemes: [
            {
              name: 'Key signals from your research',
              why: 'The model returned narrative output instead of strict JSON; here is a structured starting point.',
              bestFormat: 'Reel',
              momentum: 'Rising',
            },
          ],
          hookPatterns: [
            'The part of {{topic}} everyone gets wrong (and what to do instead)',
            'I almost quit {{topic}} until I changed this one habit',
          ],
          contentGaps: [
            {
              topic: 'Deeper how-to for beginners',
              reason: 'Research suggests demand for step-by-step, non-fluff guidance.',
              label: 'Untapped Opportunity',
            },
          ],
          contentIdeas: [
            {
              title: 'Turn research into a punchy POV post',
              format: 'Reel',
              hook: textFallback.slice(0, 180),
              platformFit: platformName,
              momentum: 'Rising',
              whyThisWorks: 'Lead with the strongest sentence from the research narrative, then expand in-caption.',
              hashtags: ['#creator', '#content', '#growth'],
            },
          ],
        },
        usage: data.usage,
        note: 'relaxed_json_parse',
      };
    }
    return { success: false, error: 'Could not extract structured niche analysis from the model response.' };
  } catch (error) {
    console.error('Niche analysis error:', error);
    return { success: false, error: error.message };
  }
}

function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text.trim());
  } catch {
    /* continue */
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ }
  }
  const bracketMatch = text.match(/\[[\s\S]*\]/);
  if (bracketMatch) {
    try { return JSON.parse(bracketMatch[0]); } catch { /* continue */ }
  }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
  }
  return null;
}
