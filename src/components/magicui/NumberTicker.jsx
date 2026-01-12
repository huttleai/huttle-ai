import React, { useEffect, useState } from 'react';
import { useSpring, useTransform } from 'framer-motion';

/**
 * NumberTicker - Animated number counter with spring physics
 * Animates on mount for instant page load feel
 */
export function NumberTicker({ 
  value, 
  direction = 'up',
  startValue = null, // Allow custom starting value
  delay = 0, 
  className = "",
  decimalPlaces = 0,
  duration = 2,
  prefix = "",
  suffix = ""
}) {
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Determine the initial value based on direction or custom startValue
  const initialValue = startValue !== null 
    ? startValue 
    : (direction === 'up' ? 0 : value);
  
  const motionValue = useSpring(initialValue, {
    damping: 60,
    stiffness: 100,
    duration: duration * 1000,
  });
  
  const displayValue = useTransform(motionValue, (latest) => {
    return Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(latest.toFixed(decimalPlaces)));
  });

  const [currentDisplay, setCurrentDisplay] = useState(
    Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(initialValue)
  );

  // Animate on mount
  useEffect(() => {
    if (!hasAnimated) {
      const timeout = setTimeout(() => {
        motionValue.set(value);
        setHasAnimated(true);
      }, delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [hasAnimated, motionValue, value, delay]);

  useEffect(() => {
    const unsubscribe = displayValue.on("change", (latest) => {
      setCurrentDisplay(latest);
    });
    return unsubscribe;
  }, [displayValue]);

  return (
    <span className={className}>
      {prefix}{currentDisplay}{suffix}
    </span>
  );
}

export default NumberTicker;

