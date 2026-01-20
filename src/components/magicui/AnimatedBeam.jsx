import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * AnimatedBeam - Animated connection line between two elements
 * Creates visual connections showing data flow or relationships
 */
export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 5,
  delay = 0,
  pathColor = "rgba(1, 186, 210, 0.2)",
  pathWidth = 2,
  gradientStartColor = "#01bad2",
  gradientStopColor = "#2B8FC7",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}) {
  const [pathD, setPathD] = useState('');
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updatePath = () => {
      if (!containerRef?.current || !fromRef?.current || !toRef?.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const fromRect = fromRef.current.getBoundingClientRect();
      const toRect = toRef.current.getBoundingClientRect();

      const startX = fromRect.left - containerRect.left + fromRect.width / 2 + startXOffset;
      const startY = fromRect.top - containerRect.top + fromRect.height / 2 + startYOffset;
      const endX = toRect.left - containerRect.left + toRect.width / 2 + endXOffset;
      const endY = toRect.top - containerRect.top + toRect.height / 2 + endYOffset;

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 + curvature;

      setPathD(`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`);
      setSvgDimensions({
        width: containerRect.width,
        height: containerRect.height,
      });
    };

    updatePath();
    window.addEventListener('resize', updatePath);
    return () => window.removeEventListener('resize', updatePath);
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  const gradientId = `beam-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradientStartColor} stopOpacity="0" />
          <stop offset="50%" stopColor={gradientStartColor} stopOpacity="1" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Background path */}
      <path
        d={pathD}
        fill="none"
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeLinecap="round"
      />
      
      {/* Animated beam */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={pathWidth + 1}
        strokeLinecap="round"
        initial={{ pathLength: 0, pathOffset: reverse ? 0 : 1 }}
        animate={{ 
          pathLength: [0, 0.3, 0.3, 0],
          pathOffset: reverse ? [0, 0.7, 1, 1] : [1, 0.3, 0, 0],
        }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </svg>
  );
}

/**
 * AnimatedBeamMultiple - Connect one element to multiple targets
 */
export function AnimatedBeamMultiple({
  containerRef,
  fromRef,
  toRefs = [],
  curvatures = [],
  duration = 5,
  pathColor = "rgba(1, 186, 210, 0.15)",
}) {
  return (
    <>
      {toRefs.map((toRef, index) => (
        <AnimatedBeam
          key={index}
          containerRef={containerRef}
          fromRef={fromRef}
          toRef={toRef}
          curvature={curvatures[index] || 0}
          duration={duration}
          delay={index * 0.5}
          pathColor={pathColor}
        />
      ))}
    </>
  );
}

export default AnimatedBeam;




