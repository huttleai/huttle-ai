import React from 'react';
import { motion } from 'framer-motion';

/**
 * BorderBeam - Animated beam that travels around an element's border
 * Creates a futuristic, high-tech appearance for buttons and cards
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
    <div className={`absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none ${className}`}>
      <motion.div
        className="absolute"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(from 0deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
          borderRadius: '50%',
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          delay,
        }}
        initial={{
          left: '50%',
          top: '50%',
          x: '-50%',
          y: '-50%',
        }}
      />
      {/* Inner mask to create border effect */}
      <div 
        className="absolute bg-inherit rounded-[inherit]"
        style={{
          inset: borderWidth,
          background: 'inherit',
        }}
      />
    </div>
  );
}

/**
 * BorderBeamButton - Button with animated border beam effect
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
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {/* Animated border beam */}
      <div className="absolute inset-0 rounded-[inherit]">
        <motion.div
          className="absolute w-full h-full"
          style={{
            background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${colorFrom} 60deg, ${colorTo} 120deg, transparent 180deg)`,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: beamDuration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
      
      {/* Inner background */}
      <div className="absolute inset-[2px] rounded-[inherit] bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]" />
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-[inherit]"
        initial={{ opacity: 0 }}
        whileHover={{ 
          opacity: 1,
          boxShadow: `0 0 30px ${colorFrom}50, 0 0 60px ${colorTo}30`,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

export default BorderBeam;

