import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * MagicCard - Card with interactive spotlight effect that follows cursor
 * Creates a premium, glassmorphism-style card with mouse tracking
 */
export function MagicCard({ 
  children, 
  className = "",
  gradientSize = 200,
  gradientColor = "rgba(1, 186, 210, 0.15)",
  gradientOpacity = 0.8,
  gradientFrom = "#01bad2",
  gradientTo = "#2B8FC7",
  borderRadius = "1.5rem"
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX.set(x);
    mouseY.set(y);
    setMousePosition({ x, y });
  };

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden bg-white ${className}`}
      style={{ borderRadius }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Border gradient effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}20)`,
          opacity: isHovered ? 1 : 0,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Animated border */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius,
          border: '2px solid transparent',
          background: isHovered 
            ? `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${gradientFrom}, ${gradientTo}) border-box`
            : 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e2e8f0, #e2e8f0) border-box',
        }}
        animate={{ 
          opacity: 1,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Spotlight effect */}
      {isHovered && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: gradientSize,
            height: gradientSize,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${gradientColor} 0%, transparent 70%)`,
            left: mouseXSpring,
            top: mouseYSpring,
            x: '-50%',
            y: '-50%',
            opacity: gradientOpacity,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: gradientOpacity, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      {/* Shimmer sweep effect on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)',
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: isHovered ? ['200% 0%', '-200% 0%'] : '200% 0%',
        }}
        transition={{
          duration: 1.5,
          ease: 'easeInOut',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

export default MagicCard;


