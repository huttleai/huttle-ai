import { useState } from 'react';

export default function HoverPreview({ children, preview }) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    setIsHovered(true);
    updatePosition(e);
  };

  const handleMouseMove = (e) => {
    if (isHovered) {
      updatePosition(e);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const updatePosition = (e) => {
    const offsetX = 25;
    const offsetY = 15;
    let x = e.clientX + offsetX;
    let y = e.clientY + offsetY;
    
    // Keep preview on screen
    const previewWidth = 320;
    const previewHeight = 350; // Increased to account for taller content
    
    // Check right edge
    if (x + previewWidth > window.innerWidth) {
      x = e.clientX - previewWidth - offsetX;
    }
    
    // Check bottom edge - flip above cursor if would go off screen
    if (y + previewHeight > window.innerHeight) {
      y = e.clientY - previewHeight - offsetY;
    }
    
    // Ensure minimum distance from edges
    x = Math.max(10, Math.min(x, window.innerWidth - previewWidth - 10));
    y = Math.max(10, Math.min(y, window.innerHeight - previewHeight - 10));
    
    setPosition({ x, y });
  };

  if (!preview) {
    return children;
  }

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>
      
      {isHovered && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 99999,
          }}
        >
          {/* Outer glow effect */}
          <div className="absolute inset-0 bg-huttle-primary/20 blur-2xl rounded-xl"></div>
          
          {/* Main container with tech styling */}
          <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-xl min-w-[300px] max-w-md border-2 border-huttle-primary/60 shadow-2xl overflow-hidden hover-preview-glow">
            
            {/* Animated scan line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-huttle-primary to-transparent opacity-70 animate-scan-line"></div>
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.03] hover-preview-grid pointer-events-none"></div>
            
            {/* Tech HUD Header */}
            <div className="relative px-4 py-2 bg-gradient-to-r from-huttle-primary/10 via-huttle-primary/5 to-transparent border-b border-huttle-primary/20 flex items-center">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-huttle-primary rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-huttle-primary rounded-full animate-ping"></div>
                </div>
                <span className="text-[10px] text-huttle-primary font-semibold tracking-widest uppercase">Data Preview</span>
              </div>
            </div>
            
            {/* Content area */}
            <div className="relative p-5">
              <div className="hover-preview-content">
                {preview}
              </div>
            </div>
            
            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-huttle-primary/40 to-transparent"></div>
          </div>
          
          {/* Tech arrow indicator with layers */}
          <div className="absolute -left-2.5 top-6">
            <div className="relative">
              {/* Outer glow layer */}
              <div className="absolute inset-0 blur-sm">
                <div style={{
                  width: 0,
                  height: 0,
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  borderRight: '8px solid rgba(0, 186, 211, 0.4)',
                }}></div>
              </div>
              {/* Solid arrow */}
              <div style={{
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderRight: '7px solid white',
              }}></div>
              {/* Inner accent */}
              <div className="absolute top-[2px] left-[2px]" style={{
                width: 0,
                height: 0,
                borderTop: '3px solid transparent',
                borderBottom: '3px solid transparent',
                borderRight: '4px solid #00bad3',
              }}></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
