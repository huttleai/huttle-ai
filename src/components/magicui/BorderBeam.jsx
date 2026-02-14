import React from 'react';

/**
 * BorderBeam - Animated beam that travels around an element's border
 * Optimized: Uses CSS animation instead of framer-motion for continuous rotation
 */
export function BorderBeam({
  className = "",
  size = 200,
  duration = 12,
  borderWidth = 2,
  colorFrom = "#01bad2",
  colorTo = "#2B8FC7",
  delay = 0,
}) {
  return (
    <>
      <div className={`absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none ${className}`}>
        <div
          className="absolute border-beam-spin"
          style={{
            width: size,
            height: size,
            background: `conic-gradient(from 0deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
            borderRadius: '50%',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
        />
        <div 
          className="absolute bg-inherit rounded-[inherit]"
          style={{
            inset: borderWidth,
            background: 'inherit',
          }}
        />
      </div>
      <style>{`
        .border-beam-spin {
          animation: border-beam-rotate var(--duration, 12s) linear infinite;
          will-change: transform;
        }
        @keyframes border-beam-rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </>
  );
}

/**
 * BorderBeamButton - Button with animated border beam effect
 * Optimized: CSS animation for beam rotation, simple CSS transitions for hover
 */
export function BorderBeamButton({
  children,
  className = "",
  onClick,
  disabled = false,
  beamSize = 150,
  beamDuration = 8,
  colorFrom = "#01bad2",
  colorTo = "#2B8FC7",
}) {
  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative overflow-hidden transition-transform duration-200 ${disabled ? '' : 'hover:scale-[1.02] active:scale-[0.98]'} ${className}`}
      >
        {/* Animated border beam - CSS only */}
        <div className="absolute inset-0 rounded-[inherit]">
          <div
            className="absolute w-full h-full beam-btn-spin"
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${colorFrom} 60deg, ${colorTo} 120deg, transparent 180deg)`,
              animationDuration: `${beamDuration}s`,
            }}
          />
        </div>
        
        {/* Inner background */}
        <div className="absolute inset-[2px] rounded-[inherit] bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]" />
        
        {/* Glow effect - CSS hover */}
        <div
          className="absolute inset-0 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            boxShadow: `0 0 30px ${colorFrom}50, 0 0 60px ${colorTo}30`,
          }}
        />
        
        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
      <style>{`
        .beam-btn-spin {
          animation: beam-btn-rotate var(--duration, 8s) linear infinite;
          will-change: transform;
        }
        @keyframes beam-btn-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default BorderBeam;
