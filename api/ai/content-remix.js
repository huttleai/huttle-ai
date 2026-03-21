/**
 * Content Remix Claude Proxy Endpoint
 *
 * Uses Claude Sonnet for Content Remix Studio while keeping API keys server-side.
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { checkPersistentRateLimit } from '../_utils/persistent-rate-limit.js';
import { logError, logInfo } from '../_utils/observability.js';
import { buildSystemPrompt, buildPromptBrandSection } from '../../src/utils/brandContextBuilder.js';
import { buildBrandContext as buildCreatorBrandBlock } from '../../src/utils/buildBrandContext.js'; // HUTTLE AI: brand context injected

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6-20250514';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const REQUEST_TIMEOUT_MS = 44000;
const EXPECTED_VARIATION_COUNT = 3;

const BASE_SYSTEM_PROMPT = 'You are a professional content strategist and copywriter specializing in viral social media content. Your goal is to deliver the most accurate, platform-specific, and conversion-optimized content remixes possible. Deeply understand the user\'s original content, their selected mode (Viral Reach or Sales Conversion), and the target platforms, then generate variations that feel native to each platform.';
const NO_FABRICATED_STATS_GUARDRAIL = 'Do not invent specific statistics, percentages, testimonials, or performance claims. If the source content does not include proof, keep the language persuasive without fabricating evidence.';
const READY_TO_USE_GUARDRAIL = 'Every variation must be copy-paste ready with no placeholders like [insert link] or [brand name here].';

function normalizePlatformList(platforms) {
  if (!Array.isArray(platforms)) return [];

  return platforms
    .map((platform) => (typeof platform === 'string' ? platform.trim() : ''))
    .filter(Boolean);
}

function normalizeMode(mode) {
  const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';

  if (normalizedMode === 'sales' || normalizedMode === 'sales_conversion') {
    return { requestedMode: normalizedMode || 'sales_conversion', normalizedMode: 'sales_conversion' };
  }

  if (
    normalizedMode === 'viral'
    || normalizedMode === 'viral_reach'
    || normalizedMode === 'educational'
    || normalizedMode === 'community'
  ) {
    return { requestedMode: normalizedMode || 'viral_reach', normalizedMode: 'viral_reach' };
  }

  return { requestedMode: normalizedMode || 'viral_reach', normalizedMode: 'viral_reach' };
}

function getModeInstructions(requestedMode, normalizedMode) {
  if (normalizedMode === 'sales_conversion') {
    return `PRIMARY GOAL: Sales Conversion
- Use a clear PAS-style structure: pain point, agitation, solution, CTA
- Focus on action, urgency, trust, and objection handling
- Use stronger offer framing and direct next steps
- End each variation with a specific conversion-oriented CTA`;
  }

  if (requestedMode === 'educational') {
    return `PRIMARY GOAL: Viral Reach
SUB-ANGLE: Educational
- Lead with a useful insight, myth, or practical takeaway
- Make the content easy to save and share
- Use clear structure, quick lessons, or step-based formatting
- Keep it highly platform-native while preserving a value-first teaching angle`;
  }

  if (requestedMode === 'community') {
    return `PRIMARY GOAL: Viral Reach
SUB-ANGLE: Community Building
- Lead with relatability, identity, or shared experiences
- Invite comments, replies, or audience participation
- Use prompts that create conversation without sounding forced
- Keep the format native to each platform while prioritizing connection`;
  }

  return `PRIMARY GOAL: Viral Reach
- Optimize for scroll-stopping hooks, retention, saves, and shares
- Use punchy structure, strong specificity, and platform-native phrasing
- Favor relatability, curiosity, and momentum over polished corporate language
- End each variation with a light engagement-oriented CTA when it fits naturally`;
}

function buildUserPrompt({
  originalContent,
  requestedMode,
  normalizedMode,
  platforms,
  brandVoice,
  additionalContext,
}) {
  const niche = additionalContext?.niche || 'General';
  const targetAudience = additionalContext?.targetAudience || 'General audience';
  const promptBrandSection = buildPromptBrandSection({
    ...additionalContext,
    brandVoice,
    platforms,
    niche,
    targetAudience,
  }, {
    tone: brandVoice,
    platforms,
    niche,
    targetAudience,
  });

  const formatExample = [
    '### Instagram',
    'Variation 1: ...',
    '',
    'Variation 2: ...',
    '',
    'Variation 3: ...',
    '',
    '### TikTok',
    'Variation 1: ...',
    '',
    'Variation 2: ...',
    '',
    'Variation 3: ...',
  ].join('\n');

  return `${promptBrandSection}

${getModeInstructions(requestedMode, normalizedMode)}

SOURCE CONTENT:
${originalContent}

TARGET PLATFORMS:
${platforms.join(', ')}

BRAND VOICE:
${brandVoice || 'Professional and engaging'}

AUDIENCE CONTEXT:
- Niche: ${niche}
- Target audience: ${targetAudience}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON.
- Use this exact shape:
{
  "sections": [
    {
      "platform": "Instagram",
      "variations": [
        "Variation text 1",
        "Variation text 2",
        "Variation text 3"
      ]
    }
  ]
}
- Include exactly one section per requested platform, in the same order they were requested.
- Each platform must include exactly ${EXPECTED_VARIATION_COUNT} variations.
- Each variation must be fully written and ready to post.
- Adapt cadence, hook style, CTA style, and formatting to the platform.
- Do not include markdown, commentary, or explanation outside the JSON object.
- Never omit the platform name or variations array.
- If the source content lacks details, make the remix stronger and clearer without fabricating facts.

PLATFORM FORMAT EXAMPLE:
${formatExample}`;
}

function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;

  try {
    return JSON.parse(text.trim());
  } catch {
    // continue
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // continue
    }
  }

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch?.[0]) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // continue
    }
  }

  return null;
}

function sanitizeVariationText(value) {
  if (typeof value !== 'string') return '';

  const withoutBoldMarkdown = value.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\r\n/g, '\n');
  const withoutStandaloneLabels = withoutBoldMarkdown
    .split('\n')
    .filter((line) => !/^\s*(?:#+\s*)?(?:variation|option|version)\s*\d+\s*:?\s*$/i.test(line.trim()))
    .join('\n');

  return withoutStandaloneLabels
    .replace(/^\s*(?:#+\s*)?(?:variation|option|version)\s*\d+\s*[:.-]?\s*/i, '')
    .trim();
}

function normalizeSections(rawSections, requestedPlatforms) {
  const requestedLookup = new Map(
    requestedPlatforms.map((platform) => [platform.toLowerCase(), platform])
  );

  const normalizeVariation = (variation) => {
    if (typeof variation === 'string') return sanitizeVariationText(variation);
    if (variation && typeof variation === 'object') {
      if (typeof variation.content === 'string') return sanitizeVariationText(variation.content);
      if (typeof variation.text === 'string') return sanitizeVariationText(variation.text);
    }
    return '';
  };

  const splitVariationBlock = (value) => {
    const normalizedValue = normalizeVariation(value);
    if (!normalizedValue) return [];

    const numberedVariations = normalizedValue
      .split(/(?:^|\n)\s*(?:\d+[.)]\s+|(?:Variation|Option|Version)\s*\d+[:.\s]+)/i)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (numberedVariations.length >= EXPECTED_VARIATION_COUNT) {
      return numberedVariations.slice(0, EXPECTED_VARIATION_COUNT);
    }

    const paragraphVariations = normalizedValue
      .split(/\n{2,}/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (paragraphVariations.length >= EXPECTED_VARIATION_COUNT) {
      return paragraphVariations.slice(0, EXPECTED_VARIATION_COUNT);
    }

    return [normalizedValue];
  };

  const normalizeVariations = (value) => {
    if (Array.isArray(value)) {
      return value
        .flatMap((variation) => splitVariationBlock(variation))
        .filter(Boolean)
        .slice(0, EXPECTED_VARIATION_COUNT);
    }

    return splitVariationBlock(value).slice(0, EXPECTED_VARIATION_COUNT);
  };

  if (Array.isArray(rawSections)) {
    return rawSections
      .map((section) => {
        const platformName = typeof section?.platform === 'string'
          ? section.platform.trim()
          : '';
        const canonicalPlatform = requestedLookup.get(platformName.toLowerCase()) || platformName;
        const variations = normalizeVariations(section?.variations);

        if (!canonicalPlatform || variations.length < 2) {
          return null;
        }

        const paddedVariations = [...variations];
        while (paddedVariations.length < EXPECTED_VARIATION_COUNT && paddedVariations.length > 0) {
          paddedVariations.push(paddedVariations[paddedVariations.length - 1]);
        }

        return {
          platform: canonicalPlatform,
          variations: paddedVariations.slice(0, EXPECTED_VARIATION_COUNT),
        };
      })
      .filter(Boolean);
  }

  if (rawSections && typeof rawSections === 'object') {
    return requestedPlatforms
      .map((platform) => {
        const matchingValue = rawSections[platform]
          || rawSections[platform.toLowerCase()]
          || rawSections[platform.replace(/\s+/g, '')];

        if (!matchingValue) return null;

        const variations = normalizeVariations(matchingValue);

        if (variations.length < 2) {
          return null;
        }

        const padded = [...variations];
        while (padded.length < EXPECTED_VARIATION_COUNT && padded.length > 0) {
          padded.push(padded[padded.length - 1]);
        }

        return {
          platform,
          variations: padded.slice(0, EXPECTED_VARIATION_COUNT),
        };
      })
      .filter(Boolean);
  }

  return [];
}

function formatSectionsAsContent(sections) {
  return sections
    .map((section) => {
      const formattedVariations = section.variations
        .map((variation, index) => `Variation ${index + 1}: ${variation}`)
        .join('\n\n');

      return `### ${section.platform}\n${formattedVariations}`;
    })
    .join('\n\n');
}

async function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !supabase) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user.id;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      logError('content_remix.missing_api_key');
      return res.status(503).json({ error: 'This feature is coming soon. Check back shortly.' });
    }

    const authenticatedUserId = await getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
      return res.status(401).json({
        error: 'Authentication required to use AI features. Please log in.',
      });
    }

    const rateLimit = await checkPersistentRateLimit({
      userKey: authenticatedUserId,
      route: 'content-remix',
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowSeconds: RATE_LIMIT_WINDOW / 1000,
    });
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);

    if (!rateLimit.allowed) {
      logInfo('content_remix.rate_limited', { userId: authenticatedUserId, remaining: rateLimit.remaining });
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      });
    }

    const {
      originalContent,
      mode,
      platforms,
      brandVoice,
      userId,
      additionalContext = {},
    } = req.body || {};

    if (userId && userId !== authenticatedUserId) {
      return res.status(403).json({ error: 'User mismatch for remix request.' });
    }

    if (!originalContent || typeof originalContent !== 'string' || !originalContent.trim()) {
      return res.status(400).json({ error: 'Original content is required.' });
    }

    const normalizedPlatforms = normalizePlatformList(platforms);
    if (normalizedPlatforms.length === 0) {
      return res.status(400).json({ error: 'At least one target platform is required.' });
    }

    const { requestedMode, normalizedMode } = normalizeMode(mode);
    const brandBlock = buildCreatorBrandBlock({ ...additionalContext, brandVoice }, { ...additionalContext }); // HUTTLE AI: brand context injected
    const systemPrompt = `${brandBlock}${buildSystemPrompt(
      `${BASE_SYSTEM_PROMPT}

${NO_FABRICATED_STATS_GUARDRAIL}
${READY_TO_USE_GUARDRAIL}`,
      {
        ...additionalContext,
        brandVoice,
        platforms: normalizedPlatforms,
      }
    )}`;
    const userPrompt = buildUserPrompt({
      originalContent: originalContent.trim(),
      requestedMode,
      normalizedMode,
      platforms: normalizedPlatforms,
      brandVoice,
      additionalContext,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2200,
          temperature: normalizedMode === 'sales_conversion' ? 0.6 : 0.8,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logError('content_remix.upstream_error', { status: response.status, errorText });
        return res.status(response.status).json({
          error: 'Content remix service error. Please try again.',
        });
      }

      const data = await response.json();
      const responseText = Array.isArray(data.content)
        ? data.content
          .filter((item) => item?.type === 'text' && typeof item?.text === 'string')
          .map((item) => item.text)
          .join('\n\n')
        : '';

      const parsed = parseJsonFromResponse(responseText);
      const sections = normalizeSections(parsed?.sections || parsed?.platforms || parsed, normalizedPlatforms);

      if (sections.length === 0) {
        logError('content_remix.invalid_response', { userId: authenticatedUserId });
        return res.status(502).json({
          error: 'Content remix response was incomplete. Please try again.',
          errorType: 'INVALID_RESPONSE',
        });
      }

      return res.status(200).json({
        success: true,
        content: formatSectionsAsContent(sections),
        sections,
        usage: data.usage,
        metadata: {
          model: MODEL,
          requestedMode,
          normalizedMode,
          platformCount: normalizedPlatforms.length,
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        logError('content_remix.timeout', { userId: authenticatedUserId });
        return res.status(504).json({
          error: 'Content remix generation timed out. Please try again.',
          errorType: 'TIMEOUT',
        });
      }

      logError('content_remix.proxy_error', { error: fetchError.message, userId: authenticatedUserId });
      return res.status(502).json({
        error: 'Content remix service is temporarily unavailable. Please try again.',
      });
    }
  } catch (error) {
    logError('content_remix.unexpected_error', { error: error.message });
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
    });
  }
}
