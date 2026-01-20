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

import { buildSystemPrompt, getBrandVoice, getNiche, getTargetAudience, buildBrandContext } from '../utils/brandContextBuilder';
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
} from './demoMockData';

// SECURITY: Use server-side proxy instead of exposing API key in client
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
      model: 'grok-4-1-fast-reasoning'
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function generateTrendIdeas(brandData, trendTopic) {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log('[Demo Mode] Generating mock trend ideas');
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
    const systemPrompt = buildSystemPrompt(
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
    console.log('[Fallback] Using mock trend ideas due to API error');
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
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log('[Demo Mode] Generating mock captions');
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
    const systemPrompt = buildSystemPrompt(
      'You are a professional social media content writer. Create compelling, engaging captions that drive engagement.',
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
        content: `Write 4 compelling social media captions about: "${contentData.topic}". 

${platformContext}

PLATFORM-SPECIFIC REQUIREMENTS:
- Character limit: ${platformData?.charLimit || 2200} characters
- Hook style: ${hookGuidelines.style}
- Include ${hashtagGuidelines.count} hashtags (${hashtagGuidelines.style})
- CTA style: ${ctaGuidelines.style} (examples: ${ctaGuidelines.examples.slice(0, 3).join(', ')})

GENERAL REQUIREMENTS:
- Match the brand voice exactly
- Appeal to the target audience
- Keep it authentic and engaging
- Optimize for ${platformData?.name || 'social media'} algorithm and culture

Number them 1-4. Each caption should have a different hook approach.`
      }
    ], 0.7);

    return {
      success: true,
      caption: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    console.log('[Fallback] Using mock captions due to API error');
    await simulateDelay(500, 1000);
    const length = contentData.length || 'medium';
    const mockCaptions = getCaptionMocks(length, 4);
    return {
      success: true,
      caption: mockCaptions.map((c, i) => `${i + 1}. ${c}`).join('\n\n'),
      usage: { fallback: true },
      note: 'Using demo content due to API unavailability'
    };
  }
}

export async function scoreContentQuality(content, brandData = null) {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log('[Demo Mode] Generating mock content score');
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
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const brandSection = brandContext ? `\n\nBrand Profile to evaluate against:\n${brandContext}` : '';

    const data = await callGrokAPI([
      {
        role: 'system',
        content: 'You are a content quality analyzer. Provide scores and specific improvement suggestions based on engagement potential and brand alignment.'
      },
      {
        role: 'user',
        content: `Analyze this content and provide a quality score (0-100) with breakdown for:
- Hook (attention-grabbing opening)
- CTA (call-to-action effectiveness)
- Hashtags (relevance and reach)
- Overall Engagement Potential
${brandData ? '- Brand Voice Alignment (how well it matches the brand)' : ''}

Content: ${content}${brandSection}

Provide specific, actionable improvement suggestions.`
      }
    ], 0.3);
    
    return {
      success: true,
      analysis: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    console.log('[Fallback] Using mock content score due to API error');
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
    const systemPrompt = buildSystemPrompt(
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
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log('[Demo Mode] Generating mock hooks');
    await simulateDelay(800, 1500);
    const mockHooks = getHookMocks(theme, 4);
    return {
      success: true,
      hooks: mockHooks.map((h, i) => `${i + 1}. ${h.text}`).join('\n'),
      usage: { demo: true }
    };
  }

  try {
    const niche = getNiche(brandData);
    const brandVoice = getBrandVoice(brandData);
    const audience = getTargetAudience(brandData);
    
    // Get platform-specific hook guidelines
    const hookGuidelines = getHookGuidelines(platform);
    const platformData = getPlatform(platform);

    const systemPrompt = buildSystemPrompt(
      'You are a content hook expert. Create attention-grabbing opening lines that stop the scroll.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Build 4 short hooks (under 15 words each) for: "${input}"

PLATFORM: ${platformData?.name || 'Social Media'}
Platform hook style: ${hookGuidelines.style}
Platform hook examples: ${hookGuidelines.examples.join(', ')}
Platform tip: ${hookGuidelines.tip}

Hook theme: ${theme}
Niche: ${niche}
Target audience: ${audience}

Each hook must:
- Match the ${brandVoice} brand voice
- Be optimized for ${platformData?.name || 'social media'} culture and algorithm
- Stop the scroll immediately
- Create curiosity or urgency
- Feel authentic to the brand

Number them 1-4. Vary the approach for each hook.`
      }
    ], 0.8);

    return {
      success: true,
      hooks: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    console.log('[Fallback] Using mock hooks due to API error');
    await simulateDelay(500, 800);
    const mockHooks = getHookMocks(theme, 4);
    return {
      success: true,
      hooks: mockHooks.map((h, i) => `${i + 1}. ${h.text}`).join('\n'),
      usage: { fallback: true },
      note: 'Using demo hooks due to API unavailability'
    };
  }
}

export async function generateCTAs(goal, brandData, platform = 'instagram') {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log('[Demo Mode] Generating mock CTAs');
    await simulateDelay(800, 1500);
    const mockCTAs = getCTAMocks(goal, 5);
    return {
      success: true,
      ctas: mockCTAs.map((c, i) => `${i + 1}. ${c}`).join('\n'),
      usage: { demo: true }
    };
  }

  try {
    const niche = getNiche(brandData);
    const brandVoice = getBrandVoice(brandData);
    const audience = getTargetAudience(brandData);
    
    // Get platform-specific CTA guidelines
    const ctaGuidelines = getCTAGuidelines(platform);
    const platformData = getPlatform(platform);

    const systemPrompt = buildSystemPrompt(
      'You are a call-to-action specialist. Create compelling, action-oriented CTAs that drive conversions.',
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

Niche: ${niche}
Target audience: ${audience}

Each CTA must:
- Match the ${brandVoice} brand voice
- Be optimized for ${platformData?.name || 'social media'} (what works best on this platform)
- Create urgency or desire
- Feel natural, not pushy
- Use platform-specific language and conventions

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
    
    // Fallback to demo data on error
    console.log('[Fallback] Using mock CTAs due to API error');
    await simulateDelay(500, 800);
    const mockCTAs = getCTAMocks(goal, 5);
    return {
      success: true,
      ctas: mockCTAs.map((c, i) => `${i + 1}. ${c}`).join('\n'),
      usage: { fallback: true },
      note: 'Using demo CTAs due to API unavailability'
    };
  }
}

export async function generateHashtags(input, brandData, platform = 'instagram') {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log('[Demo Mode] Generating mock hashtags');
    await simulateDelay(800, 1500);
    const hashtagGuidelines = getHashtagGuidelines(platform);
    const hashtagCount = hashtagGuidelines?.max || 10;
    const mockHashtags = getHashtagMocks(hashtagCount);
    return {
      success: true,
      hashtags: mockHashtags.map(h => `${h.tag} (Score: ${h.score}%, ${h.posts} posts)`).join('\n'),
      hashtagData: mockHashtags,
      usage: { demo: true }
    };
  }

  try {
    const niche = getNiche(brandData);
    const brandVoice = getBrandVoice(brandData);
    const audience = getTargetAudience(brandData);
    
    // Get platform-specific hashtag guidelines
    const hashtagGuidelines = getHashtagGuidelines(platform);
    const platformData = getPlatform(platform);
    
    // Determine hashtag count based on platform
    const hashtagCount = hashtagGuidelines.max || 10;

    const systemPrompt = buildSystemPrompt(
      'You are a hashtag expert. Generate relevant, high-engagement hashtags that boost discoverability.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Suggest ${hashtagCount} optimized hashtags for: "${input}"

PLATFORM: ${platformData?.name || 'Social Media'}
Recommended hashtag count: ${hashtagGuidelines.count}
Hashtag style for this platform: ${hashtagGuidelines.style}
Platform tip: ${hashtagGuidelines.tip}

Niche: ${niche}
Target audience: ${audience}

Requirements:
- Optimize for ${platformData?.name || 'social media'} algorithm and discovery
- Mix of popular and niche-specific hashtags appropriate for this platform
- Fit the ${brandVoice} brand voice
- Boost discoverability for the target audience
- Include a mix of reach sizes (high, medium, low competition)

Return exactly ${hashtagCount} hashtags ranked by engagement potential. For each hashtag include:
1. The hashtag
2. Estimated popularity/posts (e.g., "2.4M posts")
3. Engagement score (0-100)
4. Brief reason why it works for ${platformData?.name || 'this platform'}`
      }
    ], 0.5);

    return {
      success: true,
      hashtags: data.content || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    
    // Fallback to demo data on error
    console.log('[Fallback] Using mock hashtags due to API error');
    await simulateDelay(500, 800);
    const hashtagGuidelines = getHashtagGuidelines(platform);
    const hashtagCount = hashtagGuidelines?.max || 10;
    const mockHashtags = getHashtagMocks(hashtagCount);
    return {
      success: true,
      hashtags: mockHashtags.map(h => `${h.tag} (Score: ${h.score}%, ${h.posts} posts)`).join('\n'),
      hashtagData: mockHashtags,
      usage: { fallback: true },
      note: 'Using demo hashtags due to API unavailability'
    };
  }
}

export async function improveContent(content, suggestions, brandData) {
  try {
    const niche = getNiche(brandData);
    const systemPrompt = buildSystemPrompt(
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
    const systemPrompt = buildSystemPrompt(
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
    console.log('[Demo Mode] Generating mock caption variations');
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
    const systemPrompt = buildSystemPrompt(
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
    console.log('[Fallback] Using mock caption variations due to API error');
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
 * @param {string} mode - 'viral' for viral reach or 'sales' for sales conversion
 * @returns {Promise<Object>} Remixed content
 */
export async function remixContentWithMode(content, brandData, mode = 'viral') {
  try {
    // Define mode-specific system prompts
    const systemPrompts = {
      viral: "You are a Social Media Virality Expert. Your goal is maximum reach. Take the user's input and rewrite it to be punchy, relatable, and shareable. Use short sentences, trending formats, and emojis. Optimize for engagement and comments.",
      sales: "You are a Conversion Critic and Direct Response Copywriter. Your goal is revenue, not just views. Rewrite the user's input using the PAS (Problem-Agitation-Solution) framework. 1) Hook: Call out a specific customer pain point. 2) Body: Agitate the pain and present the offer as the solution. 3) CTA: Write an imperative Call to Action that requires a comment (e.g., 'Comment GUIDE'). 4) Objection: Add a P.S. handling a price or time objection."
    };

    const baseSystemPrompt = systemPrompts[mode] || systemPrompts.viral;
    const systemPrompt = buildSystemPrompt(baseSystemPrompt, brandData);

    const userPrompt = mode === 'sales' 
      ? `Remix this content for maximum sales conversion: "${content}"

Create 3 variations using the PAS framework. For each variation:
- Start with a pain-point hook that stops the scroll
- Agitate the problem to create urgency
- Present the solution naturally
- End with a comment-based CTA (e.g., "Comment READY to get started")
- Add a P.S. that handles a common objection

Format each variation clearly with labels.`
      : `Remix this trending content for my brand: "${content}". 

Adapt it to match my ${brandData?.brandVoice || 'engaging'} voice and create 3 variations for different platforms (Instagram, X (Twitter), TikTok).

Make each variation:
- Punchy and scroll-stopping
- Highly shareable and relatable
- Optimized for engagement and comments
- Include relevant emojis and trending formats`;

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
      ideas: data.content || '',
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
    const systemPrompt = buildSystemPrompt(
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
 * @returns {Promise<Object>} Generated visual ideas
 */
export async function generateVisualIdeas(prompt, brandData, platform = 'instagram') {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log('[Demo Mode] Generating mock visual ideas');
    await simulateDelay(1000, 2000);
    const mockIdeas = getVisualIdeaMocks(platform, 4);
    return {
      success: true,
      ideas: mockIdeas.map((idea, i) => 
        `${i + 1}. ${idea.title}\n   Description: ${idea.description}\n   Style: ${idea.style}\n   Format: ${idea.type}\n   Platform: ${idea.platform}`
      ).join('\n\n'),
      visualData: mockIdeas,
      usage: { demo: true }
    };
  }

  try {
    const platformData = getPlatform(platform);
    const platformContext = buildPlatformContext(platform, 'visual');
    
    const systemPrompt = buildSystemPrompt(
      'You are a visual content strategist. Create compelling image and video concepts that align with brand identity.',
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Generate 4 visual content ideas for: "${prompt}"

${platformContext}

PLATFORM-SPECIFIC REQUIREMENTS:
- Optimize visuals for ${platformData?.name || 'social media'}
- Consider ${platformData?.contentFormats?.join(', ') || 'various formats'}
- Match ${platformData?.audienceStyle || 'engaging visual style'}

For each idea, include:
- Visual concept description optimized for ${platformData?.name || 'social media'}
- Recommended format (${platformData?.contentFormats?.slice(0, 3).join(', ') || 'image, video, carousel'})
- Color palette suggestions
- Composition tips for ${platformData?.name || 'social media'}
- Text overlay suggestions (if applicable)
- Why this works for ${platformData?.name || 'this platform'}

Make sure all visuals align with the brand identity and appeal to the target audience.

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
    console.log('[Fallback] Using mock visual ideas due to API error');
    await simulateDelay(500, 1000);
    const mockIdeas = getVisualIdeaMocks(platform, 4);
    return {
      success: true,
      ideas: mockIdeas.map((idea, i) => 
        `${i + 1}. ${idea.title}\n   Description: ${idea.description}\n   Style: ${idea.style}\n   Format: ${idea.type}\n   Platform: ${idea.platform}`
      ).join('\n\n'),
      visualData: mockIdeas,
      usage: { fallback: true },
      note: 'Using demo visual ideas due to API unavailability'
    };
  }
}
