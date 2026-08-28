import React, { useState, useEffect } from 'react';

function getRemainingTime(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * CountdownTimer — displays a live DAYS / HRS / MIN / SEC countdown.
 * @param {string} targetDate — ISO date string (e.g. "2026-04-13T23:59:00-05:00")
 */
export function CountdownTimer({ targetDate }) {
  const [time, setTime] = useState(() => getRemainingTime(targetDate));

  useEffect(() => {
    const id = setInterval(() => setTime(getRemainingTime(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!time) {
    return (
      <p className="text-red-600 font-bold text-lg text-center">This offer has ended</p>
    );
  }

  const units = [
    { label: 'DAYS', value: time.days },
    { label: 'HRS', value: time.hours },
    { label: 'MIN', value: time.minutes },
    { label: 'SEC', value: time.seconds },
  ];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {units.map(({ label, value }, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center min-w-[56px] sm:min-w-[72px]">
            <span className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tabular-nums leading-none">
              {String(value).padStart(2, '0')}
            </span>
            <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1.5">
              {label}
            </span>
          </div>
          {i < 3 && (
            <span className="text-3xl sm:text-4xl font-black text-slate-300 mb-5 select-none">:</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
