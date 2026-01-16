import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Meteors - Animated shooting stars/meteors background effect
 * Creates a dynamic, space-like atmosphere
 */
export function Meteors({ 
  number = 20,
  className = "",
  minDelay = 0,
  maxDelay = 10,
  minDuration = 2,
  maxDuration = 8,
  angle = 215,
}) {
  const meteors = useMemo(() => {
    return Array.from({ length: number }, (_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      delay: Math.random() * (maxDelay - minDelay) + minDelay,
      duration: Math.random() * (maxDuration - minDuration) + minDuration,
      startX: Math.random() * 100,
      startY: Math.random() * -50,
    }));
  }, [number, minDelay, maxDelay, minDuration, maxDuration]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {meteors.map((meteor) => (
        <motion.div
          key={meteor.id}
          className="absolute"
          style={{
            left: `${meteor.startX}%`,
            top: `${meteor.startY}%`,
            width: meteor.size,
            height: meteor.size * 50,
            background: `linear-gradient(to bottom, rgba(1, 186, 210, 0.8), rgba(1, 186, 210, 0.4), transparent)`,
            borderRadius: '50% 50% 50% 50% / 10% 10% 90% 90%',
            transform: `rotate(${angle}deg)`,
            filter: 'blur(0.5px)',
          }}
          initial={{
            x: 0,
            y: 0,
            opacity: 0,
          }}
          animate={{
            x: [0, 500],
            y: [0, 500],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: meteor.duration,
            delay: meteor.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 5 + 3,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

/**
 * MeteorShower - Enhanced meteor effect with glow
 */
export function MeteorShower({
  number = 15,
  className = "",
}) {
  const meteors = useMemo(() => {
    return Array.from({ length: number }, (_, i) => ({
      id: i,
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 15,
      duration: Math.random() * 3 + 2,
      startX: Math.random() * 120 - 10,
    }));
  }, [number]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {meteors.map((meteor) => (
        <motion.div
          key={meteor.id}
          className="absolute"
          style={{
            left: `${meteor.startX}%`,
            top: '-5%',
          }}
          initial={{ y: '-100%', x: 0, opacity: 0 }}
          animate={{
            y: '120vh',
            x: '20vw',
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: meteor.duration,
            delay: meteor.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 10 + 5,
            ease: 'linear',
          }}
        >
          {/* Meteor head (glow) */}
          <div
            className="rounded-full"
            style={{
              width: meteor.size * 4,
              height: meteor.size * 4,
              background: 'radial-gradient(circle, rgba(1,186,210,1) 0%, rgba(1,186,210,0.5) 50%, transparent 70%)',
              boxShadow: '0 0 10px rgba(1,186,210,0.8), 0 0 20px rgba(1,186,210,0.4)',
            }}
          />
          {/* Meteor tail */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%) rotate(215deg)',
              transformOrigin: 'top center',
              width: meteor.size,
              height: meteor.size * 80,
              background: 'linear-gradient(to bottom, rgba(1,186,210,0.6) 0%, rgba(43,143,199,0.3) 30%, transparent 100%)',
              borderRadius: '50%',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default Meteors;



