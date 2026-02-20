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
        description: String(item?.description || '').trim(),
        momentum: String(item?.momentum || item?.trend || 'rising').toLowerCase(),
        relevant_platform: String(item?.relevant_platform || item?.platform || '').trim(),
        content_angles: Array.isArray(item?.content_angles) ? item.content_angles.map(a => String(a).trim()).filter(Boolean) : []
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
          estimated_reach: String(item?.estimated_reach || item?.reach || 'medium').toLowerCase(),
          type: String(item?.type || 'niche').toLowerCase()
        };
      })
      .filter((item) => item.hashtag.length > 1 && item.relevance)
      .slice(0, 8)
    : [];

  // Support both legacy single ai_insight and new ai_insights array
  const rawInsightsArray = resolvedData.ai_insights ?? resolvedData.aiInsights ?? null;
  const rawInsight = resolvedData.ai_insight ?? resolvedData.aiInsight ?? null;

  const normalizeInsight = (rawInsight) => {
    if (!rawInsight) return null;
    if (typeof rawInsight === 'object') {
      return {
        headline: String(rawInsight.headline || '').trim(),
        detail: String(rawInsight.detail || '').trim(),
        category: String(rawInsight.category || '').trim()
      };
    }
    if (typeof rawInsight === 'string') {
      return { headline: 'Today\'s insight', detail: rawInsight.trim(), category: 'Strategy' };
    }
    return null;
  };

  const insights = Array.isArray(rawInsightsArray) && rawInsightsArray.length > 0
    ? rawInsightsArray.map(normalizeInsight).filter(Boolean).slice(0, 3)
    : rawInsight
      ? [normalizeInsight(rawInsight)].filter(Boolean)
      : [];

  const insight = insights[0] || null;

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
      estimated_reach: allowedReach.has(item.estimated_reach) ? item.estimated_reach : 'medium',
      type: item.type === 'trending' ? 'trending' : 'niche'
    })),
    ai_insights: insights.map(i => ({
      ...i,
      category: allowedInsightCategories.has(i.category) ? i.category : 'Strategy'
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
      { hashtag: '#contentstrategy', relevance: `popular with ${audience.toLowerCase()}`, estimated_reach: 'high', type: 'niche' },
      { hashtag: '#creatorgrowth', relevance: 'high-intent creator community', estimated_reach: 'medium', type: 'niche' },
      { hashtag: '#nichecontent', relevance: `drives discovery for ${niche.toLowerCase()}`, estimated_reach: 'niche', type: 'niche' },
      { hashtag: '#contentcreator', relevance: 'broad reach across your audience', estimated_reach: 'high', type: 'niche' },
      { hashtag: '#digitalmarketing', relevance: 'strong engagement from marketers', estimated_reach: 'high', type: 'niche' },
      { hashtag: '#socialmediatips', relevance: 'consistent discovery traffic', estimated_reach: 'high', type: 'niche' },
      { hashtag: '#fyp', relevance: 'universally trending on TikTok', estimated_reach: 'high', type: 'trending' },
      { hashtag: '#trending', relevance: 'universal discovery boost today', estimated_reach: 'high', type: 'trending' }
    ],
    ai_insights: [
      {
        headline: 'Post in the first hour of your peak window',
        detail: `Early engagement signals boost algorithmic reach for ${audience.toLowerCase()} content. Post when your audience is most active and respond to every comment in the first 30 minutes.`,
        category: 'Timing'
      },
      {
        headline: 'Short-form video outperforms static this week',
        detail: `In the ${niche.toLowerCase()} space, carousel and video formats are generating 2x saves compared to image posts. Lead with a bold hook in the first 3 seconds.`,
        category: 'Content Type'
      },
      {
        headline: `${audience} responds to problem-first framing`,
        detail: `Start your post with the exact pain point your ${audience.toLowerCase()} faces before offering the solution. Posts using this structure are seeing higher comment rates than educational-only content.`,
        category: 'Audience'
      }
    ],
    ai_insight: {
      headline: 'Consistency beats complexity',
      detail: `Publish one clear, niche-specific post today for ${audience.toLowerCase()}. Focus on one problem and one takeaway.`,
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

User's niche: ${niche.toLowerCase()}
User's target audience: ${targetAudience.toLowerCase()}
User's platforms: ${platforms}
Today's date: ${todayFormatted}

Generate a daily briefing. Return ONLY this exact JSON structure:

{
  "trending_topics": [
    {
      "topic": "Trend name (3-5 words)",
      "context": "Why it matters today (one sentence, max 15 words)",
      "description": "1-2 sentence explanation of why this topic is trending right now",
      "momentum": "rising" | "peaking" | "declining",
      "relevant_platform": "Primary platform where this is active",
      "content_angles": ["Specific content idea 1", "Specific content idea 2", "Specific content idea 3"]
    }
  ],
  "hashtags_of_day": [
    {
      "hashtag": "#example",
      "relevance": "Why this hashtag matters (max 10 words, lowercase when mid-sentence)",
      "estimated_reach": "high" | "medium" | "niche",
      "type": "niche" | "trending"
    }
  ],
  "ai_insights": [
    {
      "headline": "One punchy insight headline (max 10 words)",
      "detail": "2-3 sentence actionable insight specific to their niche today.",
      "category": "Timing" | "Content Type" | "Audience" | "Platform" | "Strategy"
    }
  ]
}

RULES:
- Return ONLY valid JSON, no markdown, no preamble, no backticks.
- trending_topics: exactly 4 topics. All must be current as of ${todayFormatted}. Each must include a "description" (1-2 sentences on why it is trending) and "content_angles" (array of 2-3 specific, actionable content ideas).
- hashtags_of_day: exactly 8 hashtags. 5-6 must be niche-specific based on the user's brand profile (type: "niche") and 2-3 must be universally trending hashtags like #fyp, #trending, etc. (type: "trending"). Always include the # symbol.
- ai_insights: exactly 3 insight objects. One must be category "Timing" (best time to post today), one must be category "Content Type" (what format is working in their niche right now), one must be category "Audience" (what their audience is responding to this week).
- Each ai_insight must be specific to their niche and actionable TODAY. No generic advice.
- relevance text should be lowercase when it appears mid-sentence (e.g., "popular with ${targetAudience.toLowerCase()}" not "Popular with ${targetAudience}").
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
      .select('generated_date, trending_topics, hashtags_of_day, ai_insights, ai_insight')
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
      ai_insights: Array.isArray(data.ai_insights) ? data.ai_insights : [],
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
        ai_insights: finalData.ai_insights || [],
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
