/**
 * Timezone Helper Utilities
 * Provides timezone-aware date/time formatting and conversion
 */

/**
 * Get user's current timezone
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format date in user's timezone
 * @param {string} isoDate - ISO 8601 date string
 * @param {string} userTimezone - IANA timezone (e.g., 'America/New_York')
 * @param {object} options - Intl.DateTimeFormat options
 */
export function formatInUserTimezone(isoDate, userTimezone, options = {}) {
  if (!isoDate) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat('en-US', {
      ...defaultOptions,
      timeZone: userTimezone,
    }).format(date);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return isoDate;
  }
}

/**
 * Convert local date/time to another timezone
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} time - Time string (HH:MM)
 * @param {string} userTimezone - Target timezone
 * @returns {string} ISO 8601 string
 */
export function convertToUserTimezone(date, time, userTimezone) {
  if (!date || !time) return '';
  
  try {
    const dateTime = `${date}T${time}:00`;
    const localDate = new Date(dateTime);
    
    // Convert to ISO string which includes timezone info
    return localDate.toISOString();
  } catch (error) {
    console.error('Error converting to timezone:', error);
    return `${date}T${time}:00`;
  }
}

/**
 * Get timezone abbreviation (e.g., 'EST', 'PST')
 * @param {string} timezone - IANA timezone
 * @returns {string} Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone) {
  try {
    const date = new Date();
    const parts = date.toLocaleTimeString('en-US', { 
      timeZone: timezone, 
      timeZoneName: 'short' 
    }).split(' ');
    
    // Return the last part which should be the timezone abbreviation
    return parts[parts.length - 1] || timezone;
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return timezone;
  }
}

/**
 * Get timezone offset in hours
 * @param {string} timezone - IANA timezone
 * @returns {string} Offset string (e.g., '+5:30', '-8:00')
 */
export function getTimezoneOffset(timezone) {
  try {
    const date = new Date();
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    const offsetMs = tzDate - utcDate;
    const offsetHours = Math.floor(Math.abs(offsetMs) / (1000 * 60 * 60));
    const offsetMinutes = Math.floor((Math.abs(offsetMs) % (1000 * 60 * 60)) / (1000 * 60));
    
    const sign = offsetMs >= 0 ? '+' : '-';
    const hoursStr = offsetHours.toString().padStart(2, '0');
    const minutesStr = offsetMinutes.toString().padStart(2, '0');
    
    return `${sign}${hoursStr}:${minutesStr}`;
  } catch (error) {
    console.error('Error getting timezone offset:', error);
    return '+00:00';
  }
}

/**
 * Check if a date/time is in the past
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} time - Time string (HH:MM)
 * @returns {boolean}
 */
export function isInPast(date, time) {
  if (!date || !time) return false;
  
  try {
    const scheduledDateTime = new Date(`${date}T${time}:00`);
    return scheduledDateTime < new Date();
  } catch (error) {
    console.error('Error checking if date is in past:', error);
    return false;
  }
}

/**
 * Format relative time (e.g., "in 2 hours", "5 minutes ago")
 * @param {string} isoDate - ISO 8601 date string
 * @returns {string}
 */
export function formatRelativeTime(isoDate) {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = date - now;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMs < 0) {
      // Past
      const absMinutes = Math.abs(diffMinutes);
      const absHours = Math.abs(diffHours);
      const absDays = Math.abs(diffDays);
      
      if (absMinutes < 60) return `${absMinutes} minute${absMinutes !== 1 ? 's' : ''} ago`;
      if (absHours < 24) return `${absHours} hour${absHours !== 1 ? 's' : ''} ago`;
      return `${absDays} day${absDays !== 1 ? 's' : ''} ago`;
    } else {
      // Future
      if (diffMinutes < 60) return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
      if (diffHours < 24) return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
      return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
}

/**
 * Get list of common timezones for dropdown
 * @returns {Array} Array of timezone objects with label and value
 */
export function getCommonTimezones() {
  return [
    { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
    { label: 'Mountain Time (MT)', value: 'America/Denver' },
    { label: 'Central Time (CT)', value: 'America/Chicago' },
    { label: 'Eastern Time (ET)', value: 'America/New_York' },
    { label: 'GMT/UTC', value: 'UTC' },
    { label: 'London (GMT/BST)', value: 'Europe/London' },
    { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
    { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
    { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  ];
}

