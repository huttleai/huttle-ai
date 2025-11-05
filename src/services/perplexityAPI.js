/**
 * Perplexity API Service
 * 
 * Used for:
 * - Real-time trend scans and benchmarks
 * - Semantic trend pulls and keyword analysis
 * - Competitor analysis and market research
 * - Forward-looking queries for trend forecasting
 */

const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || '';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export async function scanTrendingTopics(niche, platform = 'all') {
  try {
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
            content: 'You are a trend analysis expert. Provide real-time, data-backed trend insights with metrics.'
          },
          {
            role: 'user',
            content: `What are the top 10 trending topics in ${niche} ${platform !== 'all' ? `on ${platform}` : 'across social media platforms'} right now? Include engagement metrics and velocity indicators.`
          }
        ],
        temperature: 0.2,
      })
    });

    const data = await response.json();
    return {
      success: true,
      trends: data.choices?.[0]?.message?.content || '',
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

export async function getKeywordsOfTheDay(niche) {
  try {
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
            content: 'You are a keyword research specialist. Provide actionable, high-engagement keywords.'
          },
          {
            role: 'user',
            content: `What are 5-7 high-engagement keywords and hashtags trending today in the ${niche} industry? Include estimated virality scores and usage tips.`
          }
        ],
        temperature: 0.2,
      })
    });

    const data = await response.json();
    return {
      success: true,
      keywords: data.choices?.[0]?.message?.content || '',
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

export async function analyzeCompetitors(niche, competitorNames = []) {
  try {
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
            content: 'You are a competitive intelligence analyst. Provide actionable insights from competitor analysis.'
          },
          {
            role: 'user',
            content: `Analyze content strategies of top performers in ${niche} ${competitorNames.length ? `including ${competitorNames.join(', ')}` : ''}. What content formats, topics, and engagement tactics are they using successfully?`
          }
        ],
        temperature: 0.2,
      })
    });

    const data = await response.json();
    return {
      success: true,
      analysis: data.choices?.[0]?.message?.content || '',
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

export async function forecastTrends(niche, timeframe = '7 days') {
  try {
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
            content: 'You are a trend forecasting expert. Use current data to predict future trends.'
          },
          {
            role: 'user',
            content: `Based on current data, what trends are likely to emerge in ${niche} over the next ${timeframe}? Include confidence levels and timing predictions.`
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

export async function getAudienceInsights(niche, demographics) {
  try {
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
            content: 'You are an audience research specialist. Provide deep insights into audience behavior and preferences.'
          },
          {
            role: 'user',
            content: `What are the key preferences, behaviors, and content consumption patterns for ${demographics} in the ${niche} space? Include platform preferences and engagement times.`
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

export async function getTrendingHashtags(keyword, niche) {
  try {
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
            content: 'You are a social media hashtag expert. Provide trending, high-engagement hashtags with metrics.'
          },
          {
            role: 'user',
            content: `Suggest trending hashtags for "${keyword}" in ${niche} right now, including engagement scores and estimated post counts. Focus on hashtags that have good reach but aren't oversaturated.`
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

export async function getCaptionExamples(topic, niche) {
  try {
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
            content: 'You are a content style analyst. Provide examples of popular caption styles and formats.'
          },
          {
            role: 'user',
            content: `What caption styles are currently popular for ${topic} content in the ${niche} niche? Include examples of high-engagement captions and their common patterns.`
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

export async function getBestCTAPractices(platform, goal) {
  try {
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
            content: 'You are a conversion optimization expert. Provide current best practices for CTAs.'
          },
          {
            role: 'user',
            content: `What are the most effective call-to-action formats for ${goal} on ${platform} in 2025? Include specific examples and engagement metrics.`
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
            content: 'You are a social media platform updates expert. You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON array. Each update must be a JSON object with these exact fields: platform (string), date (string in format "Month YYYY"), title (string), description (string), impact (string: "high", "medium", or "low"), keyTakeaways (array of strings), actionItems (array of strings), affectedUsers (string), timeline (string), link (string URL). ONLY include updates from: Facebook, Instagram, TikTok, X (also known as Twitter), LinkedIn, and YouTube. DO NOT include updates from Threads, Snapchat, or any other platforms.'
          },
          {
            role: 'user',
            content: `Provide the latest social media platform updates from the past ${months} months (from ${currentMonth} ${currentYear} going back to ${months} months ago). ONLY include updates from these platforms: Facebook, Instagram, TikTok, X (Twitter), LinkedIn, and YouTube. EXCLUDE Threads and Snapchat completely. Return ONLY a valid JSON array, starting with [ and ending with ]. Each update object must have: platform (must be one of: Facebook, Instagram, TikTok, X, LinkedIn, YouTube), date (format "Month YYYY"), title, description, impact ("high"/"medium"/"low"), keyTakeaways (array), actionItems (array), affectedUsers, timeline, link. Sort by date descending (most recent first).`
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
        const platformMatches = content.match(/(Instagram|Facebook|TikTok|Twitter|X|LinkedIn|YouTube)/gi);
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

