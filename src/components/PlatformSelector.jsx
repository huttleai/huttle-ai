import { useState } from 'react';
import { 
  Instagram, 
  Music, 
  Twitter, 
  Facebook, 
  Youtube, 
  Linkedin, 
  Image, 
  AtSign,
  ChevronDown,
  Lightbulb
} from 'lucide-react';
import { getPlatform, getPlatformTips } from '../utils/platformGuidelines';

// Icon mapping for platforms
const PLATFORM_ICONS = {
  Instagram: Instagram,
  Music: Music, // TikTok
  Twitter: Twitter,
  Facebook: Facebook,
  Youtube: Youtube,
  Linkedin: Linkedin,
  Image: Image, // Pinterest
  AtSign: AtSign // Threads
};

// Platform list for selection (limited to 5 platforms)
const PLATFORM_LIST = [
  { id: 'instagram', name: 'Instagram', icon: 'Instagram' },
  { id: 'tiktok', name: 'TikTok', icon: 'Music' },
  { id: 'twitter', name: 'X (Twitter)', icon: 'Twitter' },
  { id: 'facebook', name: 'Facebook', icon: 'Facebook' },
  { id: 'youtube', name: 'YouTube', icon: 'Youtube' }
];

/**
 * Get icon component for a platform
 */
function getPlatformIcon(iconName) {
  return PLATFORM_ICONS[iconName] || Instagram;
}

/**
 * Platform Selector Dropdown Component
 * @param {Object} props
 * @param {string} props.value - Selected platform ID
 * @param {function} props.onChange - Callback when platform changes
 * @param {string} props.contentType - Type of content (caption, hashtag, hook, cta, visual)
 * @param {boolean} props.showTips - Whether to show tips below selector
 * @param {string} props.className - Additional CSS classes
 */
export default function PlatformSelector({ 
  value = 'instagram', 
  onChange, 
  contentType = 'general',
  showTips = true,
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPlatform = PLATFORM_LIST.find(p => p.id === value) || PLATFORM_LIST[0];
  const SelectedIcon = getPlatformIcon(selectedPlatform.icon);
  const tips = showTips ? getPlatformTips(value, contentType) : null;

  const handleSelect = (platformId) => {
    onChange(platformId);
    setIsOpen(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Dropdown Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-huttle-primary/50 focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary transition-all text-sm"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
              <SelectedIcon className="w-4 h-4 text-gray-700" />
            </div>
            <span className="font-medium text-gray-900">{selectedPlatform.name}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              {PLATFORM_LIST.map((platform) => {
                const Icon = getPlatformIcon(platform.icon);
                const isSelected = platform.id === value;
                
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handleSelect(platform.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                      isSelected ? 'bg-huttle-primary/5 text-huttle-primary' : 'text-gray-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                      isSelected ? 'bg-huttle-primary/10' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-huttle-primary' : 'text-gray-600'}`} />
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-huttle-primary' : ''}`}>
                      {platform.name}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-xs text-huttle-primary">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Platform Tips */}
      {showTips && tips && (
        <PlatformTips tips={tips} platformId={value} />
      )}
    </div>
  );
}

/**
 * Platform Tips Display Component
 */
export function PlatformTips({ tips, platformId, className = '' }) {
  const platform = getPlatform(platformId);
  
  if (!tips || !tips.items?.length) return null;

  return (
    <div className={`bg-huttle-primary/5 rounded-lg p-3 border border-huttle-primary/10 ${className}`}>
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-huttle-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-huttle-primary mb-1.5">{tips.title}</p>
          <ul className="space-y-1">
            {tips.items.map((tip, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-huttle-primary/50 mt-1.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Platform Selector (inline style)
 */
export function PlatformSelectorCompact({ 
  value = 'instagram', 
  onChange,
  className = '' 
}) {
  const selectedPlatform = PLATFORM_LIST.find(p => p.id === value) || PLATFORM_LIST[0];
  const SelectedIcon = getPlatformIcon(selectedPlatform.icon);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <SelectedIcon className="w-4 h-4 text-gray-500" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-huttle-primary/20 focus:border-huttle-primary outline-none text-sm appearance-none bg-white"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 8px center',
          backgroundSize: '16px',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {PLATFORM_LIST.map((platform) => (
          <option key={platform.id} value={platform.id}>
            {platform.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Platform Pills Selector (horizontal scrollable)
 */
export function PlatformPills({ 
  value = 'instagram', 
  onChange,
  className = '' 
}) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide ${className}`}>
      {PLATFORM_LIST.map((platform) => {
        const Icon = getPlatformIcon(platform.icon);
        const isSelected = platform.id === value;
        
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => onChange(platform.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              isSelected
                ? 'bg-huttle-primary text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{platform.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Get platform list for external use
 */
export function getPlatformList() {
  return PLATFORM_LIST;
}








