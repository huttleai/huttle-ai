/**
 * Perplexity API Service
 * 
 * Used for:
 * - Real-time trend scans and benchmarks
 * - Semantic trend pulls and keyword analysis
 * - Competitor analysis and market research
 * - Forward-looking queries for trend forecasting
 * 
 * All functions now accept optional brandData for brand-aligned results
 * 
 * SECURITY: All API calls now go through the server-side proxy to protect API keys
 */

import {
  buildBrandContext,
  buildPromptBrandSection,
  getNiche,
  getTargetAudience,
  getBrandVoice,
  getPromptBrandProfile,
} from '../utils/brandContextBuilder';
import { supabase } from '../config/supabase';
import { normalizeNiche, buildCacheKey, buildNicheIntelCacheKey } from '../utils/normalizeNiche';

// SECURITY: Use server-side proxy instead of exposing API key in client
const PERPLEXITY_PROXY_URL = '/api/ai/perplexity';
const GROK_PROXY_URL = '/api/ai/grok';

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

/**
 * Make a request to the Perplexity API via the secure proxy
 */
async function callPerplexityAPI(messages, temperature = 0.2, options = {}) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(PERPLEXITY_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      temperature,
      model: options.model || 'sonar',
      cache: options.cache,
      requireRealtime: options.requireRealtime,
      personalized: options.personalized,
      targetAudience: options.targetAudience,
      brandContext: options.brandContext,
      competitorHandles: options.competitorHandles,
      web_search_options: options.webSearchOptions || {
        search_context_size: 'low'
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

async function callGrokAPI(messages, temperature = 0.2, options = {}) {
  const headers = await getAuthHeaders();

  const response = await fetch(GROK_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      temperature,
      model: options.model || 'grok-4.1-fast-reasoning',
      cache: options.cache,
      personalized: options.personalized,
      targetAudience: options.targetAudience,
      brandContext: options.brandContext,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

function parseJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const trimmed = text.trim();
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

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  x: 'X',
  twitter: 'X',
};

const TITLE_CASE_SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'vs']);
const TITLE_CASE_ACRONYMS = {
  ai: 'AI',
  api: 'API',
  b2b: 'B2B',
  b2c: 'B2C',
  crm: 'CRM',
  roi: 'ROI',
  saas: 'SaaS',
  seo: 'SEO',
  ugc: 'UGC',
  ui: 'UI',
  ux: 'UX',
};

function toDisplayTitleCase(value) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const words = cleaned.split(' ');
  return words
    .map((word, index) => {
      const coreMatch = word.match(/[A-Za-z0-9]+/);
      if (!coreMatch) return word;

      const core = coreMatch[0];
      const normalizedCore = core.toLowerCase();
      const isSmallWord = index > 0 && index < words.length - 1 && TITLE_CASE_SMALL_WORDS.has(normalizedCore);
      const replacement = TITLE_CASE_ACRONYMS[normalizedCore]
        || (isSmallWord ? normalizedCore : normalizedCore.charAt(0).toUpperCase() + normalizedCore.slice(1));

      return word.replace(core, replacement);
    })
    .join(' ');
}

function normalizeQuickScanPlatformLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'all platforms') {
    return '';
  }

  return PLATFORM_LABELS[normalized] || toDisplayTitleCase(value);
}

function normalizeQuickScanPlatforms(...values) {
  const normalizedPlatforms = values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return value.split(/[,/&]|(?:\s+and\s+)/i);
      return [];
    })
    .map((platform) => normalizeQuickScanPlatformLabel(platform))
    .filter(Boolean);

  return [...new Set(normalizedPlatforms)];
}

function normalizeQuickScanTopic(value) {
  return toDisplayTitleCase(value);
}

function normalizeQuickScanLifespan(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'hours') return 'Short window';
  if (normalized === 'days') return 'Trending now';
  if (normalized === '1-2 weeks') return '1-2 week window';
  if (normalized === 'ongoing') return 'Ongoing';
  return 'Trending now';
}

function normalizeQuickScanData(scanData) {
  const source = Array.isArray(scanData)
    ? {
      trends: scanData.map((trend) => ({
        topic: trend?.topic || trend?.title || trend?.name || '',
        category: trend?.category || 'Industry Shift',
        why_trending: trend?.why_trending || trend?.summary || trend?.overview || '',
        relevance_to_niche: trend?.relevance_to_niche || trend?.why_it_matters || trend?.content_idea || '',
        momentum: trend?.momentum || 'rising',
        platforms_active: normalizeQuickScanPlatforms(
          trend?.platforms_active,
          trend?.platform,
          trend?.primary_platform,
          trend?.platform_name
        ),
        estimated_lifespan: trend?.estimated_lifespan || '',
        opportunity_window: trend?.opportunity_window || 'Monitor',
      })),
      scan_summary: 'Live trend scan complete.',
      last_updated: new Date().toISOString(),
    }
    : scanData;

  if (!source || typeof source !== 'object' || !Array.isArray(source.trends)) {
    return null;
  }

  const allowedCategories = new Set([
    'Industry Shift',
    'Viral Moment',
    'Cultural Wave',
    'Platform Update',
    'Seasonal',
    'News-Driven'
  ]);
  const allowedMomentum = new Set(['rising', 'peaking', 'declining']);
  const allowedWindow = new Set(['Act now', 'Plan this week', 'Monitor']);

  const trends = source.trends
    .map((trend) => {
      const platformsActive = normalizeQuickScanPlatforms(
        trend?.platforms_active,
        trend?.platform,
        trend?.primary_platform,
        trend?.platform_name
      );

      return {
      topic: normalizeQuickScanTopic(trend?.topic),
      category: String(trend?.category || '').trim(),
      why_trending: String(trend?.why_trending || '').trim(),
      relevance_to_niche: String(trend?.relevance_to_niche || '').trim(),
      momentum: String(trend?.momentum || '').toLowerCase(),
      platforms_active: platformsActive,
      estimated_lifespan: String(trend?.estimated_lifespan || '').trim(),
      opportunity_window: String(trend?.opportunity_window || '').trim(),
    };
    })
    .filter((trend) => trend.topic && trend.why_trending && trend.relevance_to_niche)
    .slice(0, 5)
    .map((trend) => ({
      ...trend,
      category: allowedCategories.has(trend.category) ? trend.category : 'Industry Shift',
      momentum: allowedMomentum.has(trend.momentum) ? trend.momentum : 'rising',
      estimated_lifespan: normalizeQuickScanLifespan(trend.estimated_lifespan),
      opportunity_window: allowedWindow.has(trend.opportunity_window) ? trend.opportunity_window : 'Monitor',
      platforms_active: trend.platforms_active.length > 0 ? trend.platforms_active : ['Multi-platform'],
    }));

  if (trends.length === 0) {
    return null;
  }

  return {
    trends,
    scan_summary: String(source.scan_summary || '').trim() || 'Live trend scan complete.',
    last_updated: String(source.last_updated || '').trim() || new Date().toISOString(),
  };
}

export async function getRealtimeHashtagResearch({ topic, platform = 'instagram', selectedHook = '', caption = '' }, brandData = null) {
  try {
    const niche = getNiche(brandData, topic || 'general creator');
    const audience = getTargetAudience(brandData, 'general audience');
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const currentDate = new Date().toISOString().slice(0, 10);
    const cacheKey = buildCacheKey([topic, platform, currentDate, 'full_post_builder_hashtags']);

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a social media hashtag research specialist. Your job is to find the most currently trending and high-performing hashtags for a specific topic and platform right now.'
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, { niche, targetAudience: audience, platforms: [platform] })}

Topic: ${topic}
Platform: ${platform}
Hook context: ${selectedHook || 'Not provided'}
Caption context: ${caption || 'Not provided'}

Search for the most currently trending and high-performing hashtags for ${topic} on ${platform} right now in 2026.

Return a raw list of 20 candidate hashtags with:
- The hashtag
- Current estimated post count
- Whether it's trending up, stable, or declining
- Niche relevance score (1-10)

Focus on hashtags that are active right now, not oversaturated, and relevant to ${niche}.

Return JSON only as an array of exactly 20 objects with these keys:
- hashtag
- estimatedPostCount
- trend
- nicheRelevanceScore`
      }
    ], 0.2, {
      cache: {
        key: cacheKey,
        niche: normalizeNiche(niche),
        platform,
        type: 'hashtags',
        ttlHours: 6,
      },
      personalized: Boolean(brandContext || brandData?.targetAudience),
      targetAudience: brandData?.targetAudience || undefined,
      brandContext: brandContext || undefined,
      requireRealtime: true,
    });

    return {
      success: true,
      research: data.content || '',
      citations: data.citations || [],
      usage: data.usage,
      cached: Boolean(data.cached),
    };
  } catch (error) {
    console.error('Perplexity hashtag research error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Scan trending topics in a niche
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} platform - Platform to scan (default: 'all')
 * @returns {Promise<Object>} Trending topics
 */
export async function scanTrendingTopics(brandData, platform = 'all') {
  try {
    const niche = getNiche(brandData, 'general creator');
    const audience = getTargetAudience(brandData, 'general audience');
    const cacheKey = buildCacheKey([niche, platform, 'trending']);
    const brandContext = brandData ? buildBrandContext(brandData) : '';

    const platformList = Array.isArray(brandData?.platforms) && brandData.platforms.length > 0
      ? brandData.platforms.join(', ')
      : (platform !== 'all' ? platform : 'Instagram, TikTok, X, YouTube, Facebook');

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a real-time social media trend intelligence analyst. Your ONLY job is to identify what is currently trending and explain WHY — you never suggest content ideas, captions, or what to post.'
      },
      {
        role: 'user',
        content: `You are a real-time social media trend intelligence analyst. Your ONLY job is to identify what is currently trending and explain WHY — you never suggest content ideas, captions, or what to post.

The user operates in this niche/industry: ${niche}
Their target audience is: ${audience}
Their preferred platforms are: ${platformList}

Scan for the top 5 trends currently relevant to their niche. For each trend, return ONLY this JSON structure:

{
  "trends": [
    {
      "topic": "Trend name in 3-6 words",
      "category": "Industry Shift" | "Viral Moment" | "Cultural Wave" | "Platform Update" | "Seasonal" | "News-Driven",
      "why_trending": "One clear sentence explaining why this is trending right now.",
      "relevance_to_niche": "One sentence on how this specifically connects to the user's niche.",
      "momentum": "rising" | "peaking" | "declining",
      "platforms_active": ["Instagram", "TikTok", etc.],
      "estimated_lifespan": "hours" | "days" | "1-2 weeks" | "ongoing",
      "opportunity_window": "Act now" | "Plan this week" | "Monitor"
    }
  ],
  "scan_summary": "One sentence overview of the current trend landscape for this niche.",
  "last_updated": "current timestamp"
}

RULES:
- Return ONLY valid JSON, no markdown, no preamble, no explanation outside the JSON.
- Never include content ideas, posting suggestions, caption examples, or creative direction.
- Every trend must be currently active — do not include historical or evergreen topics.
- "why_trending" must reference a specific recent trigger (event, viral post, news, algorithm change).
- Keep all text concise. No run-on sentences. Maximum 20 words per field.`
      }
    ], 0.2, {
      cache: {
        key: cacheKey,
        niche: normalizeNiche(niche),
        platform,
        type: 'trending',
        ttlHours: 24,
      },
      personalized: Boolean(brandContext || brandData?.targetAudience),
      targetAudience: brandData?.targetAudience || undefined,
      brandContext: brandContext || undefined,
    });

    const parsedStructuredData = typeof data.structuredData === 'string'
      ? parseJsonFromText(data.structuredData)
      : data.structuredData;
    const parsed = parsedStructuredData ?? parseJsonFromText(data.content || '');
    const normalized = normalizeQuickScanData(parsed);

    if (!normalized) {
      return {
        success: false,
        error: 'Trend scan returned unexpected results. Please try again.',
      };
    }

    return {
      success: true,
      scan: normalized,
      citations: data.citations || [],
      usage: data.usage,
      cached: Boolean(data.cached),
      generatedAt: data.generatedAt,
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get trending keywords for the day
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Trending keywords
 */
export async function getKeywordsOfTheDay(brandData) {
  try {
    const niche = getNiche(brandData);
    const audience = getTargetAudience(brandData);
    const brandVoice = getBrandVoice(brandData);

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a keyword research specialist. Provide actionable, high-engagement keywords tailored to specific brands and audiences.'
      },
      {
        role: 'user',
        content: `What are 5-7 high-engagement keywords and hashtags trending today in the ${niche} industry?

Target Audience: ${audience}
Brand Voice: ${brandVoice}

Include:
- Estimated virality scores
- Usage tips specific to the brand voice
- Relevance to the target audience
- Platform recommendations for each keyword`
      }
    ], 0.2);

    return {
      success: true,
      keywords: data.content || '',
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analyze competitors in the niche
 * @param {Object} brandData - Brand data from BrandContext
 * @param {Array} competitorNames - Optional list of competitor names
 * @returns {Promise<Object>} Competitor analysis
 */
export async function analyzeCompetitors(brandData, competitorNames = []) {
  try {
    const niche = getNiche(brandData);
    const brandContext = buildBrandContext(brandData);

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a competitive intelligence analyst. Provide actionable insights from competitor analysis that help differentiate and improve brand positioning.'
      },
      {
        role: 'user',
        content: `Analyze content strategies of top performers in ${niche} ${competitorNames.length ? `including ${competitorNames.join(', ')}` : ''}.

My Brand Profile:
${brandContext}

Analyze:
- Content formats and topics they use successfully
- Engagement tactics and patterns
- Gaps in their strategy that my brand could fill
- How to differentiate while maintaining my brand voice
- Specific opportunities based on my target audience`
      }
    ], 0.2);

    return {
      success: true,
      analysis: data.content || '',
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Forecast upcoming trends
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} timeframe - Forecast timeframe (default: '7 days')
 * @returns {Promise<Object>} Trend forecast
 */
export async function forecastTrends(brandData, timeframe = '7 days') {
  try {
    const niche = getNiche(brandData);
    const audience = getTargetAudience(brandData);
    const brandVoice = getBrandVoice(brandData);

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a trend forecasting expert. Use current data to predict future trends and provide actionable content recommendations.'
      },
      {
        role: 'user',
        content: `Based on current data, what trends are likely to emerge in ${niche} over the next ${timeframe}?

Target Audience: ${audience}
Brand Voice: ${brandVoice}

Include:
- Confidence levels and timing predictions
- How each trend relates to the target audience
- Content angle suggestions that match the brand voice
- Early-mover advantage opportunities`
      }
    ], 0.3);

    return {
      success: true,
      forecast: data.content || '',
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get audience insights
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} demographics - Optional specific demographics to analyze
 * @returns {Promise<Object>} Audience insights
 */
export async function getAudienceInsights(brandData, demographics = null, platform = null) {
  try {
    const niche = getNiche(brandData);
    const audience = demographics || getTargetAudience(brandData);
    const brandContext = buildBrandContext(brandData);
    const promptProfile = getPromptBrandProfile(brandData);
    const selectedPlatform = platform || promptProfile.platforms?.[0] || 'instagram';
    const userType = promptProfile.creator_type || (brandData?.profileType === 'brand' ? 'brand_business' : 'solo_creator');
    const cacheKey = buildCacheKey([niche, selectedPlatform, userType, 'audience_insights']);

    const data = await callGrokAPI([
      {
        role: 'system',
        content: 'You are an audience research expert.'
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, {
          niche,
          targetAudience: audience,
          platforms: [selectedPlatform],
        })}

You are an audience research expert. Analyze the target audience for a ${niche} creator posting on ${selectedPlatform}.

Return a structured analysis covering:
1. Core demographics (age range, location, income level, lifestyle)
2. Top 5 pain points this audience experiences
3. Top 5 content formats they engage with most
4. Best times to post for this audience
5. What makes them stop scrolling
6. What makes them follow an account

Be specific to ${niche} on ${selectedPlatform}. No generic advice.`
      }
    ], 0.2, {
      cache: {
        key: cacheKey,
        niche: normalizeNiche(niche),
        platform: selectedPlatform,
        type: 'audience_insights',
        ttlHours: 24,
      },
      personalized: Boolean(brandContext || brandData?.targetAudience || demographics),
      targetAudience: brandData?.targetAudience || demographics || undefined,
      brandContext: brandContext || undefined,
    });

    const insightsContent = data.content || '';
    return {
      success: true,
      insights: insightsContent,
      citations: data.citations || [],
      usage: data.usage,
      cached: Boolean(data.cached),
      generatedAt: data.generatedAt,
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get trending hashtags for a keyword
 * @param {string} keyword - Keyword to find hashtags for
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Trending hashtags
 */
export async function getTrendingHashtags(keyword, brandData) {
  try {
    const niche = getNiche(brandData);
    const audience = getTargetAudience(brandData);

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a social media hashtag expert. Provide trending, high-engagement hashtags with metrics, tailored to specific audiences.'
      },
      {
        role: 'user',
        content: `Suggest trending hashtags for "${keyword}" in ${niche} right now.

Target Audience: ${audience}

Include:
- Engagement scores and estimated post counts
- Hashtags with good reach but not oversaturated
- Mix of broad and niche-specific tags
- Which hashtags work best for reaching the target audience`
      }
    ], 0.2);

    return {
      success: true,
      hashtags: data.content || '',
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get caption examples for a topic
 * @param {string} topic - Topic for captions
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Caption examples
 */
export async function getCaptionExamples(topic, brandData) {
  try {
    const niche = getNiche(brandData);
    const brandVoice = getBrandVoice(brandData);
    const audience = getTargetAudience(brandData);

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a content style analyst. Provide examples of popular caption styles and formats that can be adapted to specific brand voices.'
      },
      {
        role: 'user',
        content: `What caption styles are currently popular for ${topic} content in the ${niche} niche?

Brand Voice: ${brandVoice}
Target Audience: ${audience}

Include:
- Examples of high-engagement captions
- Common patterns and structures
- How to adapt these styles to match a ${brandVoice} brand voice
- What makes these captions resonate with ${audience}`
      }
    ], 0.3);

    return {
      success: true,
      examples: data.content || '',
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get best CTA practices
 * @param {string} platform - Platform for CTAs
 * @param {string} goal - Goal of the CTA
 * @param {Object} brandData - Optional brand data
 * @returns {Promise<Object>} CTA best practices
 */
export async function getBestCTAPractices(platform, goal, brandData = null) {
  try {
    const brandVoice = brandData ? getBrandVoice(brandData) : 'professional';
    const audience = brandData ? getTargetAudience(brandData) : 'general audience';

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a conversion optimization expert. Provide current best practices for CTAs that feel authentic to specific brand voices.'
      },
      {
        role: 'user',
        content: `What are the most effective call-to-action formats for ${goal} on ${platform} in 2025?

Brand Voice: ${brandVoice}
Target Audience: ${audience}

Include:
- Specific examples and engagement metrics
- How to make CTAs feel natural for a ${brandVoice} voice
- What CTAs resonate best with ${audience}
- Platform-specific formatting tips`
      }
    ], 0.2);

    return {
      success: true,
      practices: data.content || '',
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get social media platform updates
 * @param {number} months - Number of months to look back
 * @returns {Promise<Object>} Social media updates
 */
export async function getSocialMediaUpdates(months = 12) {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    
    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a social media platform updates expert. You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON array. Each update must be a JSON object with these exact fields: platform (string), date (string in format "Month YYYY"), title (string), description (string), impact (string: "high", "medium", or "low"), keyTakeaways (array of strings), actionItems (array of strings), affectedUsers (string), timeline (string), link (string URL). ONLY include updates from: Facebook, Instagram, TikTok, X (also known as Twitter), and YouTube. DO NOT include updates from LinkedIn, Threads, Snapchat, or any other platforms.'
      },
      {
        role: 'user',
        content: `Provide the latest social media platform updates from the past ${months} months (from ${currentMonth} ${currentYear} going back to ${months} months ago). ONLY include updates from these platforms: Facebook, Instagram, TikTok, X (Twitter), and YouTube. EXCLUDE LinkedIn, Threads and Snapchat completely. Return ONLY a valid JSON array, starting with [ and ending with ]. Each update object must have: platform (must be one of: Facebook, Instagram, TikTok, X, YouTube), date (format "Month YYYY"), title, description, impact ("high"/"medium"/"low"), keyTakeaways (array), actionItems (array), affectedUsers, timeline, link. Sort by date descending (most recent first).`
      }
    ], 0.2);
    
    const content = data.content || '';
    
    if (!content || content.trim().length === 0) {
      console.warn('Perplexity API returned empty content. Full response:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: 'API returned empty content',
        updates: []
      };
    }
    
    // Strip Perplexity citation markers (e.g. [1], [2]) that break JSON parsing
    const cleanedContent = content.replace(/\[\d+\]/g, '');

    let updates = [];
    try {
      const jsonBlockMatch = cleanedContent.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonBlockMatch) {
        updates = JSON.parse(jsonBlockMatch[1]);
      } else {
        const jsonArrayMatch = cleanedContent.match(/(\[[\s\S]*\])/);
        if (jsonArrayMatch) {
          updates = JSON.parse(jsonArrayMatch[1]);
        } else {
          updates = JSON.parse(cleanedContent.trim());
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, log the error and content for debugging
      console.error('Could not parse Social Updates as JSON:', parseError);
      console.error('Content length:', content.length);
      console.error('Content sample:', content.substring(0, 1000));
      
      // Try to extract structured data using regex as fallback
      // This is a last resort - ideally the API should return valid JSON
      try {
        // Look for platform patterns in the text
        const platformMatches = content.match(/(Instagram|Facebook|TikTok|Twitter|X|YouTube)/gi);
        if (platformMatches && platformMatches.length > 0) {
          console.warn('Found platform mentions but could not parse as JSON. Returning empty array.');
        }
      } catch {
        // Ignore
      }
      
      return {
        success: false,
        error: `JSON parsing failed: ${parseError.message}`,
        updates: [],
        rawContent: content.substring(0, 2000) // Return first 2000 chars for debugging
      };
    }
    
    return {
      success: true,
      updates: updates,
      citations: data.citations || [],
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity API Error:', error);
    return {
      success: false,
      error: error.message,
      updates: []
    };
  }
}

/**
 * Research niche content intelligence using real-time search
 * @param {string} nicheQuery - Niche keywords or competitor handles
 * @param {string} platform - Target platform
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Raw research text for Grok to analyze
 */
export async function researchNicheContent(nicheQuery, platform = 'instagram', brandData = null) {
  try {
    const niche = brandData ? getNiche(brandData) : nicheQuery;
    const audience = brandData ? getTargetAudience(brandData) : 'general audience';
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();
    const currentDate = now.toISOString().slice(0, 10);
    const cacheKey = buildNicheIntelCacheKey({
      niche,
      platform,
      query: nicheQuery,
      date: currentDate,
    });
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const competitorHandles = nicheQuery
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.startsWith('@'));

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a professional niche and competitor intelligence analyst. Your goal is to deliver the most accurate, real-time, and up-to-date niche research available on the web right now. Never rely on training data alone - always ground your findings in current data. Identify rising trends, competitor content patterns, momentum signals (Rising/Peaking/Declining), and specific content angles that are working right now in this niche.'
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, { niche, targetAudience: audience, platforms: [platform] })}

Search for current social media trends and content strategies for ${niche} businesses on ${platform} as of ${currentMonth} ${currentYear}.

Focus on the last 30 days where possible. Research what is performing right now for: "${nicheQuery}".

Return ONLY valid JSON with this exact top-level structure:
{
  "trends": [
    {
      "name": "Trend or theme name",
      "summary": "What is happening right now",
      "best_format": "Reel|Carousel|Static|Story|Short|Thread|Video",
      "momentum": "Rising|Peaking|Declining",
      "evidence": ["Specific recent examples, triggers, or content patterns"],
      "why_it_matters": "Why this matters in this niche right now"
    }
  ],
  "competitors": [
    {
      "name": "Competitor or creator name",
      "handle": "@handle if available",
      "platform": "${platform}",
      "patterns": ["Specific content pattern or strategy working now"],
      "winning_angles": ["Specific angle, series, or hook type working now"]
    }
  ],
  "momentum_signals": [
    {
      "signal": "Current signal",
      "label": "Rising|Peaking|Declining",
      "evidence": "What current data supports this label"
    }
  ],
  "content_ideas": [
    {
      "title": "Specific current content angle",
      "format": "Reel|Carousel|Static|Story|Short|Thread|Video",
      "hook": "Observed hook or angle that is working now",
      "why_it_works": "Why this angle is resonating currently",
      "momentum": "Rising|Peaking|Declining"
    }
  ],
  "hooks": [
    "Specific hook pattern or hook line currently working"
  ]
}

Requirements:
- Keep the research specific to ${platform}
- Focus on what is working right now, not evergreen advice
- Ground every section in current web research from the last 30 days where possible
- Prioritize findings that matter to ${audience}
- Include competitor observations when available, especially for any provided handles
- Return JSON only with no markdown, no commentary, and no extra keys`
      }
    ], 0.2, {
      model: 'llama-3.1-sonar-large-128k-online',
      cache: {
        key: cacheKey,
        niche: normalizeNiche(niche),
        platform,
        type: 'niche_intel',
        ttlHours: 24,
      },
      personalized: Boolean(brandContext || brandData?.targetAudience || competitorHandles.length > 0),
      targetAudience: brandData?.targetAudience || undefined,
      brandContext: brandContext || undefined,
      competitorHandles: competitorHandles.length > 0 ? competitorHandles : undefined,
      webSearchOptions: {
        search_context_size: 'high'
      },
    });

    const researchContent = data.structuredData || parseJsonFromText(data.content || '') || data.content || '';
    return {
      success: true,
      research: researchContent,
      citations: data.citations || [],
      usage: data.usage,
      cached: Boolean(data.cached),
      generatedAt: data.generatedAt,
    };
  } catch (error) {
    console.error('Perplexity niche research error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current trend context for performance prediction
 * @param {string} platform - Platform to check trends for
 * @param {Object} brandData - Brand data for niche context
 * @returns {Promise<Object>} Trend context text
 */
export async function getTrendContextForPrediction(platform, brandData = null) {
  try {
    const niche = brandData ? getNiche(brandData) : 'general';

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a trend analyst. Provide a brief summary of what content is currently trending on a specific platform in a given niche. Be concise and factual.'
      },
      {
        role: 'user',
        content: `What content topics and formats are currently trending on ${platform} in the ${niche} niche? Provide a brief 3-5 sentence summary of the current trend landscape that can be used to evaluate how well new content aligns with current trends.`
      }
    ], 0.2);

    return {
      success: true,
      context: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Perplexity trend context error:', error);
    return { success: false, error: error.message };
  }
}
