import React from 'react';

/**
 * Marquee - Infinite horizontal scrolling content
 * Uses pure CSS animation for maximum performance (no framer-motion overhead)
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
  const direction = vertical
    ? (reverse ? 'marquee-vertical-reverse' : 'marquee-vertical')
    : (reverse ? 'marquee-reverse' : 'marquee');

  return (
    <>
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
          <div
            key={i}
            className={`flex shrink-0 ${vertical ? 'flex-col' : ''} ${pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''}`}
            style={{ 
              gap: `${gap}px`,
              animation: `${direction} ${duration}s linear infinite`,
            }}
          >
            {children}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        @keyframes marquee-vertical {
          0% { transform: translateY(0%); }
          100% { transform: translateY(-100%); }
        }
        @keyframes marquee-vertical-reverse {
          0% { transform: translateY(0%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </>
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
