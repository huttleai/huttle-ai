import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const { unreadCount, setShowNotificationPanel } = useNotifications();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={() => setShowNotificationPanel(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative p-3 hover:bg-gray-50 rounded-lg transition-all duration-150 group min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell 
        className={`w-5 h-5 transition-all duration-150 ${
          unreadCount > 0 
            ? 'text-huttle-blue' 
            : 'text-gray-500 group-hover:text-gray-700'
        } ${isHovered ? 'scale-110' : ''} ${unreadCount > 0 && isHovered ? 'bell-wiggle' : ''}`} 
      />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
