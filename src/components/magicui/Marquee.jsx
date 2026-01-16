import React from 'react';
import { motion } from 'framer-motion';

/**
 * Marquee - Infinite horizontal scrolling content
 * Perfect for logos, testimonials, or any repeating content
 */
export function Marquee({ 
  children, 
  className = "", 
  reverse = false, 
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  duration = 40,
  gap = 16
}) {
  return (
    <div
      className={`group flex overflow-hidden ${vertical ? 'flex-col' : ''} ${className}`}
      style={{
        maskImage: vertical 
          ? 'linear-gradient(to bottom, transparent, white 10%, white 90%, transparent)'
          : 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage: vertical 
          ? 'linear-gradient(to bottom, transparent, white 10%, white 90%, transparent)'
          : 'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
      }}
    >
      {Array(repeat).fill(0).map((_, i) => (
        <motion.div
          key={i}
          className={`flex shrink-0 ${vertical ? 'flex-col' : ''} ${pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''}`}
          style={{ gap: `${gap}px` }}
          animate={{
            x: vertical ? 0 : reverse ? ['0%', '100%'] : ['0%', '-100%'],
            y: vertical ? (reverse ? ['0%', '100%'] : ['0%', '-100%']) : 0,
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {children}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * MarqueeItem - Individual item wrapper for Marquee
 */
export function MarqueeItem({ children, className = "" }) {
  return (
    <div className={`flex items-center justify-center shrink-0 ${className}`}>
      {children}
    </div>
  );
}

export default Marquee;



