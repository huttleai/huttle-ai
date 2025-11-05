import { useState, useRef } from 'react';
import { Info, HelpCircle } from 'lucide-react';

export default function Tooltip({ 
  children, 
  content, 
  position = 'top',
  type = 'info', // 'info', 'help', 'warning'
  showIcon = true,
  delay = 300 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-t-gray-900';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-gray-900';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-gray-900';
      default:
        return 'top-full left-1/2 -translate-x-1/2 border-t-gray-900';
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (type) {
      case 'help':
        return <HelpCircle className="w-4 h-4 text-gray-400 hover:text-huttle-primary transition-colors" />;
      case 'warning':
        return <Info className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-400 hover:text-huttle-primary transition-colors" />;
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      {children}
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {getIcon()}
      </span>

      {isVisible && (
        <div className={`absolute z-50 ${getPositionClasses()}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 max-w-xs shadow-xl">
            {content}
            <div className={`absolute w-0 h-0 border-4 border-transparent ${getArrowClasses()}`} />
          </div>
        </div>
      )}
    </div>
  );
}

