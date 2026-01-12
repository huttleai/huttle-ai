import React from 'react';
import { motion } from 'framer-motion';

/**
 * BlurFade - Text/content that fades in with a blur-to-sharp effect
 * Animates on mount (not scroll-triggered) for instant page load feel
 */
export function BlurFade({ 
  children, 
  className = "",
  delay = 0,
  duration = 0.6,
  yOffset = 20,
  blur = "8px",
}) {
  return (
    <motion.div
      className={className}
      initial={{ 
        opacity: 0, 
        y: yOffset,
        filter: `blur(${blur})`,
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        filter: "blur(0px)",
      }}
      transition={{
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * BlurFadeText - Character-by-character blur fade animation
 */
export function BlurFadeText({
  text,
  className = "",
  delay = 0,
  characterDelay = 0.03,
  duration = 0.4,
  yOffset = 10,
  blur = "4px",
  as: Component = "span",
}) {
  const characters = text.split('');

  return (
    <Component className={`inline-block ${className}`}>
      {characters.map((char, index) => (
        <motion.span
          key={index}
          className="inline-block"
          style={{ 
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
          initial={{ 
            opacity: 0, 
            y: yOffset,
            filter: `blur(${blur})`,
          }}
          animate={{ 
            opacity: 1, 
            y: 0,
            filter: "blur(0px)",
          }}
          transition={{
            duration,
            delay: delay + (index * characterDelay),
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          {char}
        </motion.span>
      ))}
    </Component>
  );
}

/**
 * BlurFadeStagger - Staggers children with blur fade effect
 */
export function BlurFadeStagger({
  children,
  className = "",
  delay = 0,
  staggerDelay = 0.1,
  duration = 0.5,
  yOffset = 20,
  blur = "8px",
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <motion.div
          initial={{ 
            opacity: 0, 
            y: yOffset,
            filter: `blur(${blur})`,
          }}
          animate={{ 
            opacity: 1, 
            y: 0,
            filter: "blur(0px)",
          }}
          transition={{
            duration,
            delay: delay + (index * staggerDelay),
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

export default BlurFade;


