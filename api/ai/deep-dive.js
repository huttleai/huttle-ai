import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';
import { buildBrandContext as buildCreatorBrandBlock } from '../../src/utils/buildBrandContext.js'; // HUTTLE AI: brand context injected

const PERPLEXITY_API_KEY =
  process.env.PERPLEXITY_API_KEY ||
  process.env.VITE_PERPLEXITY_API_KEY;
// TODO: Move to server-side PERPLEXITY_API_KEY in Vercel dashboard for production security.
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const MODEL = 'sonar-pro';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

function parseStructuredJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) return direct;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1].trim());
    if (fenced) return fenced;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function toCleanString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() || fallback : fallback;
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  const matchedValue = allowedValues.find((allowedValue) => allowedValue.toLowerCase() === normalized);
  return matchedValue || fallback;
}

function normalizeCitationList(citations) {
  if (!Array.isArray(citations)) return [];

  const urls = citations
    .map((citation) => {
      if (typeof citation === 'string') return citation.trim();
      if (citation && typeof citation === 'object') {
        return String(citation.url || citation.link || '').trim();
      }
      return '';
    })
    .filter((citation) => /^https?:\/\//i.test(citation));

  return [...new Set(urls)];
}

function normalizeTrendItem(item) {
  if (!item || typeof item !== 'object') return null;

  const name = toCleanString(item.name || item.topic);
  if (!name) return null;

  return {
    name,
    status: normalizeEnum(item.status, ['Rising', 'Peaking', 'Declining', 'Emerging'], 'Rising'),
    velocity: normalizeEnum(item.velocity, ['Explosive', 'Steady', 'Slow Burn'], 'Steady'),
    primary_platform: toCleanString(item.primary_platform || item.platform, 'Multi-platform'),
    evidence: toCleanString(item.evidence),
    why_it_matters: toCleanString(item.why_it_matters || item.whyItMatters),
  };
}

function normalizePlatformActivity(item) {
  if (!item || typeof item !== 'object') return null;

  const name = toCleanString(item.name || item.platform);
  if (!name) return null;

  return {
    name,
    activity_level: normalizeEnum(item.activity_level || item.activityLevel, ['High', 'Medium', 'Low'], 'Medium'),
    top_format: toCleanString(item.top_format || item.topFormat),
    "what's_happening": toCleanString(
      item["what's_happening"] || item.whats_happening || item.what_s_happening || item.whatsHappening
    ),
  };
}

function normalizeReportShape(candidate, context) {
  const source = candidate?.report && typeof candidate.report === 'object' ? candidate.report : candidate;

  if (!source || typeof source !== 'object') {
    return null;
  }

  const activeTrends = Array.isArray(source.active_trends)
    ? source.active_trends.map(normalizeTrendItem).filter(Boolean).slice(0, 6)
    : [];
  const platformActivity = Array.isArray(source.platform_activity)
    ? source.platform_activity.map(normalizePlatformActivity).filter(Boolean).slice(0, 6)
    : [];
  const competitorLandscape = toCleanString(source.competitor_landscape || source.competitorLandscape);
  const audienceSentiment = source.audience_sentiment && typeof source.audience_sentiment === 'object'
    ? source.audience_sentiment
    : {};
  const timingWindow = source.timing_window && typeof source.timing_window === 'object'
    ? source.timing_window
    : {};

  return {
    overview: toCleanString(
      source.overview,
      `Live research summary for ${context.topic}${context.niche ? ` in the ${context.niche} niche` : ''}.`
    ),
    confidence: {
      level: normalizeEnum(source.confidence?.level, ['High', 'Medium', 'Low'], 'Medium'),
    },
    active_trends: activeTrends,
    platform_activity: platformActivity,
    competitor_landscape: competitorLandscape,
    audience_sentiment: {
      overall_mood: normalizeEnum(
        audienceSentiment.overall_mood || audienceSentiment.overallMood,
        ['Positive', 'Mixed', 'Negative', 'Polarized', 'Curious'],
        'Mixed'
      ),
      detail: toCleanString(audienceSentiment.detail),
    },
    timing_window: {
      action_window: normalizeEnum(
        timingWindow.action_window || timingWindow.actionWindow,
        ['Act now', 'This week', 'Monitor'],
        'This week'
      ),
      reasoning: toCleanString(timingWindow.reasoning),
      lifespan: toCleanString(timingWindow.lifespan),
    },
  };
}

function buildMetadata(report, citations, candidateMetadata, context) {
  const sectionsParsed = {
    trend_count: Array.isArray(report.active_trends) ? report.active_trends.length : 0,
    platform_count: Array.isArray(report.platform_activity) ? report.platform_activity.length : 0,
    has_competitors: Boolean(report.competitor_landscape),
  };

  return {
    ...(candidateMetadata && typeof candidateMetadata === 'object' ? candidateMetadata : {}),
    processed_at: new Date().toISOString(),
    model: MODEL,
    topic: context.topic,
    niche: context.niche,
    platform: context.platform,
    source_count: citations.length,
    sections_parsed: sectionsParsed,
  };
}

function buildMessages({ topic, niche, platform, targetAudience, brandVoice, brandData }) {
  const currentDate = new Date().toISOString().slice(0, 10);
  const platformLabel = platform || 'Instagram, TikTok, X';
  const nicheLabel = niche || 'general creator';
  const audienceLabel = targetAudience || 'general audience';
  const brandVoiceLabel = brandVoice || 'clear, practical, creator-friendly';
  const brandBlock = buildCreatorBrandBlock(brandData, brandData); // HUTTLE AI: brand context injected
  const nicheFocusSuffix = niche && targetAudience
    ? `\n\nFocus results relevant to ${niche} creators targeting ${targetAudience}.`
    : niche ? `\n\nFocus results relevant to ${niche} creators.` : ''; // HUTTLE AI: brand context injected

  return [
    {
      role: 'system',
      content: `${brandBlock}You are a professional social media trend analyst. Your goal is to deliver the most accurate, real-time, and up-to-date trend intelligence available on the web right now. Never rely on training data alone — always use web search to ground every finding in current data. Analyze trend momentum, platform-specific signals, content format performance, and emerging creator behavior. Provide specific, actionable insights a content creator can use immediately.`, // HUTTLE AI: brand context injected
    },
    {
      role: 'user',
      content: `Research the topic "${topic}" for a content creator in the ${nicheLabel} niche.\n\nPrimary platforms: ${platformLabel}\nTarget audience: ${audienceLabel}\nBrand voice: ${brandVoiceLabel}\nDate: ${currentDate}\n\nReturn ONLY valid JSON with this exact structure:\n{\n  "report": {\n    "overview": "2-4 sentence real-time summary grounded in current web findings.",\n    "confidence": {\n      "level": "High | Medium | Low"\n    },\n    "active_trends": [\n      {\n        "name": "3-7 word trend name",\n        "status": "Rising | Peaking | Declining | Emerging",\n        "velocity": "Explosive | Steady | Slow Burn",\n        "primary_platform": "Platform name",\n        "evidence": "One concise sentence with current evidence.",\n        "why_it_matters": "One concise actionable insight for creators."\n      }\n    ],\n    "platform_activity": [\n      {\n        "name": "Platform name",\n        "activity_level": "High | Medium | Low",\n        "top_format": "Best-performing content format right now",\n        "what's_happening": "One concise sentence on what is happening on this platform."\n      }\n    ],\n    "competitor_landscape": "Short paragraph on notable competitor or creator behavior around this topic right now.",\n    "audience_sentiment": {\n      "overall_mood": "Positive | Mixed | Negative | Polarized | Curious",\n      "detail": "One concise sentence about current audience response."\n    },\n    "timing_window": {\n      "action_window": "Act now | This week | Monitor",\n      "reasoning": "One concise sentence explaining urgency.",\n      "lifespan": "Estimated lifespan in plain language"\n    }\n  }\n}\n\nRequirements:\n- Use current web information, prioritizing the last 30 days and current platform signals.\n- Keep every field concise and specific.\n- Include 3 to 5 active trends when evidence exists.\n- Include 2 to 4 platform_activity entries.\n- Do not include markdown fences, commentary, or any text outside the JSON object.${nicheFocusSuffix}`,
    },
  ];
}

async function getAuthenticatedUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !supabase) return null;

  try {
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user?.id) {
      return user.id;
    }
  } catch (error) {
    console.error('[deep-dive] Auth check failed:', error);
  }

  return null;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!PERPLEXITY_API_KEY) {
    return res.status(500).json({
      error: 'Deep Dive is unavailable because the Perplexity API key is not configured.',
    });
  }

  const authenticatedUserId = await getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const {
      topic,
      trend,
      niche = '',
      platform,
      platforms = [],
      brandData = {},
    } = req.body || {};

    const selectedTopic = toCleanString(topic || trend);
    if (!selectedTopic) {
      return res.status(400).json({ error: 'Topic is required.' });
    }

    const platformLabel = toCleanString(platform)
      || (Array.isArray(platforms) ? platforms.map((value) => toCleanString(value)).filter(Boolean).join(', ') : '');

    const messages = buildMessages({
      topic: selectedTopic,
      niche: toCleanString(niche),
      platform: platformLabel,
      targetAudience: toCleanString(brandData?.targetAudience),
      brandVoice: toCleanString(brandData?.brandVoice),
      brandData, // HUTTLE AI: brand context injected
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 58000);

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.2,
          web_search_options: {
            search_context_size: 'high',
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        clearTimeout(timeoutId);
        console.error('[deep-dive] Perplexity upstream error:', response.status, errorText);
        return res.status(response.status).json({
          error: 'Deep Dive AI service error. Please try again in a moment.',
        });
      }

      const data = await response.json();
      clearTimeout(timeoutId);

      const rawContent = data.choices?.[0]?.message?.content || '';
      const parsedContent = parseStructuredJson(rawContent);
      const report = normalizeReportShape(parsedContent, {
        topic: selectedTopic,
        niche: toCleanString(niche),
        platform: platformLabel || 'Instagram, TikTok, X',
      });

      if (!report) {
        console.error('[deep-dive] Invalid structured response:', rawContent);
        return res.status(502).json({
          error: 'Deep Dive returned an incomplete analysis. Please try a more specific topic.',
        });
      }

      const citations = normalizeCitationList(data.citations);
      const metadata = buildMetadata(
        report,
        citations,
        parsedContent?.metadata,
        {
          topic: selectedTopic,
          niche: toCleanString(niche),
          platform: platformLabel || 'Instagram, TikTok, X',
          userId: authenticatedUserId,
        }
      );

      return res.status(200).json({
        success: true,
        report,
        citations,
        metadata,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'Deep Dive request timed out. Try narrowing the topic or platform focus.',
        });
      }

      console.error('[deep-dive] Network error:', error);
      return res.status(502).json({
        error: 'Unable to reach the Deep Dive AI service right now.',
      });
    }
  } catch (error) {
    console.error('[deep-dive] Unexpected error:', error);
    return res.status(500).json({
      error: 'An unexpected Deep Dive error occurred. Please try again.',
    });
  }
}
