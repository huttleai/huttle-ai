import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationBell() {
  const { unreadCount, setShowNotificationPanel } = useNotifications();

  return (
    <button
      onClick={() => setShowNotificationPanel(true)}
      className="relative p-2.5 hover:bg-gray-100 rounded-lg transition-all group"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-huttle-primary' : 'text-gray-700'}`} />
      {unreadCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
          <span className="absolute inset-0 rounded-lg bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity"></span>
        </>
      )}
    </button>
  );
}

