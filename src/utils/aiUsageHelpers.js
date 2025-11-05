/**
 * AI Usage Reset Helpers
 * Handles subscription-based AI usage reset logic
 */

/**
 * Calculate if AI usage should be reset based on subscription start date
 * @param {string} subscriptionStartDate - ISO date string of when user subscribed
 * @param {string} lastResetDate - ISO date string of last usage reset
 * @returns {boolean} - Whether usage should be reset
 */
export const shouldResetAIUsage = (subscriptionStartDate, lastResetDate) => {
  if (!subscriptionStartDate) return false;
  
  const startDate = new Date(subscriptionStartDate);
  const now = new Date();
  const lastReset = lastResetDate ? new Date(lastResetDate) : new Date(0);
  
  const dayOfMonth = startDate.getDate();
  
  // Calculate this month's reset date
  let thisMonthReset = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  
  // Handle months with fewer days (e.g., Feb 28 when subscribed on Jan 31)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (dayOfMonth > lastDayOfMonth) {
    thisMonthReset.setDate(lastDayOfMonth);
  }
  
  // If we've passed this month's reset and haven't reset yet, return true
  if (now >= thisMonthReset && lastReset < thisMonthReset) {
    return true;
  }
  
  return false;
};

/**
 * Get the next reset date based on subscription start date
 * @param {string} subscriptionStartDate - ISO date string of when user subscribed
 * @returns {Date} - Next reset date
 */
export const getNextResetDate = (subscriptionStartDate) => {
  if (!subscriptionStartDate) {
    // Fallback to first of next month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  
  const startDate = new Date(subscriptionStartDate);
  const now = new Date();
  const dayOfMonth = startDate.getDate();
  
  // Calculate next reset date
  let nextReset = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  
  // If we've passed this month's reset date, move to next month
  if (now.getDate() >= dayOfMonth) {
    nextReset = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  }
  
  // Handle months with fewer days (e.g., Feb when subscribed on Jan 31)
  const lastDayOfMonth = new Date(nextReset.getFullYear(), nextReset.getMonth() + 1, 0).getDate();
  if (dayOfMonth > lastDayOfMonth) {
    nextReset.setDate(lastDayOfMonth);
  }
  
  return nextReset;
};

/**
 * Format the next reset date in a readable format
 * @param {string} subscriptionStartDate - ISO date string of when user subscribed
 * @returns {string} - Formatted date string
 */
export const getFormattedResetDate = (subscriptionStartDate) => {
  const nextReset = getNextResetDate(subscriptionStartDate);
  return nextReset.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

/**
 * Format days until reset in a human-readable way
 * @param {string} subscriptionStartDate - ISO date string of when user subscribed
 * @returns {string} - Formatted string like "in 22 days"
 */
export const getDaysUntilReset = (subscriptionStartDate) => {
  const nextReset = getNextResetDate(subscriptionStartDate);
  const now = new Date();
  const diffTime = nextReset - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return `in ${diffDays} days`;
};

