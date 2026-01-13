import React, { useEffect, useState, useRef } from 'react';
import { useSpring, useTransform, useInView } from 'framer-motion';

/**
 * NumberTicker - Animated number counter with spring physics
 * Can animate on mount or when element comes into view
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
  suffix = "",
  triggerOnView = false, // New prop: if true, animate when in view instead of on mount
  viewOnce = true // Only animate once when in view
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: viewOnce, margin: "-100px" });
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

  // Animate based on trigger mode
  useEffect(() => {
    if (hasAnimated) return;
    
    // If triggerOnView is true, wait for element to be in view
    if (triggerOnView && !isInView) return;
    
    const timeout = setTimeout(() => {
      motionValue.set(value);
      setHasAnimated(true);
    }, delay * 1000);
    
    return () => clearTimeout(timeout);
  }, [hasAnimated, motionValue, value, delay, triggerOnView, isInView]);

  useEffect(() => {
    const unsubscribe = displayValue.on("change", (latest) => {
      setCurrentDisplay(latest);
    });
    return unsubscribe;
  }, [displayValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}{currentDisplay}{suffix}
    </span>
  );
}

export default NumberTicker;
