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
 * Replaces testimonials for "Coming Soon" landing page
 */

// Animated Preview Components
const ViralBlueprintPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 overflow-hidden">
    {/* Header */}
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
        <Sparkles size={16} className="text-white" />
      </div>
      <span className="text-white font-semibold text-sm">Viral Blueprint</span>
    </div>
    
    {/* Animated content generation */}
    <div className="space-y-3">
      <motion.div 
        className="bg-slate-700/50 rounded-lg p-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-xs text-slate-400 mb-1">Hook</div>
        <motion.div 
          className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded"
          initial={{ width: 0 }}
          animate={{ width: '80%' }}
          transition={{ delay: 0.4, duration: 0.8 }}
        />
      </motion.div>
      
      <motion.div 
        className="bg-slate-700/50 rounded-lg p-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-xs text-slate-400 mb-1">Script</div>
        <div className="space-y-1">
          <motion.div 
            className="h-2 bg-white/20 rounded"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.7, duration: 0.6 }}
          />
          <motion.div 
            className="h-2 bg-white/20 rounded"
            initial={{ width: 0 }}
            animate={{ width: '70%' }}
            transition={{ delay: 0.9, duration: 0.5 }}
          />
        </div>
      </motion.div>
      
      <motion.div 
        className="flex gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">#trending</span>
        <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full">#viral</span>
        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">#fyp</span>
      </motion.div>
    </div>
    
    {/* Sparkle effects */}
    <motion.div 
      className="absolute top-4 right-4"
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Sparkles size={20} className="text-yellow-400" />
    </motion.div>
  </div>
);

const SmartCalendarPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 overflow-hidden border border-slate-200">
    {/* Calendar header */}
    <div className="flex items-center justify-between mb-3">
      <span className="font-semibold text-slate-800 text-sm">January 2026</span>
      <div className="flex gap-1">
        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
          <ChevronLeft size={14} className="text-slate-500" />
        </div>
        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
          <ChevronRight size={14} className="text-slate-500" />
        </div>
      </div>
    </div>
    
    {/* Calendar grid */}
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
          <motion.div
            key={i}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs relative ${
              hasPost 
                ? isOptimal 
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold' 
                  : 'bg-cyan-100 text-cyan-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 }}
          >
            {i + 1}
            {isOptimal && (
              <motion.div 
                className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
    
    {/* Optimal time indicator */}
    <motion.div 
      className="mt-3 flex items-center gap-2 text-xs text-slate-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      <div className="w-2 h-2 bg-green-400 rounded-full" />
      <span>Optimal posting time: 6:30 PM</span>
    </motion.div>
  </div>
);

const ContentRemixPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 overflow-hidden border border-orange-200">
    {/* Source content */}
    <motion.div 
      className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 mb-4"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500" />
        <span className="text-xs font-medium text-slate-700">Original Post</span>
      </div>
      <div className="h-2 bg-slate-200 rounded w-full mb-1" />
      <div className="h-2 bg-slate-200 rounded w-3/4" />
    </motion.div>
    
    {/* Remix arrow */}
    <motion.div 
      className="flex justify-center mb-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
        <Repeat2 size={16} className="text-white" />
      </div>
    </motion.div>
    
    {/* Platform variations */}
    <div className="grid grid-cols-2 gap-2">
      {[
        { name: 'TikTok', color: 'bg-black', delay: 0.6 },
        { name: 'Instagram', color: 'bg-gradient-to-br from-purple-500 to-pink-500', delay: 0.7 },
        { name: 'YouTube', color: 'bg-red-500', delay: 0.8 },
        { name: 'LinkedIn', color: 'bg-blue-600', delay: 0.9 },
      ].map((platform, i) => (
        <motion.div
          key={platform.name}
          className="bg-white rounded-lg p-2 shadow-sm border border-slate-100"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: platform.delay, type: 'spring' }}
        >
          <div className={`w-4 h-4 rounded ${platform.color} mb-1`} />
          <div className="text-xs font-medium text-slate-600">{platform.name}</div>
          <div className="h-1 bg-slate-100 rounded mt-1" />
        </motion.div>
      ))}
    </div>
  </div>
);

const TrendRadarPreview = () => (
  <div className="relative w-full bg-gradient-to-br from-emerald-900 to-green-800 rounded-2xl p-4 overflow-hidden">
    {/* Radar visualization */}
    <div className="relative w-full aspect-square max-w-[180px] mx-auto">
      {/* Radar circles */}
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
      
      {/* Radar sweep */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      >
        <div 
          className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-green-400 to-transparent origin-left"
          style={{ transform: 'translateY(-50%)' }}
        />
      </motion.div>
      
      {/* Trend blips */}
      {[
        { x: 30, y: 25, size: 'large', delay: 0 },
        { x: 70, y: 40, size: 'medium', delay: 0.5 },
        { x: 45, y: 65, size: 'small', delay: 1 },
        { x: 60, y: 75, size: 'medium', delay: 1.5 },
      ].map((blip, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-green-400 ${
            blip.size === 'large' ? 'w-3 h-3' : blip.size === 'medium' ? 'w-2 h-2' : 'w-1.5 h-1.5'
          }`}
          style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity, delay: blip.delay }}
        />
      ))}
      
      {/* Center point */}
      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
    </div>
    
    {/* Trending topics */}
    <motion.div 
      className="mt-3 space-y-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      {['#TechTrends', '#AIContent', '#Viral2026'].map((tag, i) => (
        <motion.div
          key={tag}
          className="flex items-center gap-2 text-xs"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 + i * 0.2 }}
        >
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-green-300">{tag}</span>
          <span className="text-green-500/50 ml-auto">↑ {120 - i * 30}%</span>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

const AIPlanBuilderPreview = () => (
  <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl p-4 overflow-hidden border border-purple-200">
    {/* Header */}
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
    
    {/* Content plan cards */}
    <div className="space-y-2">
      {[
        { day: 'Mon', type: 'Reel', platform: 'Instagram', color: 'from-pink-500 to-purple-500' },
        { day: 'Tue', type: 'Story', platform: 'TikTok', color: 'from-slate-700 to-slate-900' },
        { day: 'Wed', type: 'Post', platform: 'LinkedIn', color: 'from-blue-500 to-blue-600' },
        { day: 'Thu', type: 'Video', platform: 'YouTube', color: 'from-red-500 to-red-600' },
        { day: 'Fri', type: 'Thread', platform: 'X', color: 'from-slate-800 to-slate-900' },
      ].map((item, i) => (
        <motion.div
          key={item.day}
          className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
        >
          <div className="w-10 text-xs font-bold text-slate-400">{item.day}</div>
          <div className={`w-6 h-6 rounded bg-gradient-to-br ${item.color} flex items-center justify-center`}>
            <span className="text-white text-[8px] font-bold">{item.platform.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-slate-700">{item.type}</div>
            <motion.div 
              className="h-1 bg-slate-100 rounded mt-1"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
            >
              <motion.div 
                className={`h-full bg-gradient-to-r ${item.color} rounded`}
                initial={{ width: 0 }}
                animate={{ width: `${60 + i * 8}%` }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
              />
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
    
    {/* AI generating indicator */}
    <motion.div 
      className="mt-3 flex items-center gap-2 text-xs text-purple-600"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles size={12} />
      </motion.div>
      <span>AI-optimized for your niche</span>
    </motion.div>
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

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 5000);
    
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
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4 }}
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br ${activeFeature.gradient} mb-4 md:mb-6`}>
                <activeFeature.icon size={24} className="text-white md:w-7 md:h-7" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 md:mb-4">
                {activeFeature.title}
              </h3>
              
              {/* Description */}
              <p className="text-sm md:text-lg text-slate-600 leading-relaxed mb-6 md:mb-8">
                {activeFeature.description}
              </p>
              
              {/* Coming soon badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                <motion.div 
                  className="w-2 h-2 bg-cyan-500 rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
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
              >
                {index === activeIndex && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    layoutId="activeIndicator"
                  />
                )}
              </button>
            ))}
            
            {/* Pause indicator */}
            {isPaused && (
              <div className="ml-4 flex items-center gap-1 text-xs text-slate-400">
                <Play size={12} />
                <span>Paused</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Animated preview */}
        <div className="order-1 lg:order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature.id}
              className="relative max-w-sm mx-auto"
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${activeFeature.gradient} opacity-20 blur-3xl rounded-full`} />
              
              {/* Preview container */}
              <div className="relative w-full">
                <PreviewComponent />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default FeatureShowcase;

