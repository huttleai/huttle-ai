/**
 * Optimize Times Helpers
 * 
 * Utility functions for time calculation, distribution, 
 * conflict resolution, and formatting for the Optimize Times feature.
 */

/**
 * Format time from 24-hour to 12-hour format
 * @param {string} time24 - Time in HH:MM format
 * @returns {string} Time in 12-hour format with AM/PM
 */
export function formatTo12Hour(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Format time from 12-hour to 24-hour format
 * @param {string} time12 - Time in 12-hour format (e.g., "2:30 PM")
 * @returns {string} Time in HH:MM format
 */
export function formatTo24Hour(time12) {
  if (!time12) return '';
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;
  
  let [, hours, minutes, period] = match;
  hours = parseInt(hours);
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Calculate time difference in minutes
 * @param {string} time1 - First time in HH:MM format
 * @param {string} time2 - Second time in HH:MM format
 * @returns {number} Difference in minutes (positive if time2 is later)
 */
export function getTimeDifference(time1, time2) {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

/**
 * Check if two times are within a specified range
 * @param {string} time1 - First time in HH:MM format
 * @param {string} time2 - Second time in HH:MM format
 * @param {number} rangeMinutes - Range in minutes
 * @returns {boolean} True if times are within range
 */
export function areTimesWithinRange(time1, time2, rangeMinutes = 60) {
  return Math.abs(getTimeDifference(time1, time2)) <= rangeMinutes;
}

/**
 * Get posts grouped by date
 * @param {Array} posts - Array of posts
 * @returns {Object} Posts grouped by date string
 */
export function groupPostsByDate(posts) {
  return posts.reduce((groups, post) => {
    const date = post.date || 'unscheduled';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(post);
    return groups;
  }, {});
}

/**
 * Get posts grouped by platform
 * @param {Array} posts - Array of posts
 * @returns {Object} Posts grouped by platform
 */
export function groupPostsByPlatform(posts) {
  const groups = {};
  
  posts.forEach(post => {
    const platforms = post.platforms || [];
    platforms.forEach(platform => {
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push(post);
    });
  });
  
  return groups;
}

/**
 * Detect time conflicts (posts scheduled too close together)
 * @param {Array} posts - Array of posts with date and time
 * @param {number} minGapMinutes - Minimum gap between posts (default 60)
 * @returns {Array} Array of conflict objects
 */
export function detectTimeConflicts(posts, minGapMinutes = 60) {
  const conflicts = [];
  const groupedByDate = groupPostsByDate(posts);
  
  Object.entries(groupedByDate).forEach(([date, datePosts]) => {
    // Sort posts by time
    const sorted = [...datePosts].sort((a, b) => {
      const [aH, aM] = (a.time || '00:00').split(':').map(Number);
      const [bH, bM] = (b.time || '00:00').split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });
    
    // Check consecutive posts for conflicts
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gap = getTimeDifference(current.time, next.time);
      
      if (gap < minGapMinutes) {
        conflicts.push({
          date,
          post1: current,
          post2: next,
          gap,
          minGap: minGapMinutes
        });
      }
    }
  });
  
  return conflicts;
}

/**
 * Resolve time conflicts by spacing posts apart
 * @param {Array} posts - Posts with potential conflicts
 * @param {number} minGapMinutes - Minimum gap between posts
 * @returns {Array} Posts with resolved times
 */
export function resolveTimeConflicts(posts, minGapMinutes = 60) {
  const groupedByDate = groupPostsByDate(posts);
  const resolvedPosts = [];
  
  Object.entries(groupedByDate).forEach(([date, datePosts]) => {
    // Sort by time
    const sorted = [...datePosts].sort((a, b) => {
      const [aH, aM] = (a.optimizedTime || a.time || '09:00').split(':').map(Number);
      const [bH, bM] = (b.optimizedTime || b.time || '09:00').split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });
    
    // Space posts apart
    let lastTime = null;
    sorted.forEach((post, index) => {
      let currentTime = post.optimizedTime || post.time || '09:00';
      
      if (lastTime) {
        const gap = getTimeDifference(lastTime, currentTime);
        if (gap < minGapMinutes) {
          // Push this post later
          const [h, m] = lastTime.split(':').map(Number);
          const newMinutes = h * 60 + m + minGapMinutes;
          const newHours = Math.min(22, Math.floor(newMinutes / 60)); // Cap at 10 PM
          const newMins = newMinutes % 60;
          currentTime = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
        }
      }
      
      resolvedPosts.push({
        ...post,
        optimizedTime: currentTime,
        wasAdjusted: currentTime !== (post.optimizedTime || post.time)
      });
      
      lastTime = currentTime;
    });
  });
  
  return resolvedPosts;
}

/**
 * Filter posts to only include future posts
 * @param {Array} posts - Array of posts
 * @returns {Array} Only future posts
 */
export function filterFuturePosts(posts) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return posts.filter(post => {
    if (!post.date) return false;
    const postDate = new Date(post.date);
    postDate.setHours(0, 0, 0, 0);
    return postDate >= today;
  });
}

/**
 * Sort posts by date and time
 * @param {Array} posts - Array of posts
 * @returns {Array} Sorted posts
 */
export function sortPostsByDateTime(posts) {
  return [...posts].sort((a, b) => {
    // First sort by date
    const dateA = new Date(a.date || '9999-12-31');
    const dateB = new Date(b.date || '9999-12-31');
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // Then sort by time
    const [aH, aM] = (a.time || '00:00').split(':').map(Number);
    const [bH, bM] = (b.time || '00:00').split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });
}

/**
 * Calculate optimization score (how much better the new time is)
 * @param {string} originalTime - Original time
 * @param {string} optimizedTime - Optimized time
 * @param {number} confidence - AI confidence score
 * @returns {Object} Score details
 */
export function calculateOptimizationScore(originalTime, optimizedTime, confidence) {
  const isChanged = originalTime !== optimizedTime;
  const timeDiff = Math.abs(getTimeDifference(originalTime, optimizedTime));
  
  let improvement = 'none';
  if (isChanged) {
    if (confidence >= 90) improvement = 'high';
    else if (confidence >= 75) improvement = 'medium';
    else improvement = 'low';
  }
  
  return {
    isChanged,
    improvement,
    confidence,
    timeDiffMinutes: timeDiff,
    label: isChanged 
      ? `${improvement === 'high' ? 'Significant' : improvement === 'medium' ? 'Moderate' : 'Minor'} improvement`
      : 'Already optimal'
  };
}

/**
 * Generate summary of optimization changes
 * @param {Array} recommendations - Optimization recommendations
 * @returns {Object} Summary statistics
 */
export function generateOptimizationSummary(recommendations) {
  const total = recommendations.length;
  const changed = recommendations.filter(r => r.originalTime !== r.optimizedTime).length;
  const unchanged = total - changed;
  const avgConfidence = recommendations.reduce((sum, r) => sum + (r.confidence || 0), 0) / total;
  
  // Group by platform
  const byPlatform = recommendations.reduce((acc, r) => {
    const platform = r.platform || 'Unknown';
    if (!acc[platform]) acc[platform] = { changed: 0, total: 0 };
    acc[platform].total++;
    if (r.originalTime !== r.optimizedTime) acc[platform].changed++;
    return acc;
  }, {});
  
  return {
    total,
    changed,
    unchanged,
    avgConfidence: Math.round(avgConfidence),
    byPlatform,
    hasChanges: changed > 0
  };
}

/**
 * Format date for display
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Get day name from date string
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Day name
 */
export function getDayName(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Check if a date is a weekend
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {boolean} True if weekend
 */
export function isWeekend(dateStr) {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

/**
 * Get confidence color for UI
 * @param {number} confidence - Confidence score 0-100
 * @returns {string} Tailwind color classes
 */
export function getConfidenceColor(confidence) {
  if (confidence >= 90) return 'text-emerald-600 bg-emerald-100';
  if (confidence >= 75) return 'text-amber-600 bg-amber-100';
  if (confidence >= 50) return 'text-orange-600 bg-orange-100';
  return 'text-gray-600 bg-gray-100';
}

/**
 * Get improvement badge color for UI
 * @param {string} improvement - 'high', 'medium', 'low', 'none'
 * @returns {string} Tailwind color classes
 */
export function getImprovementColor(improvement) {
  switch (improvement) {
    case 'high': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'low': return 'text-orange-700 bg-orange-50 border-orange-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}


