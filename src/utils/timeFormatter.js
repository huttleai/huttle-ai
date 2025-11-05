/**
 * Converts military time (24-hour) to regular 12-hour format with AM/PM
 * @param {string} time - Time in HH:mm or HH:MM format (e.g., "14:00", "09:30")
 * @returns {string} Time in 12-hour format with AM/PM (e.g., "2:00 PM", "9:30 AM")
 */
export function formatTo12Hour(time) {
  if (!time) return '';
  
  // Handle time strings like "14:00" or "09:30"
  const [hours, minutes] = time.split(':').map(num => parseInt(num, 10));
  
  if (isNaN(hours) || isNaN(minutes)) {
    return time; // Return original if parsing fails
  }
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Converts 12-hour format to military time (24-hour)
 * @param {string} time - Time in 12-hour format (e.g., "2:00 PM", "9:30 AM")
 * @returns {string} Time in 24-hour format (e.g., "14:00", "09:30")
 */
export function formatTo24Hour(time) {
  if (!time) return '';
  
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Generates array of time options in 12-hour format for select dropdowns
 * @returns {Array<{value: string, label: string}>} Array of time options
 */
export function generate12HourTimeOptions() {
  const times = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const militaryTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = formatTo12Hour(militaryTime);
      times.push({
        value: militaryTime,
        label: displayTime
      });
    }
  }
  
  return times;
}

