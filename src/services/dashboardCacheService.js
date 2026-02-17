import { supabase, trackUsage } from '../config/supabase';
import { API_TIMEOUTS } from '../config/apiConfig';
import { getNiche, getTargetAudience } from '../utils/brandContextBuilder';
import { retryFetch } from '../utils/retryFetch';

const DASHBOARD_CACHE_TABLE = 'daily_dashboard_cache';
const GROK_PROXY_URL = '/api/ai/grok';

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDisplayString() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function getPlatformsString(platforms) {
  if (Array.isArray(platforms) && platforms.length > 0) {
    return platforms.join(', ');
  }
  return 'Instagram, TikTok, X';
}

async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.warn('Could not get auth session for dashboard cache:', error);
  }

  return headers;
}

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

  // Direct JSON
  const direct = tryParse(trimmed);
  if (direct) return direct;

  // Markdown code fence JSON
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1].trim());
    if (fenced) return fenced;
  }

  // JSON object within surrounding text
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return tryParse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function normalizeDashboardData(data) {
  if (!data) return null;

  const resolvedData = Array.isArray(data)
    ? data.find((item) => item && typeof item === 'object')
    : data;

  if (!resolvedData || typeof resolvedData !== 'object') return null;

  const allowedMomentum = new Set(['rising', 'peaking', 'declining']);
  const allowedReach = new Set(['high', 'medium', 'niche']);
  const allowedInsightCategories = new Set(['Strategy', 'Timing', 'Audience', 'Platform', 'Content Type']);

  const trendingSource = resolvedData.trending_topics ?? resolvedData.trendingTopics ?? [];
  const trendingTopics = Array.isArray(trendingSource)
    ? trendingSource
      .map((item) => ({
        topic: String(item?.topic || item?.name || item || '').trim(),
        context: String(item?.context || item?.why_now || item?.reason || '').trim(),
        momentum: String(item?.momentum || item?.trend || 'rising').toLowerCase(),
        relevant_platform: String(item?.relevant_platform || item?.platform || '').trim()
      }))
      .filter((item) => item.topic && item.context)
      .slice(0, 4)
    : [];

  const hashtagSource = resolvedData.hashtags_of_day ?? resolvedData.hashtagsOfDay ?? [];
  const hashtagsOfDay = Array.isArray(hashtagSource)
    ? hashtagSource
      .map((item) => {
        const hashtagValue = String(item?.hashtag || item?.tag || item || '').trim();
        return {
          hashtag: hashtagValue.startsWith('#') ? hashtagValue : `#${hashtagValue.replace(/^#*/, '')}`,
          relevance: String(item?.relevance || item?.reason || 'Recommended for your audience').trim(),
          estimated_reach: String(item?.estimated_reach || item?.reach || 'medium').toLowerCase()
        };
      })
      .filter((item) => item.hashtag.length > 1 && item.relevance)
      .slice(0, 6)
    : [];

  const rawInsight = resolvedData.ai_insight ?? resolvedData.aiInsight ?? null;
  const insight = rawInsight && typeof rawInsight === 'object'
    ? {
      headline: String(rawInsight.headline || '').trim(),
      detail: String(rawInsight.detail || '').trim(),
      category: String(rawInsight.category || '').trim()
    }
    : typeof rawInsight === 'string'
      ? {
        headline: 'Today\'s insight',
        detail: rawInsight.trim(),
        category: 'Strategy'
      }
    : null;

  const hasAnyData = Boolean(
    trendingTopics.length > 0 ||
    hashtagsOfDay.length > 0 ||
    (insight?.headline && insight?.detail)
  );

  if (!hasAnyData) {
    return null;
  }

  return {
    trending_topics: trendingTopics.map((item) => ({
      ...item,
      momentum: allowedMomentum.has(item.momentum) ? item.momentum : 'rising',
      relevant_platform: item.relevant_platform || 'Multi-platform'
    })),
    hashtags_of_day: hashtagsOfDay.map((item) => ({
      ...item,
      estimated_reach: allowedReach.has(item.estimated_reach) ? item.estimated_reach : 'medium'
    })),
    ai_insight: insight
      ? {
        ...insight,
        category: allowedInsightCategories.has(insight.category) ? insight.category : 'Strategy'
      }
      : null
  };
}

function buildFallbackDashboardData(brandProfile) {
  const niche = getNiche(brandProfile, 'your niche');
  const audience = getTargetAudience(brandProfile, 'your audience');

  return {
    trending_topics: [
      {
        topic: `${niche} education`,
        context: 'How-to content is driving strong saves and shares today.',
        momentum: 'rising',
        relevant_platform: 'Instagram'
      },
      {
        topic: `${niche} behind the scenes`,
        context: 'Authentic process content is outperforming polished posts.',
        momentum: 'peaking',
        relevant_platform: 'TikTok'
      }
    ],
    hashtags_of_day: [
      {
        hashtag: '#contentstrategy',
        relevance: `Popular with ${audience}`,
        estimated_reach: 'high'
      },
      {
        hashtag: '#creatorgrowth',
        relevance: 'High intent creator audience',
        estimated_reach: 'medium'
      },
      {
        hashtag: '#socialmediatips',
        relevance: 'Consistent discovery traffic',
        estimated_reach: 'high'
      }
    ],
    ai_insight: {
      headline: 'Consistency beats complexity',
      detail: `Publish one clear, niche-specific post today for ${audience}. Focus on one problem and one takeaway.`,
      category: 'Strategy'
    }
  };
}

function buildDailyBriefingPrompt(brandProfile) {
  const niche = getNiche(brandProfile, 'general creator');
  const targetAudience = getTargetAudience(brandProfile, 'general audience');
  const platforms = getPlatformsString(brandProfile?.platforms);
  const todayFormatted = getTodayDisplayString();

  return `You are a daily content intelligence briefing system for a social media professional.

User's niche: ${niche}
User's target audience: ${targetAudience}
User's platforms: ${platforms}
Today's date: ${todayFormatted}

Generate a daily briefing. Return ONLY this exact JSON structure:

{
  "trending_topics": [
    {
      "topic": "Trend name (3-5 words)",
      "context": "Why it matters today (one sentence, max 15 words)",
      "momentum": "rising" | "peaking" | "declining",
      "relevant_platform": "Primary platform where this is active"
    }
  ],
  "hashtags_of_day": [
    {
      "hashtag": "#example",
      "relevance": "Why this hashtag is hot today (max 10 words)",
      "estimated_reach": "high" | "medium" | "niche"
    }
  ],
  "ai_insight": {
    "headline": "One punchy insight headline (max 10 words)",
    "detail": "2-3 sentence actionable insight specific to their niche today.",
    "category": "Strategy" | "Timing" | "Audience" | "Platform" | "Content Type"
  }
}

RULES:
- Return ONLY valid JSON, no markdown, no preamble, no backticks.
- trending_topics: exactly 4 topics. All must be current today.
- hashtags_of_day: exactly 6 hashtags. Mix of popular and niche. Always include the # symbol.
- ai_insight: must be specific to their niche and actionable TODAY, not generic advice like "post consistently" or "engage with your audience."
- Never include content ideas or captions - intelligence only.
- Maximum 15 words per sentence in any field.`;
}

export async function getDashboardCache(userId) {
  if (!userId) {
    return { success: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' };
  }

  const generatedDate = getLocalDateString();

  try {
    const { data, error } = await supabase
      .from(DASHBOARD_CACHE_TABLE)
      .select('generated_date, trending_topics, hashtags_of_day, ai_insight')
      .eq('user_id', userId)
      .eq('generated_date', generatedDate)
      .maybeSingle();

    if (error) {
      console.error('Error fetching dashboard cache:', error);
      return { success: false, errorType: 'db_error', errorMessage: 'Could not read dashboard cache.' };
    }

    if (!data) {
      return { success: true, data: null, generatedDate };
    }

    const cachedData = {
      trending_topics: Array.isArray(data.trending_topics) ? data.trending_topics : [],
      hashtags_of_day: Array.isArray(data.hashtags_of_day) ? data.hashtags_of_day : [],
      ai_insight: data.ai_insight || null
    };

    const normalizedCachedData = normalizeDashboardData(cachedData) || buildFallbackDashboardData();

    return {
      success: true,
      generatedDate,
      data: normalizedCachedData
    };
  } catch (error) {
    console.error('Unexpected dashboard cache read error:', error);
    return { success: false, errorType: 'unknown_error', errorMessage: 'Failed to load dashboard cache.' };
  }
}

export async function generateDashboardData(userId, brandProfile) {
  if (!userId) {
    return { success: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' };
  }

  const generatedDate = getLocalDateString();
  const headers = await getAuthHeaders();

  try {
    const response = await retryFetch(
      GROK_PROXY_URL,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'grok-4-1-fast-reasoning',
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: 'You are a precise structured-output assistant. Always return valid JSON only.'
            },
            {
              role: 'user',
              content: buildDailyBriefingPrompt(brandProfile)
            }
          ]
        })
      },
      {
        timeoutMs: API_TIMEOUTS.STANDARD,
      }
    );

    const fallbackData = buildFallbackDashboardData(brandProfile);

    if (!response.ok) {
      return {
        success: true,
        isFallback: true,
        generatedDate,
        data: fallbackData
      };
    }

    const payload = await response.json();
    const parsed = parseStructuredJson(payload?.content || '');
    const normalized = normalizeDashboardData(parsed);
    const finalData = normalized || fallbackData;
    const isFallback = !normalized;

    const { error: upsertError } = await supabase
      .from(DASHBOARD_CACHE_TABLE)
      .upsert({
        user_id: userId,
        generated_date: generatedDate,
        trending_topics: finalData.trending_topics,
        hashtags_of_day: finalData.hashtags_of_day,
        ai_insight: finalData.ai_insight,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,generated_date'
      });

    if (upsertError) {
      console.error('Error upserting dashboard cache:', upsertError);
      return {
        success: true,
        isFallback,
        generatedDate,
        data: finalData
      };
    }

    return {
      success: true,
      isFallback,
      generatedDate,
      data: finalData
    };
  } catch (error) {
    console.error('Error generating dashboard data:', error);
    const fallbackData = buildFallbackDashboardData(brandProfile);
    return {
      success: true,
      isFallback: true,
      generatedDate,
      data: fallbackData
    };
  }
}

export async function deleteDashboardCache(userId) {
  if (!userId) {
    return { success: false, errorType: 'auth_error', errorMessage: 'User is not authenticated.' };
  }

  const generatedDate = getLocalDateString();

  try {
    const { error } = await supabase
      .from(DASHBOARD_CACHE_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('generated_date', generatedDate);

    if (error) {
      console.error('Error deleting dashboard cache:', error);
      return { success: false, errorType: 'db_error', errorMessage: 'Could not refresh dashboard cache.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting dashboard cache:', error);
    return { success: false, errorType: 'unknown_error', errorMessage: 'Could not refresh dashboard cache.' };
  }
}

export async function trackDashboardGenerationUsage(userId, source = 'dashboard_daily_generation') {
  if (!userId) return false;
  return trackUsage(userId, 'aiGenerations', { source, createdBy: 'dashboard_cache_service' });
}
