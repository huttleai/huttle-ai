import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * BlurFade - Text/content that fades in with a blur-to-sharp effect
 * Creates an elegant reveal animation on scroll
 */
export function BlurFade({ 
  children, 
  className = "",
  delay = 0,
  duration = 0.6,
  yOffset = 20,
  blur = "8px",
  inView = true,
  inViewMargin = "-100px",
  once = true,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: inViewMargin });
  const shouldAnimate = inView ? isInView : true;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ 
        opacity: 0, 
        y: yOffset,
        filter: `blur(${blur})`,
      }}
      animate={shouldAnimate ? { 
        opacity: 1, 
        y: 0,
        filter: "blur(0px)",
      } : {}}
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


