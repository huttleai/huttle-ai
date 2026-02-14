import React, { useRef, useState } from 'react';

/**
 * MagicCard - Card with interactive spotlight effect that follows cursor
 * Optimized: Only runs animations on hover (no continuous framer-motion)
 * Uses CSS transitions instead of framer-motion for hover effects
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

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden bg-white transition-all duration-300 ${isHovered ? '-translate-y-2 scale-[1.02]' : ''} ${className}`}
      style={{ borderRadius }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Border gradient effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          borderRadius,
          background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}20)`,
          opacity: isHovered ? 1 : 0,
        }}
      />
      
      {/* Border */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{
          borderRadius,
          border: '2px solid transparent',
          background: isHovered 
            ? `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${gradientFrom}, ${gradientTo}) border-box`
            : 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e2e8f0, #e2e8f0) border-box',
        }}
      />
      
      {/* Spotlight effect - only renders when hovered */}
      {isHovered && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: gradientSize,
            height: gradientSize,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${gradientColor} 0%, transparent 70%)`,
            left: mousePosition.x - gradientSize / 2,
            top: mousePosition.y - gradientSize / 2,
            opacity: gradientOpacity,
            transition: 'left 0.1s ease-out, top 0.1s ease-out',
          }}
        />
      )}
      
      {/* Shimmer sweep effect - only on hover via CSS */}
      <div
        className={`absolute inset-0 pointer-events-none ${isHovered ? 'magic-shimmer-active' : ''}`}
        style={{
          background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%)',
          backgroundSize: '200% 100%',
          backgroundPosition: '200% 0%',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      <style>{`
        .magic-shimmer-active {
          animation: magic-shimmer 1.5s ease-in-out forwards;
        }
        @keyframes magic-shimmer {
          from { background-position: 200% 0%; }
          to { background-position: -200% 0%; }
        }
      `}</style>
    </div>
  );
}

export default MagicCard;
