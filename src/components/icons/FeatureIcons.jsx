import React from 'react';
import { motion } from 'framer-motion';

/**
 * Custom Feature Icons - Unique SVG illustrations for Huttle AI
 * Each icon tells a story about its feature with animated elements
 */

// Smart Calendar - Calendar with AI brain overlay
export function SmartCalendarIcon({ className = "", size = 64 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileHover={{ scale: 1.05 }}
    >
      <defs>
        <linearGradient id="calendarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2B8FC7" />
          <stop offset="100%" stopColor="#01bad2" />
        </linearGradient>
        <linearGradient id="calendarAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#01bad2" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
      </defs>
      
      {/* Calendar base */}
      <rect x="8" y="14" width="48" height="42" rx="6" fill="url(#calendarGradient)" />
      
      {/* Calendar header */}
      <rect x="8" y="14" width="48" height="12" rx="6" fill="#1a5a7a" />
      <motion.rect 
        x="8" y="20" width="48" height="6" fill="#1a5a7a"
        initial={{ opacity: 0.8 }}
      />
      
      {/* Calendar rings */}
      <rect x="18" y="10" width="4" height="10" rx="2" fill="#0e4a6a" />
      <rect x="42" y="10" width="4" height="10" rx="2" fill="#0e4a6a" />
      
      {/* Calendar grid dots - representing scheduled posts */}
      <motion.circle cx="20" cy="36" r="3" fill="white" fillOpacity="0.9"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
      />
      <motion.circle cx="32" cy="36" r="3" fill="white" fillOpacity="0.9"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle cx="44" cy="36" r="3" fill="white" fillOpacity="0.9"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
      />
      <circle cx="20" cy="48" r="3" fill="white" fillOpacity="0.5" />
      <circle cx="32" cy="48" r="3" fill="white" fillOpacity="0.5" />
      <motion.circle cx="44" cy="48" r="3" fill="url(#calendarAccent)"
        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* AI sparkle indicator */}
      <motion.g
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: '50px 20px' }}
      >
        <path d="M50 16L51.5 19L54.5 20L51.5 21L50 24L48.5 21L45.5 20L48.5 19L50 16Z" fill="#00e5ff" />
      </motion.g>
    </motion.svg>
  );
}

// AI Plan Builder - Layered content cards with sparkle effects
export function AIPlanBuilderIcon({ className = "", size = 64 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileHover={{ scale: 1.05 }}
    >
      <defs>
        <linearGradient id="planGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="planGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      
      {/* Back card */}
      <motion.rect 
        x="16" y="8" width="36" height="28" rx="4" 
        fill="#e2e8f0"
        initial={{ y: 8 }}
        animate={{ y: [8, 6, 8] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Middle card */}
      <motion.rect 
        x="12" y="16" width="36" height="28" rx="4" 
        fill="url(#planGradient2)"
        initial={{ y: 16 }}
        animate={{ y: [16, 14, 16] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      
      {/* Front card */}
      <motion.rect 
        x="8" y="24" width="36" height="28" rx="4" 
        fill="url(#planGradient1)"
        initial={{ y: 24 }}
        animate={{ y: [24, 22, 24] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      
      {/* Content lines on front card */}
      <rect x="14" y="32" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.8" />
      <rect x="14" y="38" width="14" height="3" rx="1.5" fill="white" fillOpacity="0.5" />
      <rect x="14" y="44" width="18" height="3" rx="1.5" fill="white" fillOpacity="0.5" />
      
      {/* AI sparkles */}
      <motion.path 
        d="M52 12L54 16L58 18L54 20L52 24L50 20L46 18L50 16L52 12Z" 
        fill="#F97316"
        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.path 
        d="M48 40L49.5 43L52.5 44L49.5 45L48 48L46.5 45L43.5 44L46.5 43L48 40Z" 
        fill="#EC4899"
        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
    </motion.svg>
  );
}

// Content Remix - Single post splitting into multiple variations
export function ContentRemixIcon({ className = "", size = 64 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileHover={{ scale: 1.05 }}
    >
      <defs>
        <linearGradient id="remixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      
      {/* Center source content */}
      <motion.rect 
        x="22" y="22" width="20" height="20" rx="4" 
        fill="url(#remixGradient)"
        animate={{ scale: [1, 0.95, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <rect x="26" y="28" width="12" height="2" rx="1" fill="white" fillOpacity="0.8" />
      <rect x="26" y="33" width="8" height="2" rx="1" fill="white" fillOpacity="0.5" />
      
      {/* Branching arrows */}
      <motion.path 
        d="M20 32 L12 20" 
        stroke="#F97316" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeDasharray="4 2"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.path 
        d="M44 32 L52 20" 
        stroke="#F97316" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeDasharray="4 2"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
      />
      <motion.path 
        d="M20 32 L12 44" 
        stroke="#EF4444" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeDasharray="4 2"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
      />
      <motion.path 
        d="M44 32 L52 44" 
        stroke="#EF4444" 
        strokeWidth="2" 
        strokeLinecap="round"
        strokeDasharray="4 2"
        animate={{ pathLength: [0, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
      />
      
      {/* Output variations - small cards */}
      <motion.rect x="4" y="12" width="14" height="14" rx="3" fill="#1a1a2e"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.rect x="46" y="12" width="14" height="14" rx="3" fill="#e91e63"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
      <motion.rect x="4" y="38" width="14" height="14" rx="3" fill="#1877f2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
      />
      <motion.rect x="46" y="38" width="14" height="14" rx="3" fill="#ff0000"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
      />
    </motion.svg>
  );
}

// Trend Radar - Radar screen with trending wave patterns
export function TrendRadarIcon({ className = "", size = 64 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileHover={{ scale: 1.05 }}
    >
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      
      {/* Radar background */}
      <circle cx="32" cy="32" r="26" fill="url(#radarGradient)" />
      
      {/* Radar rings */}
      <circle cx="32" cy="32" r="20" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <circle cx="32" cy="32" r="14" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <circle cx="32" cy="32" r="8" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      
      {/* Cross lines */}
      <line x1="32" y1="6" x2="32" y2="58" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <line x1="6" y1="32" x2="58" y2="32" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      
      {/* Radar sweep */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: '32px 32px' }}
      >
        <path
          d="M32 32 L32 6 A26 26 0 0 1 52 16 Z"
          fill="white"
          fillOpacity="0.3"
        />
        <line x1="32" y1="32" x2="32" y2="6" stroke="white" strokeWidth="2" />
      </motion.g>
      
      {/* Trend blips */}
      <motion.circle cx="24" cy="20" r="3" fill="#00ff88"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle cx="42" cy="28" r="2.5" fill="#00ff88"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle cx="28" cy="40" r="2" fill="#00ff88"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
      />
      
      {/* Center dot */}
      <circle cx="32" cy="32" r="3" fill="white" />
    </motion.svg>
  );
}

// Caption Generator - Text bubble with AI writing animation
export function CaptionGeneratorIcon({ className = "", size = 64 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileHover={{ scale: 1.05 }}
    >
      <defs>
        <linearGradient id="captionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
      </defs>
      
      {/* Speech bubble */}
      <path 
        d="M8 12 H48 Q56 12 56 20 V36 Q56 44 48 44 H24 L16 52 V44 H16 Q8 44 8 36 V20 Q8 12 16 12 Z" 
        fill="url(#captionGradient)"
      />
      
      {/* Animated text lines */}
      <motion.rect x="16" y="20" height="3" rx="1.5" fill="white" fillOpacity="0.9"
        initial={{ width: 0 }}
        animate={{ width: [0, 24, 24, 0] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.3, 0.8, 1] }}
      />
      <motion.rect x="16" y="27" height="3" rx="1.5" fill="white" fillOpacity="0.6"
        initial={{ width: 0 }}
        animate={{ width: [0, 18, 18, 0] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.35, 0.8, 1], delay: 0.2 }}
      />
      <motion.rect x="16" y="34" height="3" rx="1.5" fill="white" fillOpacity="0.6"
        initial={{ width: 0 }}
        animate={{ width: [0, 20, 20, 0] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.8, 1], delay: 0.4 }}
      />
      
      {/* AI cursor */}
      <motion.rect x="44" y="20" width="2" height="10" rx="1" fill="white"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
      
      {/* Sparkle */}
      <motion.path 
        d="M52 8L53.5 11L56.5 12L53.5 13L52 16L50.5 13L47.5 12L50.5 11L52 8Z" 
        fill="#F43F5E"
        animate={{ scale: [1, 1.3, 1], rotate: [0, 15, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.svg>
  );
}

// Quality Scorer - Gauge/meter with dynamic needle
export function QualityScorerIcon({ className = "", size = 64 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      whileHover={{ scale: 1.05 }}
    >
      <defs>
        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="gaugeBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      
      {/* Gauge background */}
      <circle cx="32" cy="36" r="24" fill="url(#gaugeBack)" />
      
      {/* Gauge arc background */}
      <path
        d="M12 36 A20 20 0 0 1 52 36"
        fill="none"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Colored gauge arc */}
      <path
        d="M12 36 A20 20 0 0 1 52 36"
        fill="none"
        stroke="url(#gaugeGradient)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* Tick marks */}
      <line x1="14" y1="36" x2="18" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="18" x2="32" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="36" x2="46" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round" />
      
      {/* Animated needle */}
      <motion.g
        animate={{ rotate: [-45, 45, 30] }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        style={{ transformOrigin: '32px 36px' }}
      >
        <path d="M32 36 L32 20 L34 36 L30 36 Z" fill="white" />
        <circle cx="32" cy="36" r="4" fill="white" />
      </motion.g>
      
      {/* Score display */}
      <rect x="22" y="44" width="20" height="10" rx="3" fill="white" fillOpacity="0.2" />
      <motion.text x="32" y="52" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        94
      </motion.text>
    </motion.svg>
  );
}

// Export all icons as a collection
export const FeatureIcons = {
  SmartCalendar: SmartCalendarIcon,
  AIPlanBuilder: AIPlanBuilderIcon,
  ContentRemix: ContentRemixIcon,
  TrendRadar: TrendRadarIcon,
  CaptionGenerator: CaptionGeneratorIcon,
  QualityScorer: QualityScorerIcon,
};

export default FeatureIcons;

