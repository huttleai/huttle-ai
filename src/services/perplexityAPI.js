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

import { buildBrandContext, getNiche, getTargetAudience, getBrandVoice } from '../utils/brandContextBuilder';
import { supabase } from '../config/supabase';

// SECURITY: Use server-side proxy instead of exposing API key in client
const PERPLEXITY_PROXY_URL = '/api/ai/perplexity';

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
async function callPerplexityAPI(messages, temperature = 0.2) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(PERPLEXITY_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      temperature,
      model: 'sonar'
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Scan trending topics in a niche
 * @param {Object} brandData - Brand data from BrandContext
 * @param {string} platform - Platform to scan (default: 'all')
 * @returns {Promise<Object>} Trending topics
 */
export async function scanTrendingTopics(brandData, platform = 'all') {
  try {
    const niche = getNiche(brandData);
    const audience = getTargetAudience(brandData);
    const brandContext = buildBrandContext(brandData);

    const data = await callPerplexityAPI([
      {
        role: 'system',
        content: 'You are a trend analysis expert. Provide real-time, data-backed trend insights with metrics. Prioritize trends that would resonate with the specified brand and audience.'
      },
      {
        role: 'user',
        content: `What are the top 10 trending topics in ${niche} ${platform !== 'all' ? `on ${platform}` : 'across social media platforms'} right now?

Target Audience: ${audience}

Brand Context:
${brandContext}

Include:
- Engagement metrics and velocity indicators
- Relevance score for the target audience
- Suggested content angles that match the brand voice

Prioritize trends that align with the brand profile.`
      }
    ], 0.2);

    return {
      success: true,
      trends: data.content || '',
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

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
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
        ],
        temperature: 0.3,
      })
    });

    const data = await response.json();
    return {
      success: true,
      forecast: data.choices?.[0]?.message?.content || '',
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
export async function getAudienceInsights(brandData, demographics = null) {
  try {
    const niche = getNiche(brandData);
    const audience = demographics || getTargetAudience(brandData);
    const brandContext = buildBrandContext(brandData);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are an audience research specialist. Provide deep insights into audience behavior and preferences that help brands connect authentically.'
          },
          {
            role: 'user',
            content: `What are the key preferences, behaviors, and content consumption patterns for ${audience} in the ${niche} space?

Brand Profile:
${brandContext}

Include:
- Platform preferences and engagement times
- Content format preferences
- Pain points and aspirations
- Language and tone that resonates
- Topics they actively seek out
- How to build trust with this audience`
          }
        ],
        temperature: 0.2,
      })
    });

    const data = await response.json();
    return {
      success: true,
      insights: data.choices?.[0]?.message?.content || '',
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
 * Get trending hashtags for a keyword
 * @param {string} keyword - Keyword to find hashtags for
 * @param {Object} brandData - Brand data from BrandContext
 * @returns {Promise<Object>} Trending hashtags
 */
export async function getTrendingHashtags(keyword, brandData) {
  try {
    const niche = getNiche(brandData);
    const audience = getTargetAudience(brandData);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
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
        ],
        temperature: 0.2,
      })
    });

    const data = await response.json();
    return {
      success: true,
      hashtags: data.choices?.[0]?.message?.content || '',
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

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
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
        ],
        temperature: 0.3,
      })
    });

    const data = await response.json();
    return {
      success: true,
      examples: data.choices?.[0]?.message?.content || '',
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

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
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
        ],
        temperature: 0.2,
      })
    });

    const data = await response.json();
    return {
      success: true,
      practices: data.choices?.[0]?.message?.content || '',
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
    
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a social media platform updates expert. You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON array. Each update must be a JSON object with these exact fields: platform (string), date (string in format "Month YYYY"), title (string), description (string), impact (string: "high", "medium", or "low"), keyTakeaways (array of strings), actionItems (array of strings), affectedUsers (string), timeline (string), link (string URL). ONLY include updates from: Facebook, Instagram, TikTok, X (also known as Twitter), and YouTube. DO NOT include updates from LinkedIn, Threads, Snapchat, or any other platforms.'
          },
          {
            role: 'user',
            content: `Provide the latest social media platform updates from the past ${months} months (from ${currentMonth} ${currentYear} going back to ${months} months ago). ONLY include updates from these platforms: Facebook, Instagram, TikTok, X (Twitter), and YouTube. EXCLUDE LinkedIn, Threads and Snapchat completely. Return ONLY a valid JSON array, starting with [ and ending with ]. Each update object must have: platform (must be one of: Facebook, Instagram, TikTok, X, YouTube), date (format "Month YYYY"), title, description, impact ("high"/"medium"/"low"), keyTakeaways (array), actionItems (array), affectedUsers, timeline, link. Sort by date descending (most recent first).`
          }
        ],
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error response:', response.status, errorText);
      return {
        success: false,
        error: `API returned ${response.status}: ${errorText}`,
        updates: []
      };
    }

    const data = await response.json();
    
    // Check if we got a valid response structure
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid API response structure:', data);
      return {
        success: false,
        error: 'Invalid API response structure',
        updates: []
      };
    }
    
    const content = data.choices[0]?.message?.content || '';
    
    if (!content || content.trim().length === 0) {
      console.warn('Perplexity API returned empty content. Full response:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: 'API returned empty content',
        updates: []
      };
    }
    
    // Try to parse JSON from the response
    let updates = [];
    try {
      // First, try to extract JSON from markdown code blocks
      const jsonBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonBlockMatch) {
        updates = JSON.parse(jsonBlockMatch[1]);
      } else {
        // Try to find JSON array in the content
        const jsonArrayMatch = content.match(/(\[[\s\S]*\])/);
        if (jsonArrayMatch) {
          updates = JSON.parse(jsonArrayMatch[1]);
        } else {
          // Try parsing the entire content as JSON
          updates = JSON.parse(content.trim());
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
      } catch (e) {
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
