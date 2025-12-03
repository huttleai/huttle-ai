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
 */

import { buildSystemPrompt, getBrandVoice, getNiche, getTargetAudience, buildBrandContext } from '../utils/brandContextBuilder';

const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY || '';
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

export async function generateTrendIdeas(brandData, trendTopic) {
  try {
    const systemPrompt = buildSystemPrompt(
      'You are an expert content creator assistant. Generate creative, engaging content ideas that resonate with the target audience.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
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
        ],
        temperature: 0.8,
      })
    });

    const data = await response.json();
    return {
      success: true,
      ideas: data.choices?.[0]?.message?.content || '',
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

export async function generateCaption(contentData, brandData) {
  try {
    const systemPrompt = buildSystemPrompt(
      'You are a professional social media content writer. Create compelling, engaging captions that drive engagement.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Write a compelling social media caption about: "${contentData.topic}". 

Platform: ${contentData.platform}

Requirements:
- Match the brand voice exactly
- Appeal to the target audience
- Include relevant hashtags
- Add a clear call-to-action
- Keep it authentic and engaging`
          }
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    return {
      success: true,
      caption: data.choices?.[0]?.message?.content || '',
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

export async function scoreContentQuality(content, brandData = null) {
  try {
    const brandContext = brandData ? buildBrandContext(brandData) : '';
    const brandSection = brandContext ? `\n\nBrand Profile to evaluate against:\n${brandContext}` : '';

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
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
        ],
        temperature: 0.3,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API Error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid API response format');
    }
    
    return {
      success: true,
      analysis: data.choices[0].message?.content || '',
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

export async function generateContentPlan(goals, brandData, days = 7) {
  try {
    const systemPrompt = buildSystemPrompt(
      'You are an AI content strategist. Create detailed, actionable content calendars that align with brand goals.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
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
        ],
        temperature: 0.6,
      })
    });

    const data = await response.json();
    return {
      success: true,
      plan: data.choices?.[0]?.message?.content || '',
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

export async function generateHooks(input, brandData, theme = 'question') {
  try {
    const niche = getNiche(brandData);
    const brandVoice = getBrandVoice(brandData);
    const audience = getTargetAudience(brandData);

    const systemPrompt = buildSystemPrompt(
      'You are a content hook expert. Create attention-grabbing opening lines that stop the scroll.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Build 4 short hooks (under 15 words each) for: "${input}"

Hook style: ${theme}
Niche: ${niche}
Target audience: ${audience}

Each hook must:
- Match the ${brandVoice} brand voice
- Stop the scroll immediately
- Create curiosity or urgency
- Feel authentic to the brand

Number them 1-4.`
          }
        ],
        temperature: 0.8,
      })
    });

    const data = await response.json();
    return {
      success: true,
      hooks: data.choices?.[0]?.message?.content || '',
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

export async function generateCTAs(goal, brandData, platform = 'general') {
  try {
    const niche = getNiche(brandData);
    const brandVoice = getBrandVoice(brandData);
    const audience = getTargetAudience(brandData);

    const systemPrompt = buildSystemPrompt(
      'You are a call-to-action specialist. Create compelling, action-oriented CTAs that drive conversions.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Suggest 5 urgent CTAs for goal: "${goal}"

Platform: ${platform}
Niche: ${niche}
Target audience: ${audience}

Examples: "DM for tips", "Save this", "Link in bio", etc.

Each CTA must:
- Match the ${brandVoice} brand voice
- Create urgency or desire
- Be appropriate for ${platform}
- Feel natural, not pushy

Number them 1-5.`
          }
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    return {
      success: true,
      ctas: data.choices?.[0]?.message?.content || '',
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

export async function generateHashtags(input, brandData) {
  try {
    const niche = getNiche(brandData);
    const brandVoice = getBrandVoice(brandData);
    const audience = getTargetAudience(brandData);

    const systemPrompt = buildSystemPrompt(
      'You are a hashtag expert. Generate relevant, high-engagement hashtags that boost discoverability.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Suggest 10 trending hashtags for: "${input}"

Niche: ${niche}
Target audience: ${audience}

Requirements:
- Mix of popular and niche-specific hashtags
- Fit the ${brandVoice} brand voice
- Boost discoverability for the target audience
- Include a mix of reach sizes (high, medium, low competition)

Rank them by engagement potential with brief explanations.`
          }
        ],
        temperature: 0.5,
      })
    });

    const data = await response.json();
    return {
      success: true,
      hashtags: data.choices?.[0]?.message?.content || '',
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

export async function improveContent(content, suggestions, brandData) {
  try {
    const niche = getNiche(brandData);
    const systemPrompt = buildSystemPrompt(
      `You are a content improvement specialist for ${niche}. Enhance content while maintaining brand voice.`,
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
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
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    return {
      success: true,
      improvedContent: data.choices?.[0]?.message?.content || '',
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

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
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
        ],
        temperature: 0.6,
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
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
  try {
    const systemPrompt = buildSystemPrompt(
      'You are an expert social media copywriter. Create engaging caption variations that test different hooks, tones, and CTAs while maintaining the core message.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
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
        ],
        temperature: 0.8,
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
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
    return {
      success: false,
      error: error.message,
      variations: []
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
export async function generatePlatformRemixes(content, brandData, platforms = ['Instagram', 'TikTok', 'X', 'Facebook', 'YouTube']) {
  try {
    const systemPrompt = buildSystemPrompt(
      'You are an expert cross-platform social media strategist. Adapt content for each platform while maintaining brand voice and maximizing engagement.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Adapt this content for each platform with platform-specific optimizations:

Original Content: "${content}"

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
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    const content_response = data.choices?.[0]?.message?.content || '';
    
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
          caption: captionMatch ? captionMatch[1].trim() : content,
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
 * @returns {Promise<Object>} Generated visual ideas
 */
export async function generateVisualIdeas(prompt, brandData) {
  try {
    const systemPrompt = buildSystemPrompt(
      'You are a visual content strategist. Create compelling image and video concepts that align with brand identity.',
      brandData
    );

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Generate 4 visual content ideas for: "${prompt}"

For each idea, include:
- Visual concept description
- Color palette suggestions
- Composition tips
- Platform optimization notes
- Text overlay suggestions (if applicable)

Make sure all visuals align with the brand identity and appeal to the target audience.

Number them 1-4.`
          }
        ],
        temperature: 0.8,
      })
    });

    const data = await response.json();
    return {
      success: true,
      ideas: data.choices?.[0]?.message?.content || '',
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
