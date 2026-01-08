import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function InteractiveHoverButton({ 
  children, 
  onClick, 
  className = "",
  disabled = false,
  type = "button"
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });

  const handleMouseMove = (e) => {
    if (!ref.current || disabled) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    // Update spring values for button tilt
    x.set(xPct * 20);
    y.set(yPct * 20);
    
    // Update mouse position for spotlight
    setMousePosition({ x: mouseX, y: mouseY });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`
        relative overflow-hidden rounded-2xl
        px-6 py-3 md:px-6 md:py-3.5
        font-bold text-sm md:text-base
        transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        x: mouseXSpring,
        y: mouseYSpring,
      }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {/* Base gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#2B8FC7] to-[#01bad2]"
        initial={false}
        animate={{
          opacity: isHovered ? 1 : 0.95,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Interactive spotlight that follows mouse */}
      {isHovered && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.4), transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      {/* Animated shimmer sweep */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: isHovered ? ['0% 0%', '100% 0%'] : '0% 0%',
        }}
        transition={{
          duration: 2,
          repeat: isHovered ? Infinity : 0,
          ease: 'linear',
        }}
      />
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2 text-white">
        {children}
      </span>
      
      {/* Glowing border effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: isHovered 
            ? '0 0 30px rgba(1,186,210,0.6), inset 0 0 30px rgba(255,255,255,0.1)' 
            : '0 0 0px rgba(1,186,210,0.3)',
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}

