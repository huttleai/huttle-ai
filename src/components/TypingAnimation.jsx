import React, { useState, useEffect, useRef } from 'react';

export function TypingAnimation({ 
  children, 
  duration = 100, 
  delay = 0, 
  as: Component = 'span',
  startOnView = false,
  className = "",
  onComplete
}) {
  const text = typeof children === 'string' ? children : String(children);
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const [isInView, setIsInView] = useState(!startOnView);
  const ref = useRef(null);

  // Intersection Observer for startOnView
  useEffect(() => {
    if (!startOnView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '-100px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [startOnView]);

  // Start typing after delay when in view
  useEffect(() => {
    if (startOnView && !isInView) return;
    if (!hasStarted) {
      const startTimer = setTimeout(() => {
        setHasStarted(true);
      }, delay);
      return () => clearTimeout(startTimer);
    }
  }, [delay, hasStarted, startOnView, isInView]);

  // Typing animation
  useEffect(() => {
    if (!hasStarted) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, duration);

    return () => clearInterval(interval);
  }, [text, duration, hasStarted, onComplete]);

  return (
    <Component ref={ref} className={className}>
      {displayedText}
      {hasStarted && !isComplete && (
        <span className="inline-block w-[2px] h-[0.9em] bg-current ml-1 align-middle animate-pulse" />
      )}
    </Component>
  );
}

