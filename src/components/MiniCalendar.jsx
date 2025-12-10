import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../context/ContentContext';

export default function MiniCalendar({ onDateClick }) {
  const navigate = useNavigate();
  const { scheduledPosts } = useContent();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  // Get posts count for each day
  const postsPerDay = useMemo(() => {
    const counts = {};
    scheduledPosts.forEach(post => {
      if (post.scheduledDate) {
        const dateStr = post.scheduledDate;
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });
    return counts;
  }, [scheduledPosts]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (onDateClick) {
      onDateClick(dateStr);
    } else {
      navigate('/calendar', { state: { date: dateStr, view: 'day' } });
    }
  };

  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const getPostCount = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return postsPerDay[dateStr] || 0;
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button 
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-huttle-blue" />
          <span className="text-sm font-semibold text-gray-900">
            {monthNames[month]} {year}
          </span>
        </div>
        <button 
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 border-b border-gray-50">
        {dayNames.map((day, i) => (
          <div key={i} className="p-2 text-center text-[10px] font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 p-2 gap-1">
        {/* Empty cells */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const postCount = getPostCount(day);
          const today = isToday(day);
          
          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium
                transition-all duration-150 relative group
                ${today 
                  ? 'bg-white border-2 border-huttle-cyan shadow-sm' 
                  : postCount > 0
                    ? 'bg-huttle-cyan-light text-huttle-blue hover:bg-huttle-cyan/20'
                    : 'hover:bg-gray-50 text-gray-700'
                }
              `}
              style={today ? { color: '#01bad2' } : {}}
            >
              <span>{day}</span>
              {postCount > 0 && !today && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {Array.from({ length: Math.min(postCount, 3) }).map((_, idx) => (
                    <div key={idx} className="w-1 h-1 rounded-full bg-huttle-blue" />
                  ))}
                </div>
              )}
              
              {/* Quick add on hover */}
              {!today && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3 text-huttle-blue opacity-50" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-huttle-blue" />
          <span className="text-[10px] text-gray-500 font-medium">Posts scheduled</span>
        </div>
        <button
          onClick={() => navigate('/calendar')}
          className="text-[10px] text-huttle-blue font-medium hover:underline"
        >
          Full Calendar →
        </button>
      </div>
    </div>
  );
}
