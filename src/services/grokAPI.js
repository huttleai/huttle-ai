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
  // Check if demo mode is enabled AND no real topic provided - return mock data
  if (isDemoMode() && !contentData.topic?.trim()) {
    console.log('[Demo Mode] Generating mock captions (no topic provided)');
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
  // Check if demo mode is enabled AND no real input - return mock data
  if (isDemoMode() && !input?.trim()) {
    console.log('[Demo Mode] Generating mock hooks (no input provided)');
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

export async function generateCTAs(goal, brandData, platform = 'instagram') {
  // Check if demo mode is enabled AND no real goal - return mock data
  if (isDemoMode() && !goal?.trim()) {
    console.log('[Demo Mode] Generating mock CTAs (no goal provided)');
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
  // Check if demo mode is enabled AND no real input - return mock data
  if (isDemoMode() && !input?.trim()) {
    console.log('[Demo Mode] Generating mock hashtags (no input provided)');
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
    
    // Fallback: generate hashtags from the user's actual input
    const words = (input || 'content').split(/\s+/).filter(w => w.length > 2);
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
      note: 'Using fallback hashtags due to API unavailability'
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
    const systemPrompt = buildSystemPrompt(baseSystemPrompt, brandData);

    const modeLabels = {
      viral: 'maximum viral reach and engagement',
      sales: 'maximum sales conversion',
      educational: 'educational value and practical takeaways',
      community: 'community building and conversation'
    };
    const modeGoal = modeLabels[mode] || modeLabels.viral;

    const userPrompts = {
      sales: `Remix this content for ${modeGoal}: "${content}"

Create 2-3 variations for these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Start with a pain-point hook that stops the scroll
- Agitate the problem to create urgency
- Present the solution naturally
- End with a comment-based CTA (e.g., "Comment READY to get started")
- Add a P.S. that handles a common objection
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section.`,
      educational: `Remix this content for ${modeGoal}: "${content}"

Create 2-3 variations for these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Start with a curiosity-driven hook
- Break down the information into clear, numbered tips or steps
- Use simple language and practical examples
- End with a takeaway or actionable next step
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section.`,
      community: `Remix this content for ${modeGoal}: "${content}"

Create 2-3 variations for these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Start with a relatable statement or shared experience
- Include open-ended questions to spark discussion
- Use "this or that" or poll-style formats where appropriate
- End with an invitation to share their own experience
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section.`,
      viral: `Remix this trending content for ${modeGoal}: "${content}"

Create 2-3 variations for these platforms: ${platformList}.

For each variation:
- Label it with the target platform name (e.g., "### Instagram", "### TikTok")
- Make it punchy and scroll-stopping
- Highly shareable and relatable
- Optimized for engagement and comments
- Include relevant emojis and trending formats
- Optimize for the specific platform's format and audience

Format: Use "### Platform Name" as headers for each platform section.`
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
 * @param {'image'|'video'|'all'} mediaType - Type of media concepts to generate ('image' for static, 'video' for motion, 'all' for mixed)
 * @returns {Promise<Object>} Generated visual ideas
 */
export async function generateVisualIdeas(prompt, brandData, platform = 'instagram', mediaType = 'all') {
  // Check if demo mode is enabled - return mock data immediately
  if (isDemoMode()) {
    console.log(`[Demo Mode] Generating mock ${mediaType} ideas`);
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

    const systemPrompt = buildSystemPrompt(systemRole, brandData);

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
    console.log(`[Fallback] Using mock ${mediaType} ideas due to API error`);
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
