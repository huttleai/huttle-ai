/**
 * Grok API Service (xAI Grok 4 Fast)
 * 
 * Used for:
 * - Creative remixes and idea sparks
 * - Narrative insights and content generation
 * - Dynamic suggestions for posts
 * - Qualitative scoring and content quality analysis
 */

const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY || '';
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'; // Update with actual Grok API endpoint

export async function generateTrendIdeas(brandData, trendTopic) {
  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are an expert content creator assistant for ${brandData?.niche || 'content creators'}. Generate creative, engaging content ideas.`
          },
          {
            role: 'user',
            content: `Generate 5 creative content ideas for ${trendTopic} tailored to ${brandData?.targetAudience || 'general audience'}.`
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
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are a ${brandData?.brandVoice || 'professional'} content writer. Write in a ${brandData?.brandVoice || 'engaging and authentic'} tone.`
          },
          {
            role: 'user',
            content: `Write a compelling social media caption about: ${contentData.topic}. Platform: ${contentData.platform}. Include relevant hashtags.`
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

export async function scoreContentQuality(content) {
  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: 'You are a content quality analyzer. Provide scores and specific improvement suggestions.'
          },
          {
            role: 'user',
            content: `Analyze this content and provide a quality score (0-100) with breakdown for: Hook, CTA, Hashtags, and Overall Engagement Potential.\n\nContent: ${content}`
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
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are an AI content strategist specializing in ${brandData?.niche || 'digital marketing'}.`
          },
          {
            role: 'user',
            content: `Create a detailed ${days}-day content calendar to achieve: ${goals}. Consider brand voice: ${brandData?.brandVoice}, target audience: ${brandData?.targetAudience}. Include post types, topics, and optimal posting times.`
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

export async function generateHooks(input, niche, brandVoice, theme = 'question') {
  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are a content hook expert for ${niche}. Create attention-grabbing opening lines.`
          },
          {
            role: 'user',
            content: `Build 4 short hooks under 15 words for: "${input}" in ${niche}, using a ${theme} approach. Match ${brandVoice} brand voice. Number them 1-4.`
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

export async function generateCTAs(goal, niche, brandVoice, platform = 'general') {
  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: 'You are a call-to-action specialist. Create compelling, action-oriented CTAs.'
          },
          {
            role: 'user',
            content: `Suggest 5 urgent CTAs for goal: "${goal}" in ${niche} on ${platform}. Examples like "DM for tips", "Save this", etc. Align with ${brandVoice} brand voice. Number them 1-5.`
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

export async function generateHashtags(input, niche, brandVoice) {
  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: 'You are a hashtag expert. Generate relevant, high-engagement hashtags.'
          },
          {
            role: 'user',
            content: `Suggest 10 trending hashtags for: "${input}" in ${niche} niche. Pick hashtags that fit ${brandVoice} brand voice and boost discoverability. Rank them by engagement potential.`
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

export async function improveContent(content, suggestions, niche) {
  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: `You are a content improvement specialist for ${niche}.`
          },
          {
            role: 'user',
            content: `Improve this content based on these suggestions: ${suggestions.join(', ')}.\n\nOriginal content:\n${content}\n\nProvide an improved version that addresses all suggestions while maintaining the core message.`
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

