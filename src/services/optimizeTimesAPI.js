/**
 * Optimize Times API Service
 * 
 * AI-powered posting time optimization that analyzes user's brand context,
 * target audience, and industry to recommend optimal posting times.
 * Falls back to platform-specific best practices if AI fails.
 */

import { buildBrandContext, getNiche, getTargetAudience } from '../utils/brandContextBuilder';
import { supabase } from '../config/supabase';

// SECURITY: Use server-side proxy instead of exposing API key in client
const GROK_PROXY_URL = '/api/ai/grok';

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (e) { /* ignore */ }
  return headers;
}

/**
 * Platform-specific best posting times (fallback data)
 * Based on industry research from Sprout Social, Hootsuite, Later
 */
export const PLATFORM_BEST_TIMES = {
  Instagram: {
    bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
    bestTimes: [
      { time: '11:00', label: 'Late Morning', score: 95 },
      { time: '13:00', label: 'Lunch Break', score: 90 },
      { time: '19:00', label: 'Evening', score: 88 },
      { time: '09:00', label: 'Morning Commute', score: 82 }
    ],
    tip: 'Reels perform best between 9 AM - 12 PM'
  },
  TikTok: {
    bestDays: ['Tuesday', 'Thursday', 'Friday'],
    bestTimes: [
      { time: '19:00', label: 'Prime Time', score: 98 },
      { time: '21:00', label: 'Late Evening', score: 95 },
      { time: '12:00', label: 'Lunch Break', score: 85 },
      { time: '15:00', label: 'Afternoon', score: 80 }
    ],
    tip: 'Trending sounds peak on weekday evenings'
  },
  'X (Twitter)': {
    bestDays: ['Wednesday', 'Thursday'],
    bestTimes: [
      { time: '09:00', label: 'Morning', score: 92 },
      { time: '12:00', label: 'Noon', score: 90 },
      { time: '17:00', label: 'End of Work', score: 85 },
      { time: '08:00', label: 'Early Morning', score: 78 }
    ],
    tip: 'News and trending topics peak mid-morning'
  },
  Facebook: {
    bestDays: ['Wednesday', 'Thursday', 'Friday'],
    bestTimes: [
      { time: '13:00', label: 'Afternoon', score: 94 },
      { time: '11:00', label: 'Late Morning', score: 90 },
      { time: '15:00', label: 'Mid-Afternoon', score: 85 },
      { time: '09:00', label: 'Morning', score: 80 }
    ],
    tip: 'Video content performs best on weekday afternoons'
  },
  YouTube: {
    bestDays: ['Thursday', 'Friday', 'Saturday'],
    bestTimes: [
      { time: '14:00', label: 'Early Afternoon', score: 95 },
      { time: '16:00', label: 'Late Afternoon', score: 92 },
      { time: '12:00', label: 'Noon', score: 88 },
      { time: '21:00', label: 'Evening', score: 85 }
    ],
    tip: 'Publish 2-3 hours before peak viewing time'
  }
};

/**
 * Industry-specific audience timing patterns
 */
const INDUSTRY_TIMING = {
  'fitness': { peakHours: ['06:00', '07:00', '17:00', '18:00'], audienceType: 'early risers and after-work' },
  'health': { peakHours: ['07:00', '08:00', '12:00', '19:00'], audienceType: 'health-conscious morning and evening' },
  'fashion': { peakHours: ['10:00', '12:00', '19:00', '21:00'], audienceType: 'style-conscious, browse during breaks' },
  'food': { peakHours: ['11:00', '12:00', '17:00', '19:00'], audienceType: 'meal planners, hungry browsers' },
  'tech': { peakHours: ['09:00', '12:00', '15:00', '20:00'], audienceType: 'professionals, early adopters' },
  'business': { peakHours: ['08:00', '12:00', '17:00'], audienceType: 'B2B professionals during work hours' },
  'education': { peakHours: ['09:00', '14:00', '19:00', '21:00'], audienceType: 'students and lifelong learners' },
  'entertainment': { peakHours: ['12:00', '18:00', '20:00', '22:00'], audienceType: 'leisure time browsers' },
  'travel': { peakHours: ['10:00', '13:00', '20:00', '21:00'], audienceType: 'dreamers and planners' },
  'beauty': { peakHours: ['09:00', '12:00', '19:00', '21:00'], audienceType: 'routine-oriented, evening browsers' },
  'default': { peakHours: ['09:00', '12:00', '17:00', '19:00'], audienceType: 'general audience' }
};

/**
 * Generate AI-powered optimal posting times for selected posts
 * @param {Object} brandData - User's brand data from BrandContext
 * @param {Array} posts - Array of posts to optimize
 * @returns {Promise<Object>} Optimization results with recommendations
 */
export async function generateOptimalTimes(brandData, posts) {
  if (!posts || posts.length === 0) {
    return {
      success: false,
      error: 'No posts provided for optimization'
    };
  }

  // Extract unique platforms from posts
  const platforms = [...new Set(posts.flatMap(p => p.platforms || []))];
  
  // Get brand context
  const niche = getNiche(brandData, 'general');
  const audience = getTargetAudience(brandData, 'general audience');
  const brandContext = buildBrandContext(brandData);

  try {
    // Try AI-powered optimization first
    const aiResult = await fetchAIOptimization(brandData, posts, platforms);
    
    if (aiResult.success) {
      return {
        success: true,
        recommendations: aiResult.recommendations,
        reasoning: aiResult.reasoning,
        source: 'ai'
      };
    }
  } catch (error) {
    console.error('AI optimization failed, falling back to rule-based:', error);
  }

  // Fallback to rule-based optimization
  const fallbackResult = generateFallbackOptimization(posts, brandData);
  
  return {
    success: true,
    recommendations: fallbackResult.recommendations,
    reasoning: fallbackResult.reasoning,
    source: 'fallback'
  };
}

/**
 * Fetch AI-powered optimization from Grok API
 */
async function fetchAIOptimization(brandData, posts, platforms) {
  const niche = getNiche(brandData, 'general');
  const audience = getTargetAudience(brandData, 'general audience');
  const industry = brandData?.industry || 'general';

  // Build post summary for AI
  const postSummary = posts.map(p => ({
    id: p.id,
    title: p.title,
    platforms: p.platforms,
    contentType: p.type,
    currentTime: p.time,
    currentDate: p.date
  }));

  const systemPrompt = `You are a social media timing strategist. Analyze the user's brand profile and recommend optimal posting times based on their specific audience, industry, and platform preferences.

You must return a valid JSON response with this exact structure:
{
  "recommendations": [
    {
      "postId": "string",
      "originalTime": "HH:MM",
      "optimizedTime": "HH:MM",
      "platform": "string",
      "confidence": 0-100,
      "reason": "brief explanation"
    }
  ],
  "reasoning": "overall strategy explanation"
}`;

  const userPrompt = `Analyze and optimize posting times for this brand:

BRAND PROFILE:
- Niche: ${niche}
- Industry: ${industry}
- Target Audience: ${audience}
- Preferred Platforms: ${platforms.join(', ')}

POSTS TO OPTIMIZE (${posts.length} posts):
${JSON.stringify(postSummary, null, 2)}

REQUIREMENTS:
1. Keep posts on their scheduled DATE - only change the TIME
2. Recommend times when the target audience is most active
3. Consider industry-specific patterns (e.g., fitness = early morning/evening)
4. Avoid clustering multiple posts at the same time
5. Use 24-hour format for times (e.g., "09:00", "14:30", "19:00")
6. Provide a brief reason for each time change

Return ONLY valid JSON matching the structure specified.`;

  const headers = await getAuthHeaders();
  
  const response = await fetch(GROK_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content || '';

  // Parse JSON from response
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        recommendations: parsed.recommendations || [],
        reasoning: parsed.reasoning || 'AI-optimized based on your brand profile'
      };
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
  }

  throw new Error('Failed to parse AI optimization response');
}

/**
 * Generate fallback optimization using rule-based logic
 * @param {Array} posts - Posts to optimize
 * @param {Object} brandData - Brand data
 * @returns {Object} Fallback recommendations
 */
function generateFallbackOptimization(posts, brandData) {
  const industry = brandData?.industry?.toLowerCase() || 'default';
  const industryTiming = INDUSTRY_TIMING[industry] || INDUSTRY_TIMING.default;
  
  const recommendations = posts.map((post, index) => {
    // Get primary platform for this post
    const platform = post.platforms?.[0] || 'Instagram';
    const platformData = PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.Instagram;
    
    // Get best time for this platform, distributed across posts
    const timeIndex = index % platformData.bestTimes.length;
    const bestTime = platformData.bestTimes[timeIndex];
    
    // Check if current time is already optimal
    const isAlreadyOptimal = post.time === bestTime.time;
    
    return {
      postId: post.id,
      originalTime: post.time,
      optimizedTime: isAlreadyOptimal ? post.time : bestTime.time,
      platform: platform,
      confidence: isAlreadyOptimal ? 100 : bestTime.score,
      reason: isAlreadyOptimal 
        ? 'Already scheduled at optimal time' 
        : `${bestTime.label} is peak engagement for ${platform}`
    };
  });

  return {
    recommendations,
    reasoning: `Optimized based on ${industryTiming.audienceType} patterns and platform best practices. ${PLATFORM_BEST_TIMES[posts[0]?.platforms?.[0]]?.tip || ''}`
  };
}

/**
 * Get optimal time for a specific platform and content type
 * @param {string} platform - Platform name
 * @param {string} contentType - Content type (reel, story, post, video)
 * @param {Object} brandData - Brand data for industry context
 * @returns {Object} Optimal time recommendation
 */
export function getOptimalTimeForPlatform(platform, contentType = 'post', brandData = null) {
  const platformData = PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.Instagram;
  const industry = brandData?.industry?.toLowerCase() || 'default';
  const industryTiming = INDUSTRY_TIMING[industry] || INDUSTRY_TIMING.default;
  
  // Get base best time
  let bestTime = platformData.bestTimes[0];
  
  // Adjust based on content type
  const contentAdjustments = {
    'reel': -1, // Reels perform better slightly earlier
    'story': 2, // Stories work better later
    'video': 0,
    'post': 0,
    'carousel': 1
  };
  
  const adjustment = contentAdjustments[contentType?.toLowerCase()] || 0;
  
  if (adjustment !== 0) {
    const [hours, minutes] = bestTime.time.split(':').map(Number);
    const adjustedHours = Math.max(6, Math.min(22, hours + adjustment));
    bestTime = {
      ...bestTime,
      time: `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    };
  }
  
  return {
    time: bestTime.time,
    label: bestTime.label,
    score: bestTime.score,
    tip: platformData.tip,
    bestDays: platformData.bestDays
  };
}

/**
 * Check if a time is within optimal range for a platform
 * @param {string} time - Time in HH:MM format
 * @param {string} platform - Platform name
 * @returns {Object} Optimization status
 */
export function checkTimeOptimality(time, platform) {
  const platformData = PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.Instagram;
  const bestTimes = platformData.bestTimes.map(t => t.time);
  
  const isOptimal = bestTimes.includes(time);
  const closestOptimal = findClosestOptimalTime(time, bestTimes);
  
  return {
    isOptimal,
    currentTime: time,
    suggestedTime: isOptimal ? time : closestOptimal,
    platform,
    tip: platformData.tip
  };
}

/**
 * Find the closest optimal time to a given time
 */
function findClosestOptimalTime(time, optimalTimes) {
  const [hours, minutes] = time.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;
  
  let closest = optimalTimes[0];
  let minDiff = Infinity;
  
  for (const optTime of optimalTimes) {
    const [optHours, optMinutes] = optTime.split(':').map(Number);
    const optTotalMinutes = optHours * 60 + optMinutes;
    const diff = Math.abs(currentMinutes - optTotalMinutes);
    
    if (diff < minDiff) {
      minDiff = diff;
      closest = optTime;
    }
  }
  
  return closest;
}

/**
 * Distribute multiple posts across optimal time slots to avoid clustering
 * @param {Array} posts - Posts scheduled for same day
 * @param {string} platform - Target platform
 * @returns {Array} Posts with distributed times
 */
export function distributePostTimes(posts, platform) {
  const platformData = PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.Instagram;
  const availableTimes = platformData.bestTimes.map(t => t.time);
  
  return posts.map((post, index) => {
    const timeIndex = index % availableTimes.length;
    return {
      ...post,
      optimizedTime: availableTimes[timeIndex],
      timeSlot: platformData.bestTimes[timeIndex]
    };
  });
}









