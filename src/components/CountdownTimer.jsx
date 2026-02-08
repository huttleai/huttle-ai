import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Target date: February 11, 2026 at 12:00 PM EST
const TARGET_DATE = new Date('2026-02-11T12:00:00-05:00').getTime();

const CircularProgress = ({ value, max, label, size = 80, index }) => {
  const strokeWidth = size > 70 ? 4 : 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / max) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const displayValue = String(value).padStart(2, '0');

  return (
    <motion.div 
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.15, type: "spring", stiffness: 200 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200"
          />
        </svg>
        
        {/* Animated progress ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#01bad2" />
              <stop offset="100%" stopColor="#2B8FC7" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="text-xl md:text-3xl font-black text-slate-900 tabular-nums"
          >
            {displayValue}
          </motion.span>
        </div>
      </div>
      
      {/* Label */}
      <span className="mt-2 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </motion.div>
  );
};

export function CountdownTimer({ compact = false }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = TARGET_DATE - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  // Compact inline mode for hero section
  if (compact) {
    return (
      <motion.div
        className="inline-flex items-center gap-1.5 md:gap-2 text-base md:text-lg font-bold text-slate-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <span className="tabular-nums">{String(timeLeft.days).padStart(2, '0')}d</span>
        <span className="text-slate-400">:</span>
        <span className="tabular-nums">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="text-slate-400">:</span>
        <span className="tabular-nums">{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span className="text-slate-400">:</span>
        <span className="tabular-nums">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </motion.div>
    );
  }

  const size = isMobile ? 64 : 75;

  return (
    <motion.div 
      className="flex flex-col items-center text-[13px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Label */}
      <motion.div 
        className="mb-3 md:mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-xs md:text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
          Founding Member Access In
        </span>
      </motion.div>

      {/* Circular timers */}
      <div className="flex items-center gap-3 md:gap-4">
        <CircularProgress value={timeLeft.days} max={30} label="Days" size={size} index={0} />
        <CircularProgress value={timeLeft.hours} max={24} label="Hours" size={size} index={1} />
        <CircularProgress value={timeLeft.minutes} max={60} label="Min" size={size} index={2} />
        <CircularProgress value={timeLeft.seconds} max={60} label="Sec" size={size} index={3} />
      </div>
    </motion.div>
  );
}

export default CountdownTimer;
