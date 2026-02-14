import React from 'react';

/**
 * BlurFade - Text/content that fades in with a blur-to-sharp effect
 * Optimized: Uses CSS animation instead of framer-motion filter animation
 * (framer-motion filter animations are GPU-expensive and cause jank)
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
    <>
      <div
        className={`blur-fade-in ${className}`}
        style={{
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          '--blur-fade-y': `${yOffset}px`,
          '--blur-fade-blur': blur,
        }}
      >
        {children}
      </div>
      <style>{`
        .blur-fade-in {
          animation: blur-fade-in 0.6s ease-out both;
        }
        @keyframes blur-fade-in {
          from {
            opacity: 0;
            transform: translateY(var(--blur-fade-y, 20px));
            filter: blur(var(--blur-fade-blur, 8px));
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0px);
          }
        }
      `}</style>
    </>
  );
}

/**
 * BlurFadeText - Character-by-character blur fade animation
 * NOTE: For performance, prefer BlurFade wrapping a full text block instead
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
    <>
      <Component className={`inline-block ${className}`}>
        {characters.map((char, index) => (
          <span
            key={index}
            className="inline-block blur-fade-char"
            style={{ 
              whiteSpace: char === ' ' ? 'pre' : 'normal',
              animationDelay: `${delay + (index * characterDelay)}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {char}
          </span>
        ))}
      </Component>
      <style>{`
        .blur-fade-char {
          animation: blur-fade-char 0.4s ease-out both;
          opacity: 0;
        }
        @keyframes blur-fade-char {
          from {
            opacity: 0;
            transform: translateY(${yOffset}px);
            filter: blur(${blur});
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0px);
          }
        }
      `}</style>
    </>
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
    <>
      <div className={className}>
        {React.Children.map(children, (child, index) => (
          <div
            className="blur-fade-stagger-item"
            style={{
              animationDelay: `${delay + (index * staggerDelay)}s`,
              animationDuration: `${duration}s`,
              '--blur-stagger-y': `${yOffset}px`,
              '--blur-stagger-blur': blur,
            }}
          >
            {child}
          </div>
        ))}
      </div>
      <style>{`
        .blur-fade-stagger-item {
          animation: blur-fade-stagger 0.5s ease-out both;
        }
        @keyframes blur-fade-stagger {
          from {
            opacity: 0;
            transform: translateY(var(--blur-stagger-y, 20px));
            filter: blur(var(--blur-stagger-blur, 8px));
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0px);
          }
        }
      `}</style>
    </>
  );
}

export default BlurFade;
