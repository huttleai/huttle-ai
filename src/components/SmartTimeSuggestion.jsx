import { useState, useEffect } from 'react';
import { Clock, Sparkles, TrendingUp, ChevronDown, ChevronUp, Check } from 'lucide-react';

/**
 * Platform-specific best posting times based on industry research
 * Data compiled from Sprout Social, Hootsuite, and Later research
 */
const PLATFORM_BEST_TIMES = {
  Instagram: {
    bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
    bestTimes: [
      { time: '11:00', label: 'Late Morning', score: 95 },
      { time: '13:00', label: 'Lunch Break', score: 90 },
      { time: '19:00', label: 'Evening', score: 88 },
      { time: '09:00', label: 'Morning Commute', score: 82 }
    ],
    worstTimes: ['03:00', '04:00', '05:00'],
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
    worstTimes: ['05:00', '06:00', '07:00'],
    tip: 'Trending sounds peak on weekday evenings'
  },
  X: {
    bestDays: ['Wednesday', 'Thursday'],
    bestTimes: [
      { time: '09:00', label: 'Morning', score: 92 },
      { time: '12:00', label: 'Noon', score: 90 },
      { time: '17:00', label: 'End of Work', score: 85 },
      { time: '08:00', label: 'Early Morning', score: 78 }
    ],
    worstTimes: ['22:00', '23:00', '00:00'],
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
    worstTimes: ['01:00', '02:00', '03:00'],
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
    worstTimes: ['04:00', '05:00', '06:00'],
    tip: 'Publish 2-3 hours before peak viewing time'
  }
};

/**
 * Content type specific adjustments
 */
const CONTENT_TYPE_ADJUSTMENTS = {
  'Reel': { timeShift: 0, dayPreference: ['Tuesday', 'Wednesday'] },
  'Story': { timeShift: 2, dayPreference: ['Monday', 'Tuesday', 'Wednesday'] },
  'Carousel': { timeShift: 1, dayPreference: ['Wednesday', 'Thursday'] },
  'Video': { timeShift: -2, dayPreference: ['Thursday', 'Friday'] },
  'Text Post': { timeShift: 0, dayPreference: ['Wednesday'] },
  'Image Post': { timeShift: 1, dayPreference: ['Tuesday', 'Thursday'] }
};

/**
 * SmartTimeSuggestion - AI-powered posting time recommendations
 */
export default function SmartTimeSuggestion({
  platforms = [],
  contentType = '',
  currentTime = '',
  currentDate = '',
  onSelectTime,
  onSelectDate,
  compact = false
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Get suggestions for selected platforms
  const getSuggestions = () => {
    if (platforms.length === 0) return [];

    const suggestions = [];
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    platforms.forEach(platform => {
      const platformData = PLATFORM_BEST_TIMES[platform];
      if (!platformData) return;

      // Get content type adjustment
      const adjustment = CONTENT_TYPE_ADJUSTMENTS[contentType] || { timeShift: 0, dayPreference: [] };

      // Find best times for this platform
      platformData.bestTimes.slice(0, 2).forEach(timeSlot => {
        // Apply content type time shift
        const [hours, minutes] = timeSlot.time.split(':').map(Number);
        const adjustedHours = Math.max(0, Math.min(23, hours + adjustment.timeShift));
        const adjustedTime = `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        // Find next best day
        let bestDate = new Date(today);
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          const dayName = dayNames[checkDate.getDay()];
          
          if (platformData.bestDays.includes(dayName)) {
            bestDate = checkDate;
            break;
          }
        }

        const dateStr = bestDate.toISOString().split('T')[0];
        const dayName = dayNames[bestDate.getDay()];

        suggestions.push({
          platform,
          time: adjustedTime,
          date: dateStr,
          dayName,
          label: timeSlot.label,
          score: timeSlot.score - (adjustment.timeShift !== 0 ? 5 : 0),
          tip: platformData.tip,
          id: `${platform}-${adjustedTime}-${dateStr}`
        });
      });
    });

    // Sort by score and remove duplicates
    return suggestions
      .sort((a, b) => b.score - a.score)
      .filter((s, i, arr) => arr.findIndex(x => x.time === s.time && x.date === s.date) === i)
      .slice(0, 4);
  };

  const suggestions = getSuggestions();

  // Update selected suggestion based on currentTime
  useEffect(() => {
    if (currentTime && suggestions.length > 0) {
      const matchingSuggestion = suggestions.find(s => s.time === currentTime);
      if (matchingSuggestion) {
        setSelectedSuggestion(matchingSuggestion.id);
      } else {
        // If no exact match, check if there's a suggestion for today
        const todaySuggestion = suggestions.find(s => s.date === currentDate);
        if (todaySuggestion) {
          setSelectedSuggestion(todaySuggestion.id);
        }
      }
    }
  }, [currentTime, currentDate, suggestions]);

  const handleSelect = (suggestion) => {
    setSelectedSuggestion(suggestion.id);
    if (onSelectTime) onSelectTime(suggestion.time);
    if (onSelectDate) onSelectDate(suggestion.date);
  };

  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-100';
    if (score >= 80) return 'text-amber-600 bg-amber-100';
    return 'text-orange-600 bg-orange-100';
  };

  if (platforms.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-800">Smart Time Suggestions</span>
          {selectedSuggestion && (
            <Check className="w-4 h-4 text-emerald-500" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 animate-slideDown">
          {/* Suggestions Grid */}
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                data-suggestion-id={suggestion.id}
                onClick={() => handleSelect(suggestion)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedSuggestion === suggestion.id
                    ? 'border-green-500 bg-green-50 shadow-lg shadow-green-200/50 ring-2 ring-green-300 ring-offset-1'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-gray-900">
                    {formatTime(suggestion.time)}
                  </span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreColor(suggestion.score)}`}>
                    {suggestion.score}%
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {formatDate(suggestion.date)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">
                    {suggestion.label}
                  </span>
                </div>
                {suggestion.platform && platforms.length > 1 && (
                  <span className="text-xs text-gray-500 mt-1 block">
                    Best for {suggestion.platform}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tip */}
          {suggestions.length > 0 && suggestions[0].tip && (
            <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-blue-100">
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600">
                <strong>Pro tip:</strong> {suggestions[0].tip}
              </p>
            </div>
          )}

          {/* Platform Info */}
          <div className="text-xs text-gray-500 text-center">
            Based on industry research for {platforms.join(', ')}
            {contentType && ` • ${contentType}`}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact time suggestion chip for inline use
 */
export function TimeSuggestionChip({ platform, onSelect }) {
  const platformData = PLATFORM_BEST_TIMES[platform];
  if (!platformData) return null;

  const bestTime = platformData.bestTimes[0];

  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  return (
    <button
      onClick={() => onSelect(bestTime.time)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
    >
      <Clock className="w-3 h-3" />
      <span>Best: {formatTime(bestTime.time)}</span>
      <span className="text-blue-500">({bestTime.score}%)</span>
    </button>
  );
}

