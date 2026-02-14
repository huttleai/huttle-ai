import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Calendar, 
  Repeat2, 
  Radio, 
  MessageSquare, 
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Play
} from 'lucide-react';

/**
 * FeatureShowcase - Auto-playing carousel showcasing app features
 * Optimized: Uses CSS for repeating animations, framer-motion only for transitions
 */

// Animated Preview Components - Use CSS animations for repeating effects
const ViralBlueprintPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 overflow-hidden">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <Sparkles size={16} className="text-white" />
      </div>
      <span className="text-white font-semibold text-sm">Viral Blueprint</span>
    </div>
    
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Hook</p>
        <p className="text-sm text-white leading-relaxed">"Stop scrolling if you want to know the truth about morning routines that actually work..."</p>
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Script</p>
        <p className="text-sm text-gray-300 leading-relaxed">"Step 1: Open with a pattern interrupt — close-up shot, slight zoom. Step 2: Present the problem everyone relates to..."</p>
      </div>
      <div className="flex gap-2 flex-wrap mt-2">
        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">#morningroutine</span>
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">#productivity</span>
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">#viralcontent</span>
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">#tiktoktips</span>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
        <span className="text-xs text-gray-400">Viral Score</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="w-[94%] h-full bg-gradient-to-r from-cyan-400 to-green-400 rounded-full"></div>
          </div>
          <span className="text-sm font-bold text-green-400">94</span>
        </div>
      </div>
    </div>
    
    {/* Sparkle - CSS animation instead of framer-motion */}
    <div className="absolute top-4 right-4 feature-sparkle-pulse">
      <Sparkles size={20} className="text-yellow-400" />
    </div>
  </div>
);

const SmartCalendarPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 overflow-hidden border border-slate-200">
    <div className="flex items-center justify-between mb-3">
      <span className="font-semibold text-slate-800 text-sm">February 2026</span>
      <div className="flex gap-1">
        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
          <ChevronLeft size={14} className="text-slate-500" />
        </div>
        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
          <ChevronRight size={14} className="text-slate-500" />
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-7 gap-1 text-center mb-2">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
        <div key={i} className="text-xs text-slate-400 font-medium">{day}</div>
      ))}
    </div>
    
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 28 }, (_, i) => {
        const hasPost = [3, 7, 10, 14, 18, 21, 25].includes(i + 1);
        const isOptimal = [7, 14, 21].includes(i + 1);
        return (
          <div
            key={i}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs relative ${
              hasPost 
                ? isOptimal 
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold' 
                  : 'bg-cyan-100 text-cyan-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {i + 1}
            {isOptimal && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full feature-dot-pulse" />
            )}
          </div>
        );
      })}
    </div>
    
    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
      <div className="w-2 h-2 bg-green-400 rounded-full" />
      <span>Optimal posting time: 6:30 PM</span>
    </div>
  </div>
);

const ContentRemixPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 overflow-hidden border border-orange-200">
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500" />
        <span className="text-xs font-medium text-slate-700">Original Post</span>
      </div>
      <div className="h-2 bg-slate-200 rounded w-full mb-1" />
      <div className="h-2 bg-slate-200 rounded w-3/4" />
    </div>
    
    <div className="flex justify-center mb-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
        <Repeat2 size={16} className="text-white" />
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-2">
      {[
        { name: 'TikTok', color: 'bg-black' },
        { name: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
        { name: 'YouTube', color: 'bg-red-500' },
        { name: 'LinkedIn', color: 'bg-blue-600' },
      ].map((platform) => (
        <div
          key={platform.name}
          className="bg-white rounded-lg p-2 shadow-sm border border-slate-100"
        >
          <div className={`w-4 h-4 rounded ${platform.color} mb-1`} />
          <div className="text-xs font-medium text-slate-600">{platform.name}</div>
          <div className="h-1 bg-slate-100 rounded mt-1" />
        </div>
      ))}
    </div>
  </div>
);

const TrendRadarPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-emerald-900 to-green-800 rounded-2xl p-4 overflow-hidden">
    <div className="relative w-full aspect-square max-w-[180px] mx-auto">
      {[1, 2, 3].map((ring) => (
        <div
          key={ring}
          className="absolute inset-0 rounded-full border border-green-400/20"
          style={{ 
            transform: `scale(${ring / 3})`,
            transformOrigin: 'center'
          }}
        />
      ))}
      
      {/* Radar sweep - CSS animation */}
      <div className="absolute inset-0 feature-radar-sweep">
        <div 
          className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-green-400 to-transparent origin-left"
          style={{ transform: 'translateY(-50%)' }}
        />
      </div>
      
      {/* Trend blips - CSS animation */}
      {[
        { x: 30, y: 25, size: 'large', delay: '0s' },
        { x: 70, y: 40, size: 'medium', delay: '0.5s' },
        { x: 45, y: 65, size: 'small', delay: '1s' },
        { x: 60, y: 75, size: 'medium', delay: '1.5s' },
      ].map((blip, i) => (
        <div
          key={i}
          className={`absolute rounded-full bg-green-400 feature-blip-pulse ${
            blip.size === 'large' ? 'w-3 h-3' : blip.size === 'medium' ? 'w-2 h-2' : 'w-1.5 h-1.5'
          }`}
          style={{ left: `${blip.x}%`, top: `${blip.y}%`, animationDelay: blip.delay }}
        />
      ))}
      
      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
    </div>
    
    <div className="mt-3 space-y-1">
      {['#TechTrends', '#AIContent', '#Viral2026'].map((tag, i) => (
        <div key={tag} className="flex items-center gap-2 text-xs">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-green-300">{tag}</span>
          <span className="text-green-500/50 ml-auto">↑ {120 - i * 30}%</span>
        </div>
      ))}
    </div>
  </div>
);

const AIPlanBuilderPreview = () => (
  <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl p-4 overflow-hidden border border-purple-200">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
          <BarChart3 size={16} className="text-white" />
        </div>
        <span className="font-semibold text-slate-800 text-sm">7-Day Plan</span>
      </div>
      <div className="flex gap-1">
        <div className="px-2 py-0.5 rounded bg-purple-100 text-purple-600 text-xs font-medium">7 days</div>
        <div className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-xs font-medium">14 days</div>
      </div>
    </div>
    
    <div className="space-y-2">
      {[
        { day: 'Mon', type: 'Reel', platform: 'Instagram', color: 'from-pink-500 to-purple-500', width: '60%' },
        { day: 'Tue', type: 'Story', platform: 'TikTok', color: 'from-slate-700 to-slate-900', width: '68%' },
        { day: 'Wed', type: 'Post', platform: 'LinkedIn', color: 'from-blue-500 to-blue-600', width: '76%' },
        { day: 'Thu', type: 'Video', platform: 'YouTube', color: 'from-red-500 to-red-600', width: '84%' },
        { day: 'Fri', type: 'Thread', platform: 'X', color: 'from-slate-800 to-slate-900', width: '92%' },
      ].map((item) => (
        <div
          key={item.day}
          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 shadow-sm"
        >
          <div className="w-10 text-xs font-bold text-slate-400">{item.day}</div>
          <div className={`w-6 h-6 rounded bg-gradient-to-br ${item.color} flex items-center justify-center`}>
            <span className="text-white text-[8px] font-bold">{item.platform.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-slate-700">{item.type}</div>
            <div className="h-1 bg-slate-100 rounded mt-1">
              <div 
                className={`h-full bg-gradient-to-r ${item.color} rounded`}
                style={{ width: item.width }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
    
    <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
      <Sparkles size={12} className="feature-spin" />
      <span>AI-optimized for your niche</span>
    </div>
  </div>
);

// Feature data
const features = [
  {
    id: 'viral-blueprint',
    title: 'Viral Blueprint Generator',
    description: 'AI analyzes trending content and generates complete scripts with hooks, visuals, keywords, and optimal timing.',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
    preview: ViralBlueprintPreview,
  },
  {
    id: 'smart-calendar',
    title: 'Smart Calendar',
    description: 'Auto-schedules posts at optimal times based on your audience engagement patterns and platform algorithms.',
    icon: Calendar,
    gradient: 'from-cyan-500 to-blue-500',
    preview: SmartCalendarPreview,
  },
  {
    id: 'ai-plan-builder',
    title: 'AI Plan Builder',
    description: 'Generate complete 7-day and 14-day content calendars in seconds with personalized post ideas tailored to your niche.',
    icon: BarChart3,
    gradient: 'from-purple-500 to-indigo-500',
    preview: AIPlanBuilderPreview,
  },
  {
    id: 'content-remix',
    title: 'Content Remix Studio',
    description: 'Transform one piece of content into 5 platform-optimized variations instantly. One idea, everywhere.',
    icon: Repeat2,
    gradient: 'from-orange-500 to-red-500',
    preview: ContentRemixPreview,
  },
  {
    id: 'trend-discovery',
    title: 'Trend Lab',
    description: 'Real-time discovery of current trends in your niche across all platforms. Never miss a viral moment.',
    icon: Radio,
    gradient: 'from-emerald-500 to-green-500',
    preview: TrendRadarPreview,
  },
];

export function FeatureShowcase({ className = "" }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const activeFeature = features[activeIndex];
  const PreviewComponent = activeFeature.preview;

  return (
    <div 
      className={`w-full ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
        {/* Left side - Feature info */}
        <div className="order-2 lg:order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br ${activeFeature.gradient} mb-4 md:mb-6`}>
                <activeFeature.icon size={24} className="text-white md:w-7 md:h-7" />
              </div>
              
              <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 md:mb-4">
                {activeFeature.title}
              </h3>
              
              <p className="text-sm md:text-lg text-slate-600 leading-relaxed mb-6 md:mb-8">
                {activeFeature.description}
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                <div className="w-2 h-2 bg-cyan-500 rounded-full feature-dot-pulse" />
                <span className="text-sm font-medium text-slate-600">Available at launch</span>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Navigation dots */}
          <div className="flex items-center gap-3 mt-8">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                onClick={() => setActiveIndex(index)}
                className={`relative h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex 
                    ? 'w-8 bg-gradient-to-r from-cyan-500 to-blue-500' 
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
            
            {isPaused && (
              <div className="ml-4 flex items-center gap-1 text-xs text-slate-400">
                <Play size={12} />
                <span>Paused</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Preview */}
        <div className="order-1 lg:order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature.id}
              className="relative max-w-sm mx-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${activeFeature.gradient} opacity-20 blur-3xl rounded-full`} />
              <div className="relative w-full">
                <PreviewComponent />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      <style>{`
        .feature-sparkle-pulse {
          animation: sparkle-pulse 2s ease-in-out infinite;
        }
        @keyframes sparkle-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .feature-dot-pulse {
          animation: dot-pulse 1.5s ease-in-out infinite;
        }
        @keyframes dot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .feature-radar-sweep {
          animation: radar-sweep 4s linear infinite;
        }
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .feature-blip-pulse {
          animation: blip-pulse 2s ease-in-out infinite;
        }
        @keyframes blip-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        .feature-spin {
          animation: feature-spin 2s linear infinite;
        }
        @keyframes feature-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default FeatureShowcase;
