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
} from '../data/demo/demoMockData';

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
    const systemPrompt = buildSystemPrompt(
      `You are Caption Architect — an elite social media copywriter who has written captions for 7-figure creator brands and Fortune 500 companies. You combine conversion copywriting with deep platform psychology to produce captions that stop the scroll, build connection, and drive measurable action.

CHAIN-OF-THOUGHT (apply internally before every output):
1. AUDIENCE INTENT: What does this person want to feel or accomplish? What tension or desire does this topic tap into?
2. PLATFORM RHYTHM: What sentence length, pacing, and line-break style performs best on this specific platform?
3. HOOK SELECTION: Which archetype fits best — question, bold claim, story open, statistic, controversy, or curiosity gap?
4. BODY STRUCTURE: Build value or tension in the middle. Use short sentences and intentional white space.
5. CTA ALIGNMENT: Does the closing ask match the emotional state the caption just created?

OUTPUT RULES:
- Number captions 1–4, each opening with a distinct hook archetype
- Body: 2–5 punchy paragraphs with line breaks for mobile readability
- One clear CTA per caption, placed at the end
- Hashtags after a blank line — never mid-copy
- NO filler openers: "Are you ready?", "In today's post...", "Hey guys!"
- NO passive voice, corporate jargon, or vague enthusiasm
- NO caption that could apply to any brand — each must feel specific

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
        content: `You are Content Intelligence Engine — a senior content strategist trained on thousands of viral posts, A/B test results, and platform algorithm signals. You combine data-driven analysis with creative judgment. You are direct, specific, and never give meaningless praise or vague suggestions.

SCORING DIMENSIONS (max 100 total):
- Hook Strength (0–25): Does the first line stop the scroll? Is it specific and surprising? Does it earn the next sentence?
- Body & Value (0–25): Does the body deliver on the hook's promise? Is it well-paced, readable, and free of filler?
- CTA Effectiveness (0–20): Is the ask clear? Does the friction level match the content's emotional arc?
- Hashtag Quality (0–15): Are tags relevant, tiered, and platform-optimized?
- Brand Voice Alignment (0–15): Does tone, vocabulary, and personality match the stated brand profile?

CHAIN-OF-THOUGHT (apply before scoring):
1. Read the entire content before assigning any score
2. Identify the single strongest element and the single weakest element
3. For each dimension: "What would need to change to gain 10 points here?"
4. Are the improvement suggestions specific enough to act on in under 5 minutes?
5. Is the overall verdict honest, even if the score is low?

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "overallScore": 74,
  "grade": "B",
  "verdict": "One honest sentence identifying the biggest opportunity",
  "dimensions": {
    "hook":       { "score": 18, "max": 25, "feedback": "Specific, actionable feedback" },
    "body":       { "score": 20, "max": 25, "feedback": "..." },
    "cta":        { "score": 14, "max": 20, "feedback": "..." },
    "hashtags":   { "score": 10, "max": 15, "feedback": "..." },
    "brandVoice": { "score": 12, "max": 15, "feedback": "..." }
  },
  "topImprovements": [
    "Improvement #1 — include a rewrite example where possible",
    "Improvement #2",
    "Improvement #3"
  ],
  "strengths": ["What is already working well"]
}

QUALITY GATES:
- Never round every score to a multiple of 5 — be precise
- topImprovements must include at least one rewrite example
- A score above 85 requires explicit justification in the verdict
- Missing hashtags = 0 in that dimension with a fix instruction
- If no CTA is present, score CTA as 0 and write a suggested CTA in the feedback field

VAGUE INPUT FALLBACK: If content is empty or under 20 characters, return: { "error": "Content too short to analyze. Provide the full post text including hashtags and CTA for an accurate score." }`
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
- Each hook must use a different archetype (do not label them in output)
- No hooks starting with "Are you...", "Have you ever...", "Do you want..."
- Every hook must stand alone — no context required to understand it
- Emojis only if brand voice explicitly calls for them

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
        content: `Build 4 short hooks (under 15 words each) for: "${input}"

PLATFORM: ${platformData?.name || 'Social Media'}
Platform hook style: ${hookGuidelines.style}
Platform hook examples: ${hookGuidelines.examples.join(', ')}
Platform tip: ${hookGuidelines.tip}

Hook theme: ${theme}
Niche: ${niche.toLowerCase()}
Target audience: ${audience.toLowerCase()}

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

/**
 * Generate styled CTAs grouped by category (Direct, Soft, Urgency, Question, Story)
 * @param {Object} params - { promoting, goalType, platform }
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Styled CTAs grouped by category
 */
export async function generateStyledCTAs(params, brandData, platform = 'instagram') {
  const { promoting, goalType } = params;

  const goalLabels = {
    'engagement': 'Drive Engagement (comments, shares, saves)',
    'sales': 'Drive Sales/Conversions (purchases, sign-ups, downloads)',
    'dms': 'Drive DMs/Leads (direct messages, inquiries)'
  };

  // Demo mode
  if (isDemoMode()) {
    await simulateDelay(800, 1500);
    return {
      success: true,
      ctas: [
        { style: 'Direct', cta: `Grab your spot — link in bio`, tip: 'Clear and straightforward works best for high-intent audiences' },
        { style: 'Soft', cta: `Save this for your next session`, tip: 'Low-pressure CTAs boost saves and shares' },
        { style: 'Urgency', cta: `Only 10 spots left — DM "YES" now`, tip: 'Scarcity creates immediate action' },
        { style: 'Question', cta: `Would you try this? Drop a comment below`, tip: 'Questions drive comment engagement by 3x' },
        { style: 'Story', cta: `I went from burnt out to blissed out. Here's how...`, tip: 'Story-driven CTAs create emotional connection' }
      ],
      platformTip: `On ${platform}, soft CTAs and questions tend to drive the most engagement.`
    };
  }

  try {
    const platformData = getPlatform(platform);
    const ctaGuidelines = getCTAGuidelines(platform);
    const systemPrompt = buildSystemPrompt(
      `You are Conversion Architect — a direct response copywriter who has studied the psychology of micro-commitments, social proof triggers, and platform-specific friction points. You know a CTA is not a sentence at the end of a post — it is a precision-engineered invitation that matches the emotional state the content just created.

THE 5 CTA STYLES YOU MASTER:
- Direct: Clear imperative, zero ambiguity ("Tap the link in bio")
- Soft: Low-friction invite that lowers resistance ("Save this for later")
- Urgency: Time or scarcity trigger that activates loss aversion
- Question: Engagement bait that feeds the algorithm and builds community
- Story: First-person narrative that creates emotional resonance and curiosity about the outcome

CHAIN-OF-THOUGHT (apply before generating):
1. What specific action does the creator want the audience to take?
2. What emotional state is the audience in after consuming this content?
3. Which friction level fits the audience temperature — cold (soft) or warm (direct/urgency)?
4. What does this platform reward — comments, saves, clicks, DMs?
5. Is each CTA specific to THIS offering, or generic enough to apply anywhere?

OUTPUT FORMAT — Return ONLY valid JSON:
{
  "ctas": [
    { "style": "Direct", "cta": "exact CTA text — must reference the specific offering", "tip": "why this style works on [platform] for [goal]" },
    { "style": "Soft", "cta": "...", "tip": "..." },
    { "style": "Urgency", "cta": "...", "tip": "..." },
    { "style": "Question", "cta": "...", "tip": "..." },
    { "style": "Story", "cta": "...", "tip": "..." }
  ],
  "platformTip": "which CTA style performs best on this platform for this goal, and the single biggest CTA mistake to avoid here"
}

QUALITY GATES:
- Each CTA must name or reference what is being promoted — no generic filler
- Urgency CTAs must include a concrete scarcity or deadline element
- Question CTAs must end with a question or a specific emoji/word prompt
- Story CTAs must open with "I" and contain an emotional contrast
- Soft CTAs must feel like a gift, not an ask

VAGUE INPUT FALLBACK: If the promoting field is empty or generic, generate CTAs for a broad "offer or content" and note in platformTip: "No specific offering provided — CTAs are intentionally broad. Add what you're promoting for hyper-specific results."`,
      brandData
    );

    const data = await callGrokAPI([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate 5 CTAs for someone promoting: "${promoting}"
Goal: ${goalLabels[goalType] || goalType}
Platform: ${platformData?.name || platform}

Platform CTA style: ${ctaGuidelines.style}
Platform examples: ${ctaGuidelines.examples.join(', ')}

Generate exactly 5 CTAs, one for each style below. Return ONLY a JSON object:
{
  "ctas": [
    { "style": "Direct", "cta": "straightforward ask CTA text here", "tip": "why this style works on ${platformData?.name || platform}" },
    { "style": "Soft", "cta": "low-pressure CTA text here", "tip": "why this style works" },
    { "style": "Urgency", "cta": "time-sensitive CTA text here", "tip": "why this style works" },
    { "style": "Question", "cta": "engagement-first question CTA here", "tip": "why this style works" },
    { "style": "Story", "cta": "narrative hook CTA here", "tip": "why this style works" }
  ],
  "platformTip": "which CTA style tends to perform best on ${platformData?.name || platform} and why"
}

IMPORTANT: Each CTA should be specific to "${promoting}" — not generic. Use platform conventions for ${platformData?.name || platform}.`
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
        { style: 'Direct', cta: `Get started with ${promoting} — link in bio`, tip: 'Clear and action-oriented' },
        { style: 'Soft', cta: `Save this for later`, tip: 'Low pressure drives saves' },
        { style: 'Urgency', cta: `Limited time — DM to reserve your spot`, tip: 'Scarcity creates urgency' },
        { style: 'Question', cta: `Would you try this? Let me know below`, tip: 'Questions boost comments' },
        { style: 'Story', cta: `This changed everything for me. Here's how...`, tip: 'Stories create connection' }
      ],
      platformTip: `On ${platformData?.name || platform}, questions and soft CTAs drive the most engagement.`,
      usage: data.usage
    };
  } catch (error) {
    console.error('Grok API Error:', error);
    return {
      success: true,
      ctas: [
        { style: 'Direct', cta: `Ready for ${promoting}? Link in bio`, tip: 'Straightforward works on most platforms' },
        { style: 'Soft', cta: `Save this for when you need it`, tip: 'Soft CTAs boost saves' },
        { style: 'Urgency', cta: `Don't miss out — DM me "START" now`, tip: 'Urgency drives immediate action' },
        { style: 'Question', cta: `Would you try ${promoting}? Drop a comment`, tip: 'Questions drive engagement' },
        { style: 'Story', cta: `I used to struggle with this. Then I found ${promoting}...`, tip: 'Stories build trust' }
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

Niche: ${niche.toLowerCase()}
Target audience: ${audience.toLowerCase()}

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
      `You are Hashtag Strategist — a platform growth specialist who treats hashtag selection as algorithmic science, not guesswork. You understand the difference between reach potential and competition density, and you build stacks designed to get content discovered by high-intent, relevant audiences.

THE 4 TIERS YOU ALWAYS MIX:
- Mega (1M+ posts): Brand context, low chance of standing out
- Mid (100K–1M): Sweet spot — discovery meets competition balance
- Micro (10K–100K): High engagement rate, niche-relevant community
- Nano (<10K): Targeted early-adopter community, low competition

CHAIN-OF-THOUGHT (apply before generating):
1. What is the core topic, niche, and viewer intent for this content?
2. What would the ideal audience member type into the search bar?
3. What community or movement hashtags does this niche actively use?
4. What platform conventions apply (e.g., LinkedIn uses few; TikTok differs)?
5. Does the final mix include representation from all 4 tiers?

OUTPUT FORMAT — Return ONLY a valid JSON array of objects:
[
  {
    "tag": "#ExactTag",
    "tier": "mid",
    "estimatedPosts": "450K",
    "score": 87,
    "reason": "Why this tag works for this specific content and audience"
  }
]

QUALITY GATES:
- Return exactly the number of hashtags requested, no more, no less
- Score each tag 0–100 for engagement potential for THIS content specifically
- Never invent tags — only suggest hashtags that plausibly exist on this platform
- Do not include the brand name unless the user's profile specifies it
- Avoid generic filler tags (#love, #instagood, #photooftheday) unless platform conventions strongly call for them

VAGUE INPUT FALLBACK: If input is a single word or clearly generic, generate hashtags for a broad content category and add a "note" field as the first element: { "note": "Broad topic detected — add context (niche, angle, format) for a more targeted stack" }.`,
      brandData
    );

    const data = await callGrokAPI([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Generate exactly ${hashtagCount} optimized hashtags for: "${input}"

PLATFORM: ${platformData?.name || 'Social Media'}
Recommended hashtag count: ${hashtagGuidelines.count}
Hashtag style for this platform: ${hashtagGuidelines.style}
Platform tip: ${hashtagGuidelines.tip}

Niche: ${niche.toLowerCase()}
Brand voice: ${brandVoice}
Target audience: ${audience.toLowerCase()}

Return ONLY a valid JSON array of exactly ${hashtagCount} objects, ranked by engagement potential:
[
  {
    "tag": "#ExactHashtag",
    "tier": "mega|mid|micro|nano",
    "estimatedPosts": "2.4M",
    "score": 84,
    "reason": "Why this tag reaches the right audience for this content on ${platformData?.name || 'this platform'}"
  }
]

Ensure the mix spans all 4 tiers (mega, mid, micro, nano) and every tag is directly relevant to "${input}". Do not include markdown, explanation text, or anything outside the JSON array.`
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
      const systemPrompt = buildSystemPrompt(
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
      const systemPrompt = buildSystemPrompt(
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
