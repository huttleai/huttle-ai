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
import { getRealtimeHashtagResearch } from './perplexityAPI';
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
const GROK_REASONING_MODEL = 'grok-4.1-fast-reasoning';
const HOOK_TYPE_ALIASES = {
  question: 'Question',
  teaser: 'Teaser',
  shocking_stat: 'Shocking Stat',
  story: 'Story',
  bold_claim: 'Bold Claim',
};
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
  const fullPrompt = buildSystemPromptWithBrandBlock(basePrompt, brandData);
  return brandBlock ? `${brandBlock}\n${fullPrompt}` : fullPrompt;
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

/**
 * Make a request to the Grok API via the secure proxy
 */
async function callGrokAPI(messages, temperature = 0.7) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(GROK_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      temperature,
      model: GROK_REASONING_MODEL
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
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
      .slice(0, 5)
    : [];

  return {
    trendingThemes,
    hookPatterns,
    contentGaps,
    contentIdeas,
  };
}

function normalizeRankedHashtagData(rawItems, hashtagCount) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item, index) => {
      const rawTag = String(item?.tag || item?.hashtag || '').trim();
      if (!rawTag) return null;

      const parsedScore = Number.parseInt(item?.score ?? item?.engagementScore ?? 0, 10);
      const score = Number.isFinite(parsedScore)
        ? Math.min(Math.max(parsedScore, 0), 100)
        : Math.max(90 - (index * 5), 40);
      const estimatedPosts = String(item?.estimatedPosts || item?.posts || item?.postCount || '').trim() || 'Unknown';
      const rawMomentum = String(item?.momentum || item?.trend || '').trim().toLowerCase();
      const momentum = rawMomentum === 'rising' || rawMomentum === 'peaking' || rawMomentum === 'stable'
        ? rawMomentum.charAt(0).toUpperCase() + rawMomentum.slice(1)
        : 'Stable';

      return {
        tag: rawTag.startsWith('#') ? rawTag : `#${rawTag.replace(/^#*/, '')}`,
        score,
        posts: estimatedPosts,
        estimatedPosts,
        momentum,
        reason: String(item?.reason || item?.why || '').trim(),
        tier: score >= 85 ? 'HIGH' : score >= 70 ? 'MEDIUM' : 'NICHE',
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
    ], 0.8);

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

export async function generateCaption(contentData, brandData) {
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
    const brandSection = buildPromptBrandSection(brandData, {
      tone: promptProfile.tone,
      platforms: promptProfile.platforms,
    });
    const systemPrompt = buildSystemPromptWithBrandBlock(
      `You are Caption Architect — an elite social media copywriter who has written captions for 7-figure creator brands and Fortune 500 companies. You combine conversion copywriting with deep platform psychology to produce captions that stop the scroll, build connection, and drive measurable action.

CHAIN-OF-THOUGHT (apply internally before every output):
1. AUDIENCE INTENT: What does this person want to feel or accomplish? What tension or desire does this topic tap into?
2. PLATFORM RHYTHM: What sentence length, pacing, and line-break style performs best on this specific platform?
3. HOOK SELECTION: Which archetype fits best — question, bold claim, story open, statistic, controversy, or curiosity gap?
4. BODY STRUCTURE: Build value or tension in the middle. Use short sentences and intentional white space.
5. CTA ALIGNMENT: Does the closing ask match the emotional state the caption just created?

OUTPUT RULES:
- ${isSingleCaptionMode ? 'Return exactly 1 caption.' : 'Number captions 1–4.'}
- ${isSingleCaptionMode ? 'Use the provided hook as the exact opening line.' : 'Caption 1 = Educational / informative'}
- ${isSingleCaptionMode ? 'Maintain narrative flow from the hook through the body.' : 'Caption 2 = Emotional / story-driven'}
- ${isSingleCaptionMode ? 'End with a soft CTA setup, not the final hard sell.' : 'Caption 3 = Direct promotional with a clear offer angle'}
- ${isSingleCaptionMode ? 'Do not include placeholder text or alternative versions.' : 'Caption 4 = Social proof / results-focused'}
- Each caption must mention a pain point, desire, or outcome that is specific to the niche and target audience.
- Each caption must stay specific to the user's business, audience, and platform.
- Body: 2–5 punchy paragraphs with line breaks for mobile readability
- ${isSingleCaptionMode ? 'Use a soft CTA setup only; the CTA step will complete the post.' : 'One clear CTA per caption, placed at the end'}
- ${isSingleCaptionMode ? 'Do not include placeholder text, [brackets], or fake links.' : 'Hashtags after a blank line — never mid-copy'}
- NO filler openers: "Are you ready?", "In today's post...", "Hey guys!"
- NO passive voice, corporate jargon, or vague enthusiasm
- NO caption that could apply to any brand — each must feel specific

CREATOR-TYPE BRANCHING:
${creatorPromptGuidance.instructions}

${buildPromptGuardrails({ includeStats: true, readyToUse: true })}

QUALITY GATE: Before outputting, confirm each caption has a distinct hook, a payoff in the body, and a CTA that matches the platform's culture.

VAGUE INPUT FALLBACK: If the topic is absent, one word, or clearly incomplete, generate 4 captions treating it as a broad content pillar and prepend: "Interpreting '[topic]' as a content theme — here are 4 directions. Edit the topic for more tailored results."`,
      brandData
    );
    
    // Get platform-specific context
    const platform = contentData.platform || 'instagram';
    const platformContext = buildPlatformContext(platform, 'caption');
    const platformData = getPlatform(platform);
    const hashtagGuidelines = getHashtagGuidelines(platform);
    const hookGuidelines = getHookGuidelines(platform);
    const ctaGuidelines = getCTAGuidelines(platform);

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `${brandSection}

Write ${isSingleCaptionMode ? '1 compelling social media caption' : '4 compelling social media captions'} about: "${contentData.topic}". 

${platformContext}

PLATFORM-SPECIFIC REQUIREMENTS:
- Character limit: ${platformData?.charLimit || 2200} characters
- Hook style: ${hookGuidelines.style}
- Include ${hashtagGuidelines.count} hashtags (${hashtagGuidelines.style})
- CTA style: ${ctaGuidelines.style} (examples: ${ctaGuidelines.examples.slice(0, 3).join(', ')})
- ${getCaptionPlatformInstructions(platform)}

GENERAL REQUIREMENTS:
- Creator type: ${creatorPromptGuidance.label}
- Speak to ${promptProfile.targetAudience}
- Match this brand tone exactly: ${promptProfile.tone}
- Make the content unmistakably relevant to a ${promptProfile.niche} business
- Keep it authentic and engaging
- Optimize for ${platformData?.name || 'social media'} algorithm and culture
- ${creatorPromptGuidance.creatorType === 'solo_creator'
  ? 'Make the voice feel personal, relatable, and creator-led, using first-person phrasing where natural.'
  : 'Make the voice feel polished, trustworthy, and conversion-aware, using brand/service language where natural.'}
- If a hook is provided, use it as the exact opening line: ${contentData.selectedHook ? `"${contentData.selectedHook}"` : 'No fixed hook provided'}
- If a goal is provided, align the CTA and offer framing to: ${contentData.goal || 'engagement'}
- ${promptProfile.contentStyle}

${isSingleCaptionMode
  ? 'Write only the single caption, with no numbering or alternatives.'
  : 'Number them 1-4. Each caption should have a different strategic angle and should feel ready to publish as-is.'}`
      }
    ], 0.7);

    return {
      success: true,
      caption: data.content || '',
      usage: data.usage
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

export async function scoreContentQuality(content, brandData = null) {
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
    const creatorBlock = buildCreatorBrandBlock(brandData, brandData); // HUTTLE AI: brand context injected
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const brandSection = brandContext ? `\n${creatorBlock}\nBrand Profile to evaluate against:\n${brandContext}` : (creatorBlock || '');
    const promptProfile = getPromptBrandProfile(brandData);
    const primaryPlatform = promptProfile.platforms[0] || 'Instagram';

    const messages = [
      {
        role: 'system',
        content: `You are Content Intelligence Engine — a senior content strategist trained on thousands of viral posts, A/B test results, and platform algorithm signals. You combine data-driven analysis with creative judgment. You are direct, specific, and never give meaningless praise or vague suggestions.

SCORING DIMENSIONS (max 100 total):
- Hook Strength (0–25): Does the first line make you stop scrolling?
- Audience Relevance (0–20): Is the content clearly specific to the target audience's needs and desires?
- Clarity of Message (0–20): Is the main point obvious and easy to follow?
- Call to Action (0–20): Is there a clear next step for the reader?
- Platform Fit (0–15): Is the length, tone, and format right for the target platform?

CHAIN-OF-THOUGHT (apply before scoring):
1. Read the entire content before assigning any score
2. Identify the single strongest element and the single weakest element
3. For each dimension: "What would need to change to gain 10 points here?"
4. Are the improvement suggestions specific enough to act on in under 5 minutes?
5. Is the overall verdict honest, even if the score is low?

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "totalScore": 62,
  "scoreBand": "good foundation, specific fixes needed",
  "summary": "One honest sentence identifying the biggest improvement opportunity",
  "categoryScores": {
    "hookStrength": { "score": 9, "max": 25, "feedback": "Specific, actionable feedback" },
    "audienceRelevance": { "score": 13, "max": 20, "feedback": "..." },
    "clarityOfMessage": { "score": 15, "max": 20, "feedback": "..." },
    "callToAction": { "score": 8, "max": 20, "feedback": "..." },
    "platformFit": { "score": 12, "max": 15, "feedback": "..." }
  },
  "improvements": [
    "2-3 highly specific improvements tied to the actual weak spots"
  ],
  "weakestSection": {
    "name": "Hook Strength",
    "rewriteExample": "A concrete rewritten example for the weakest area only"
  }
}

QUALITY GATES:
- Scores must add up to exactly 100
- Keep average content in the 45-70 range unless it is unusually strong
- Missing hook = hookStrength between 0 and 8
- Missing CTA = callToAction between 0 and 5
- A total below 50 means "needs major revision"
- 50-69 means "good foundation, specific fixes needed"
- 70-84 means "solid, minor improvements suggested"
- 85-100 means "strong, publish-ready"
- Never fabricate platform metrics or statistics

${buildPromptGuardrails({ includeStats: true })}

VAGUE INPUT FALLBACK: If content is empty or under 20 characters, return: { "error": "Content too short to analyze. Provide the full post text including hashtags and CTA for an accurate score." }`
      },
      {
        role: 'user',
        content: `Analyze this content and score it for ${primaryPlatform}.

${buildPromptBrandSection(brandData, { platforms: [primaryPlatform] })}

Use this rubric:
- Hook Strength (0-25)
- Audience Relevance (0-20)
- Clarity of Message (0-20)
- Call to Action (0-20)
- Platform Fit for ${primaryPlatform} (0-15)

Content: ${content}${brandSection}

Provide 2-3 specific improvements and one concrete rewrite example for the weakest section.`
      }
    ];
    let data;
    try {
      data = await callClaudeAPI([...messages], 0.3);
    } catch (claudeError) {
      if (claudeError.message?.includes('coming soon')) {
        data = await callGrokAPI([...messages], 0.3);
      } else {
        throw claudeError;
      }
    }
    
    const parsed = parseJsonFromResponse(data.content || '');
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
        usage: data.usage
      };
    }

    return {
      success: true,
      analysis: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    await simulateDelay(500, 800);
    const mockScore = getContentScoreMock(content);
    return {
      success: true,
      analysis: JSON.stringify(mockScore),
      score: mockScore,
      usage: { fallback: true },
      note: 'Using demo scoring due to API unavailability'
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
    ], 0.6);

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

export async function generateHooks(input, brandData, theme = 'question', platform = 'instagram') {
  // Check if demo mode is enabled AND no real input - return mock data
  if (isDemoMode() && !input?.trim()) {
    await simulateDelay(800, 1500);
    const mockHooks = getHookMocks(theme, 4);
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
    
    // Get platform-specific hook guidelines
    const hookGuidelines = getHookGuidelines(platform);
    const platformData = getPlatform(platform);

    const systemPrompt = buildSystemPromptWithBrandBlock(
      `You are Hook Sniper — a direct response copywriter obsessed with the first 3 seconds of attention. You have reverse-engineered thousands of viral hooks and understand the neurological triggers that halt a thumb mid-scroll. Your hooks create an involuntary "wait, what?" response.

THE 6 ARCHETYPES YOU MASTER:
- Question: Forces internal answer, creates cognitive open loop
- Bold Claim: States something counterintuitive that demands proof
- Story Open: Drops the reader mid-scene ("I was 3 months from quitting...")
- Statistic: Leads with a number so surprising it requires context
- Controversy: Takes an unpopular stance that forces a reaction
- Curiosity Gap: Hints at insider knowledge without revealing it

CHAIN-OF-THOUGHT (apply before generating):
1. What is the core tension or surprise hiding inside this topic?
2. Which archetype creates the strongest "stop the scroll" moment?
3. Can I say it in fewer words without losing impact?
4. Does it promise a payoff that earns the next line?
5. Is it specific enough to feel real — not like generic advice content?

OUTPUT RULES:
- Exactly 4 hooks, numbered 1–4
- Hard limit: 15 words per hook
- Hook 1 must be a question hook addressing a specific pain point
- Hook 2 must be a statistic-style hook using a plausible general claim without fabricated numbers
- Hook 3 must be a contrarian hook challenging a common belief in this niche
- Hook 4 must be a story hook opening a relatable scenario for this audience
- No hooks starting with "Are you...", "Have you ever...", "Do you want..."
- Every hook must stand alone — no context required to understand it
- Emojis only if brand voice explicitly calls for them

CREATOR-TYPE BRANCHING:
${creatorPromptGuidance.instructions}

${buildPromptGuardrails({ includeStats: true, readyToUse: true })}

QUALITY GATE: Read each hook out loud. If it doesn't create a physical "lean in" reaction, rewrite it.

VAGUE INPUT FALLBACK: If the input is missing or a single generic word, generate 4 niche-appropriate hooks and prepend: "No specific topic detected — generating hooks for your content niche. Add a topic for precision targeting."`,
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, { platforms: [platform] })}

Build 4 short hooks (under 15 words each) for: "${input}"

PLATFORM: ${platformData?.name || 'Social Media'}
Platform hook style: ${hookGuidelines.style}
Platform hook examples: ${hookGuidelines.examples.join(', ')}
Platform tip: ${hookGuidelines.tip}

Requested emphasis: ${theme}
Niche: ${niche}
Target audience: ${audience}
Creator type: ${creatorPromptGuidance.label}
${getAudiencePainPointGuidance(niche)}

Each hook must:
- Match the ${brandVoice} brand voice
- Be optimized for ${platformData?.name || 'social media'} culture and algorithm
- Stop the scroll immediately
- Create curiosity or urgency
- Feel authentic to the brand
- Reference a specific audience frustration, desire, belief, or lived scenario within this niche
- ${creatorPromptGuidance.creatorType === 'solo_creator'
  ? 'For solo creators, lean into first-person, relatable, creator-native phrasing when it sharpens the hook.'
  : 'For brands/businesses, lean into expert positioning, service outcomes, and authority-first framing.'}

Number them 1-4 and return only the hooks.`
      }
    ], 0.8);

    return {
      success: true,
      hooks: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback: generate hooks using the user's actual input
    const fallbackHooks = [
      `1. What if everything you knew about ${input} was wrong?`,
      `2. Stop scrolling — this changes everything about ${input}.`,
      `3. I tried ${input} for 30 days. Here's what happened...`,
      `4. The truth about ${input} that nobody talks about.`
    ];
    return {
      success: true,
      hooks: fallbackHooks.join('\n'),
      usage: { fallback: true },
      note: 'Using fallback hooks due to API unavailability'
    };
  }
}

export async function generateFullPostHooks({ topic, hookType = 'Question', platform = 'instagram' }, brandData) {
  try {
    const promptProfile = getPromptBrandProfile(brandData, { platforms: [platform] });
    const platformData = getPlatform(platform);
    const safeHookType = HOOK_TYPE_ALIASES[hookType] || hookType;

    const data = await callGrokAPI([
      {
        role: 'system',
        content: buildSystemPromptWithBrandBlock(
          `You are a professional social media copywriter. Generate hooks that are accurate to current platform behavior and stop-scroll patterns. Each hook must be under 15 words, feel native to the selected platform, and match the creator's brand voice.

OUTPUT RULES:
- Return exactly 4 hooks, numbered 1-4.
- Every hook must be a ${safeHookType} hook.
- Every hook must feel distinct in phrasing, rhythm, and emotional angle.
- Keep every hook specific to the topic and platform.
- Never use placeholders or generic filler.
- ${safeHookType === 'Shocking Stat' ? 'Do not invent percentages or precise statistics. Use qualitative surprise language only.' : 'Keep the opening copy-paste ready.'}

${buildPromptGuardrails({ includeStats: true, readyToUse: true })}`,
          brandData
        )
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, { platforms: [platform] })}

Generate 4 ${safeHookType} hooks for this full-post workflow.

Topic: "${topic}"
Platform: ${platformData?.name || platform}
${getAudiencePainPointGuidance(promptProfile.niche)}

Requirements:
- Hook type: ${safeHookType}
- Match the creator's brand tone: ${promptProfile.tone}
- Stay under 15 words per hook
- Make each hook platform-native for ${platformData?.name || platform}
- Make each hook specific to this niche and audience

Return only the numbered hooks.`
      }
    ], 0.7);

    return {
      success: true,
      hooks: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Full post hook generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate styled CTAs grouped by category (Direct, Soft, Urgency, Question, Story)
 * @param {Object} params - { promoting, goalType, platform }
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Styled CTAs grouped by category
 */
export async function generateStyledCTAs(params, brandData, platform = 'instagram') {
  const { promoting, goalType, selectedHook, caption } = params;

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
    const systemPrompt = buildSystemPromptWithBrandBlock(
      `You are a conversion copywriter specializing in social media. Generate CTAs that drive the specific goal selected, feel native to the platform, and match the creator's brand voice and tone.

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "ctas": [
    { "style": "CTA 1", "cta": "...", "tip": "..." },
    { "style": "CTA 2", "cta": "...", "tip": "..." },
    { "style": "CTA 3", "cta": "...", "tip": "..." },
    { "style": "CTA 4", "cta": "...", "tip": "..." },
    { "style": "CTA 5", "cta": "...", "tip": "..." }
  ],
  "platformTip": "which CTA style performs best on this platform for this goal, and the single biggest CTA mistake to avoid here"
}

QUALITY GATES:
- Return exactly 5 platform-specific CTAs
- Each CTA must point toward the requested goal
- Each CTA must reference the creator's topic, offer, or outcome
- Use platform-native action language for ${platformData?.name || platform}
- Make the CTA feel natural, specific, and conversion-aware

CREATOR-TYPE BRANCHING:
${creatorPromptGuidance.instructions}

${buildPromptGuardrails({ readyToUse: true })}

VAGUE INPUT FALLBACK: If the promoting field is empty or generic, generate CTAs for a broad "offer or content" and note in platformTip: "No specific offering provided — CTAs are intentionally broad. Add what you're promoting for hyper-specific results."`,
      brandData
    );

    const data = await callGrokAPI([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, { platforms: [platform] })}

Generate 5 CTAs for someone promoting: "${promoting}"
Goal: ${goalLabels[goalType] || goalType}
Platform: ${platformData?.name || platform}
Brand tone to match: ${promptProfile.tone}
Creator type: ${creatorPromptGuidance.label}
Selected hook: ${selectedHook || 'Not provided'}
Caption context: ${caption || 'Not provided'}

Platform CTA style: ${ctaGuidelines.style}
Platform examples: ${ctaGuidelines.examples.join(', ')}
Platform fit reminder: use ${platform === 'instagram' ? 'bio-link, save, comment, or DM language' : platform === 'facebook' ? 'button, share, or comment language' : platform === 'tiktok' ? 'comment, follow, or DM language' : platform === 'linkedin' ? 'message, comment, or profile CTA language' : 'platform-native next-step language'}

Generate exactly 5 CTAs, one for each style below. Return ONLY a JSON object:
{
  "ctas": [
    { "style": "CTA 1", "cta": "CTA text here", "tip": "why this CTA works" },
    { "style": "CTA 2", "cta": "CTA text here", "tip": "why this CTA works" },
    { "style": "CTA 3", "cta": "CTA text here", "tip": "why this CTA works" },
    { "style": "CTA 4", "cta": "CTA text here", "tip": "why this CTA works" },
    { "style": "CTA 5", "cta": "CTA text here", "tip": "why this CTA works" }
  ],
  "platformTip": "which CTA style tends to perform best on ${platformData?.name || platform} and why"
}

IMPORTANT: Each CTA should be specific to "${promoting}" — not generic. Reference the service, outcome, or transformation wherever possible. Use platform conventions for ${platformData?.name || platform}.
- ${creatorPromptGuidance.creatorType === 'solo_creator'
  ? 'For solo creators, favor community, conversation, creator growth, and personal-brand phrasing.'
  : 'For brands/businesses, favor bookings, consultations, lead capture, trust, and outcome-focused service language.'}`
      }
    ], 0.7);

    let parsed;
    try {
      const content = data.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    if (parsed?.ctas) {
      return { success: true, ctas: parsed.ctas, platformTip: parsed.platformTip || '', usage: data.usage };
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
      usage: data.usage
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
      usage: { fallback: true }
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
    ], 0.7);

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

export async function generateHashtags(input, brandData, platform = 'instagram') {
  const request = typeof input === 'string'
    ? { topic: input, platform }
    : { ...(input || {}), platform: input?.platform || platform };
  const topic = request.topic || '';
  const selectedHook = request.selectedHook || '';
  const caption = request.caption || '';
  const isFullPostBuilderRequest = typeof input === 'object' && input !== null;

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
    const realtimeResearch = await getRealtimeHashtagResearch({
      topic,
      platform,
      selectedHook,
      caption,
    }, brandData);
    const niche = getNiche(brandData, topic || 'general creator');
    const audience = getTargetAudience(brandData, 'general audience');
    const liveResearchText = realtimeResearch.success
      ? (realtimeResearch.research || 'No live research returned.')
      : '';
    const hasRealtimeResearch = Boolean(realtimeResearch.success && liveResearchText.trim());
    const systemPrompt = buildSystemPromptWithBrandBlock(
      `You are a hashtag ranking specialist for social media growth. Use the live research provided to rank the most current and high-performing hashtags for the topic and platform.

OUTPUT FORMAT — Return ONLY a valid JSON array:
[
  {
    "hashtag": "#ExactHashtag",
    "engagementScore": 84,
    "estimatedPosts": "2.4M posts",
    "momentum": "Rising",
    "reason": "One sentence explaining why this hashtag is high-potential right now"
  }
]

QUALITY GATES:
- Return exactly ${hashtagCount} hashtags
- Rank by current engagement opportunity using the live research first when it is available
- Score each hashtag from 0-100 for engagement potential
- Keep the list platform-native for ${platformData?.name || platform}
- Avoid filler hashtags unless the live research strongly supports them
- Never output markdown or commentary outside the JSON array

${buildPromptGuardrails({ readyToUse: true })}`,
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, {
          niche,
          targetAudience: audience,
          platforms: [platform],
        })}

${hasRealtimeResearch ? `Given this real-time hashtag research:

${liveResearchText}

Select and rank the best 8-10 hashtags for a ${niche} creator posting about ${topic} on ${platformData?.name || platform}.`
          : `Perplexity Sonar real-time research is unavailable right now.

Generate the best fallback hashtag set for a ${niche} creator posting about ${topic} on ${platformData?.name || platform} using platform-native hashtag strategy knowledge.`}

Selected hook: ${selectedHook || 'Not provided'}
Caption context: ${caption || 'Not provided'}

Return ONLY a JSON array of exactly ${hashtagCount} ranked hashtags.
For each item include:
- hashtag
- engagementScore
- estimatedPosts
- momentum
- reason`
      }
    ], 0.4);
    const hashtagData = normalizeRankedHashtagData(parseJsonFromResponse(data.content), hashtagCount);

    if (hashtagData.length === 0) {
      throw new Error('Could not parse ranked hashtags response.');
    }

    return {
      success: true,
      hashtags: data.content || '',
      hashtagData,
      citations: realtimeResearch.citations || [],
      research: liveResearchText,
      usage: data.usage,
      realtime: hasRealtimeResearch,
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
    ], 0.7);

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
    ], 0.6);

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
    ], 0.8);

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
    ], mode === 'sales' ? 0.7 : 0.8);

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
    ], 0.7);

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
    ], 0.8);

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

    if (outputType === 'ai-prompt') {
      const systemPrompt = buildSystemPromptWithBrandBlock(
        `You are Prompt Architect — a specialist in AI-generated visual content with deep expertise in Midjourney, DALL-E 3, Adobe Firefly, and Stable Diffusion. You understand that great image prompts are structured in 5 layers, and you produce prompts that are copy-pasteable and consistently produce professional, on-brand results on the first generation attempt.

THE 5-LAYER PROMPT ARCHITECTURE:
1. SUBJECT: Who/what is the focal point, what are they doing, what emotion do they convey?
2. ENVIRONMENT: Setting, background, atmosphere, time of day
3. LIGHTING: Light source, direction, quality, color temperature
4. VISUAL STYLE: Photography style, art direction reference, color palette, mood, texture
5. TECHNICAL: Lens (e.g., 85mm f/1.4), aspect ratio, rendering quality

CHAIN-OF-THOUGHT (apply before generating):
1. What visual story does this topic want to tell?
2. What emotion should a viewer feel in the first 0.3 seconds?
3. What 3 creative angles would feel genuinely distinct from each other?
4. What style reference fits this platform, format, and brand aesthetic?
5. Does each prompt include all 5 architecture layers?

OUTPUT FORMAT — Return ONLY a valid JSON array of exactly 3 strings:
["Full detailed prompt 1", "Full detailed prompt 2", "Full detailed prompt 3"]

QUALITY GATES:
- Each prompt: 40–120 words — detailed but not bloated
- Include the correct aspect ratio for the platform/format in every prompt
- Each prompt must take a genuinely different creative angle — not variations of the same scene
- Never use vague modifiers like "beautiful" or "stunning" — use precise visual language (e.g., "soft side-lit with diffused window light")
- Include at least one unexpected or distinctive element per prompt to avoid generic AI output
- If the brand uses specific colors, weave them into lighting or palette

VAGUE INPUT FALLBACK: If topic is empty or a single generic word, generate 3 prompts treating it as a broad lifestyle/brand visual category and begin each string with "[Interpreted as brand lifestyle visual] ".`,
        brandData
      );

      const data = await callGrokAPI([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Generate exactly 3 detailed AI image generation prompts for this content topic: "${topic}"

Target platform: ${platformData?.name || platform}
Content format: ${contentFormat}
${platformContext}

REQUIREMENTS:
- Each prompt must be a single, detailed paragraph ready to paste into Midjourney/DALL-E
- Include specific visual details: subject, setting, lighting, camera angle, mood, colors, style
- Include the appropriate aspect ratio for ${platformData?.name || platform} ${contentFormat}
- Each prompt should take a DIFFERENT creative angle on the topic "${topic}"
- Be highly specific to the topic — never be generic or use "behind-the-scenes" clichés
- Include style modifiers (cinematic, editorial, minimalist, vibrant, etc.)

Return ONLY a JSON array of 3 prompt strings, like:
["prompt 1 text here", "prompt 2 text here", "prompt 3 text here"]`
        }
      ], 0.8);

      let prompts;
      try {
        const content = data.content || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        prompts = jsonMatch ? JSON.parse(jsonMatch[0]) : [content];
      } catch {
        prompts = (data.content || '').split(/\d+\./).filter(p => p.trim()).map(p => p.trim());
      }

      return { success: true, type: 'ai-prompt', prompts: prompts.slice(0, 3), usage: data.usage };
    } else {
      // Manual shoot guide
      const systemPrompt = buildSystemPromptWithBrandBlock(
        `You are Creative Director — a photographer and visual storyteller who has directed shoots for editorial brands, lifestyle creators, and product campaigns. You understand that most creators shoot alone with a phone and limited gear, so your guidance is practical, achievable, and immediately actionable. You never give advice that requires a professional crew or studio.

SHOOT GUIDE PILLARS:
- Shot List: 4 specific frames that tell a visual story and create variety
- Lighting: Natural light positioning, time of day, backup plan for bad light
- Composition: Rule of thirds, angles, layers, negative space
- Props & Styling: What to include AND what to exclude — less is more
- Mood & Palette: Target emotional tone + 2–3 specific color anchors
- Platform Tips: Exact aspect ratio, format requirement, first-frame strategy

CHAIN-OF-THOUGHT (apply before generating):
1. What visual story do these 4 shots tell together as a set?
2. What would the ideal viewer feel when they stop scrolling on this?
3. What props or settings does the creator likely already own?
4. What is the most common mistake creators make shooting this topic?
5. Is every recommendation specific to THIS topic — or could it apply to any shoot on earth?

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "shotList": [
    "Shot 1: specific description with angle and subject action",
    "Shot 2: ...",
    "Shot 3: ...",
    "Shot 4: unexpected or perspective-breaking shot"
  ],
  "lighting": "Topic-specific guidance + backup plan for low light",
  "composition": "Specific framing, angles, foreground/background guidance",
  "propsAndStyling": "What to include, what to avoid, how to style",
  "moodAndPalette": "Emotional target mood + 2-3 specific color references",
  "platformTips": "Exact aspect ratio (e.g. 9:16), format notes, and first-frame strategy for this platform and content format"
}

QUALITY GATES:
- Every recommendation must be specific to THIS topic — zero generic advice
- Shot list must include at least one unexpected angle or perspective
- Lighting must include a named backup plan ("If overcast: ...")
- Props section must include at least one "avoid this" item
- platformTips must state the exact aspect ratio as a fraction

VAGUE INPUT FALLBACK: If topic is empty or under 3 words, return guidance for a generic lifestyle shoot and add as the first shotList item: "Note: Topic too vague for precision — add specifics for tailored direction."`,
        brandData
      );

      const data = await callGrokAPI([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Create a detailed manual shoot guide for this content topic: "${topic}"

Target platform: ${platformData?.name || platform}
Content format: ${contentFormat}
${platformContext}

Return a JSON object with this exact structure:
{
  "shotList": ["shot 1 description", "shot 2 description", "shot 3 description", "shot 4 description"],
  "lighting": "Detailed lighting recommendations specific to '${topic}'",
  "composition": "Camera angles, framing tips, and composition guidance",
  "propsAndStyling": "What to include in the frame, styling recommendations",
  "moodAndPalette": "The vibe to aim for, recommended color palette",
  "platformTips": "Aspect ratio, format considerations, and best practices for ${platformData?.name || platform} ${contentFormat}"
}

Be HIGHLY SPECIFIC to the topic "${topic}" — never give generic photography advice. Every recommendation should relate directly to capturing this specific content.`
        }
      ], 0.7);

      let guide;
      try {
        const content = data.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        guide = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        guide = null;
      }

      if (!guide) {
        guide = {
          shotList: [`Wide shot of ${topic}`, `Close-up detail shot`, `Action/movement capture`, `Behind-the-scenes candid`],
          lighting: `Use natural light when possible for ${topic}. Golden hour provides the most flattering tones.`,
          composition: `Rule of thirds with the subject slightly off-center. Try multiple angles.`,
          propsAndStyling: `Keep props minimal and directly related to ${topic}. Ensure clean backgrounds.`,
          moodAndPalette: `Aim for an authentic, aspirational mood with warm tones.`,
          platformTips: `Optimize for ${platformData?.name || platform} ${contentFormat} format and aspect ratio.`
        };
      }

      return { success: true, type: 'shoot-guide', guide, usage: data.usage };
    }
  } catch (error) {
    console.error('Visual brainstorm error:', error);
    return { success: false, error: error.message || 'Failed to generate visual brainstorm' };
  }
}

/**
 * Score how "human" vs AI-generated content sounds.
 * Returns structured JSON with overall score, 4 dimension scores, and flagged phrases.
 */
export async function scoreHumanness(content, brandData = null) {
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
${content}`,
      },
    ];
    const data = await callGrokAPI([...messages], 0.3);

    const parsed = parseJsonFromResponse(data.content);
    if (parsed) {
      return { success: true, score: parsed, usage: data.usage };
    }
    return { success: true, rawAnalysis: data.content, usage: data.usage };
  } catch (error) {
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
    const data = await callGrokAPI([...messages], 0.5);

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
        data = await callGrokAPI([...messages], 0.3);
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
- contentIdeas: exactly 5 original ideas, specific enough to execute immediately
- Every momentum field must be exactly one of: Rising, Peaking, Declining
- Every content idea must be niche-specific, platform-specific, and grounded in the research findings
- Every content idea must include a direct hook, a momentum label, a whyThisWorks explanation, and 3-5 relevant hashtags
- All ideas must be original and aligned with the brand voice
- Never copy or closely paraphrase existing content
- Use competitor patterns and momentum_signals when provided
- Rank the 5 content ideas from strongest opportunity to weakest opportunity`,
      },
      {
        role: 'user',
        content: `${buildPromptBrandSection(brandData, { platforms: [platform] })}

Based on this niche research, generate content intelligence:

Research data:
${researchContext}

Target platform: ${platform}
${brandContext ? `\nBrand profile:\n${brandContext}` : ''}

Generate trending themes, hook patterns, content gaps, and 5 ranked original content ideas.

For content ideas:
- Make them immediately executable, not generic
- Translate the research into opportunities for THIS user
- Use "Rising" when the research suggests the topic is gaining traction, "Peaking" when it is hottest now, and "Declining" when it is fading
- Include 3-5 relevant hashtags for each idea
- Include one strong hook per idea`,
      },
    ];
    const data = await callGrokAPI(messages, 0.7);

    const parsed = parseJsonFromResponse(data.content);
    const normalizedAnalysis = normalizeNicheAnalysisPayload(parsed, platform);
    if (normalizedAnalysis) {
      return { success: true, analysis: normalizedAnalysis, usage: data.usage };
    }
    return { success: true, rawAnalysis: data.content, usage: data.usage };
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
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
  }
  return null;
}
