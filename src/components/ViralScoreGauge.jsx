import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';

/**
 * Premium Circular Gauge for Viral Score
 * Color-coded: Green (>85), Yellow (>70), Red (<=70)
 * Animated counting from 0 to target score
 */
export default function ViralScoreGauge({ score = 0 }) {
  const [displayScore, setDisplayScore] = useState(0);
  
  // Animate counting up effect
  useEffect(() => {
    if (score === 0) return;
    
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = score / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(increment * currentStep));
      }
    }, stepDuration);
    
    return () => clearInterval(timer);
  }, [score]);

  // Color coding based on score
  const getScoreColor = (value) => {
    if (value > 85) return { primary: '#10b981', secondary: '#34d399', gradient: 'from-green-500 to-emerald-400' };
    if (value > 70) return { primary: '#f59e0b', secondary: '#fbbf24', gradient: 'from-amber-500 to-yellow-400' };
    return { primary: '#ef4444', secondary: '#f87171', gradient: 'from-red-500 to-rose-400' };
  };

  const colors = getScoreColor(displayScore);
  const circumference = 2 * Math.PI * 80; // radius = 80
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Circular Gauge */}
      <div className="relative w-56 h-56">
        {/* Background Circle */}
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 200 200">
          {/* Background track */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(229, 231, 235, 0.3)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Animated progress circle */}
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={`url(#gradient-${displayScore})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-out',
              filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.1))'
            }}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${displayScore}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.secondary} />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg mb-2 animate-pulse`}>
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div className="text-5xl font-bold text-gray-900 tabular-nums tracking-tight">
            {displayScore}
          </div>
          <div className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-1">
            /100
          </div>
        </div>
      </div>
      
      {/* Label */}
      <div className="mt-4 text-center">
        <h3 className="text-lg font-bold text-gray-900">Viral Potential Score</h3>
        <p className="text-xs text-gray-500 mt-1">
          {displayScore > 85 ? '🔥 Excellent' : displayScore > 70 ? '⚡ Good' : '💡 Improvable'}
        </p>
      </div>
    </div>
  );
}





