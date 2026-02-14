import { createContext, useState, useContext, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, CheckCircle, Info, X, ExternalLink } from 'lucide-react';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('huttleNotifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      } catch (e) {
        console.error('Error loading notifications:', e);
      }
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('huttleNotifications', JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  /**
   * Add a notification
   * @param {Object} notification - { type, title, message, action, actionLabel, persistent }
   */
  const addNotification = (notification) => {
    // Deduplicate: skip if a notification with the same title already exists and is unread
    const isDuplicate = notifications.some(
      n => n.title === notification.title && !n.read
    );
    if (isDuplicate) return null;

    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    setNotifications(prev => {
      // Keep a max of 50 notifications to prevent unbounded growth
      const updated = [newNotification, ...prev];
      return updated.slice(0, 50);
    });

    return newNotification.id;
  };

  /**
   * Add a post reminder notification
   */
  const addPostReminder = (post, minutesUntil) => {
    return addNotification({
      type: 'reminder',
      title: minutesUntil === 0 ? `Time to post: ${post.title}` : `Upcoming: ${post.title}`,
      message: minutesUntil === 0 
        ? `Your post is ready to publish on ${post.platforms?.join(', ')}!` 
        : `Your post is scheduled in ${minutesUntil} minutes for ${post.platforms?.join(', ')}`,
      action: () => {
        window.location.href = '/calendar';
      },
      actionLabel: 'View Post',
      persistent: true,
      postId: post.id,
    });
  };

  /**
   * Add a connection warning
   */
  const addConnectionWarning = (platform) => {
    return addNotification({
      type: 'warning',
      title: `${platform} not connected`,
      message: `Connect your ${platform} account to post directly from Huttle AI`,
      action: () => {
        window.location.href = '/settings';
      },
      actionLabel: 'Connect Now',
      persistent: true,
    });
  };

  /**
   * Add a missing content warning
   */
  const addMissingContentWarning = (post, missingFields) => {
    return addNotification({
      type: 'error',
      title: 'Post incomplete',
      message: `Missing: ${missingFields.join(', ')}`,
      action: () => {
        window.location.href = `/calendar`;
      },
      actionLabel: 'Fix Now',
      persistent: true,
    });
  };

  /**
   * Add a success notification
   */
  const addSuccess = (title, message) => {
    return addNotification({
      type: 'success',
      title,
      message,
      persistent: false,
    });
  };

  /**
   * Add an info notification
   */
  const addInfo = (title, message, action = null, actionLabel = null) => {
    return addNotification({
      type: 'info',
      title,
      message,
      action,
      actionLabel,
      persistent: false,
    });
  };

  /**
   * Add a dashboard panel update notification
   */
  const addPanelUpdate = (panelName, description) => {
    return addNotification({
      type: 'info',
      title: `${panelName} Updated`,
      message: description,
      action: () => {
        window.location.href = '/';
      },
      actionLabel: 'View Dashboard',
      persistent: false,
    });
  };

  /**
   * Add an AI usage limit warning
   */
  const addAIUsageWarning = (used, limit, percentage) => {
    let severity = 'info';
    let title = 'AI Usage Update';
    let message = `You've used ${used} of ${limit === Infinity ? 'unlimited' : limit} AI generations.`;

    if (percentage >= 100) {
      severity = 'error';
      title = 'AI Usage Limit Reached!';
      message = `You've used all ${limit} AI generations this month. Upgrade to Pro for unlimited AI access!`;
    } else if (percentage >= 95) {
      severity = 'error';
      title = 'AI Usage Almost Exhausted!';
      message = `You've used ${used} of ${limit} AI generations (${percentage}%). Only ${limit - used} remaining!`;
    } else if (percentage >= 75) {
      severity = 'warning';
      title = 'AI Usage Running Low';
      message = `You've used ${used} of ${limit} AI generations (${percentage}%). Consider upgrading for unlimited access.`;
    }

    return addNotification({
      type: severity,
      title,
      message,
      action: () => {
        window.location.href = '/subscription';
      },
      actionLabel: percentage >= 75 ? 'Upgrade Now' : 'View Plans',
      persistent: percentage >= 75,
    });
  };

  /**
   * Add a social update notification
   */
  const addSocialUpdate = (platform, title, impact) => {
    const impactColors = {
      high: 'error',
      medium: 'warning',
      low: 'info',
    };

    return addNotification({
      type: impactColors[impact] || 'info',
      title: `New ${platform} Update`,
      message: title,
      action: () => {
        window.location.href = '/social-updates';
      },
      actionLabel: 'View Update',
      persistent: impact === 'high',
    });
  };

  /**
   * Add an engagement spike notification
   */
  const addEngagementSpike = (platform, percentage, postTitle) => {
    return addNotification({
      type: 'success',
      title: `📈 Engagement Spike on ${platform}`,
      message: `${postTitle} is performing ${percentage}% better than average!`,
      action: () => {
        window.location.href = '/';
      },
      actionLabel: 'View Analytics',
      persistent: false,
    });
  };

  /**
   * Add a scheduled post reminder
   */
  const addScheduledPostReminder = (postCount, nextPostTime) => {
    return addNotification({
      type: 'reminder',
      title: `📅 ${postCount} Post${postCount !== 1 ? 's' : ''} Scheduled`,
      message: `Next post: ${nextPostTime}`,
      action: () => {
        window.location.href = '/calendar';
      },
      actionLabel: 'View Calendar',
      persistent: false,
    });
  };

  /**
   * Add a content performance insight
   */
  const addContentInsight = (insight, description) => {
    return addNotification({
      type: 'info',
      title: `💡 Insight: ${insight}`,
      message: description,
      action: () => {
        window.location.href = '/';
      },
      actionLabel: 'View Details',
      persistent: false,
    });
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showNotificationPanel,
        setShowNotificationPanel,
        addNotification,
        addPostReminder,
        addConnectionWarning,
        addMissingContentWarning,
        addSuccess,
        addInfo,
        addPanelUpdate,
        addAIUsageWarning,
        addSocialUpdate,
        addEngagementSpike,
        addScheduledPostReminder,
        addContentInsight,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
      <NotificationPanel />
    </NotificationContext.Provider>
  );
}

/**
 * Notification Panel Component
 */
function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    showNotificationPanel,
    setShowNotificationPanel,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  // Auto-mark all as read when the panel is opened
  useEffect(() => {
    if (showNotificationPanel && unreadCount > 0) {
      // Small delay so the user sees the unread styling briefly
      const timer = setTimeout(() => markAllAsRead(), 1500);
      return () => clearTimeout(timer);
    }
  }, [showNotificationPanel]);

  if (!showNotificationPanel) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-5 h-5 text-huttle-primary" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-huttle-primary" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={() => setShowNotificationPanel(false)}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6" />
              <h2 className="text-2xl font-bold text-white">Notifications</h2>
            </div>
            <button
              onClick={() => setShowNotificationPanel(false)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {unreadCount > 0 && (
            <p className="text-sm opacity-90">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex gap-2 p-4 border-b border-gray-200">
            <button
              onClick={markAllAsRead}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-all font-medium"
            >
              Mark all read
            </button>
            <button
              onClick={clearAll}
              className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all font-medium"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bell className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600 text-sm">You're all caught up! 🎉</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-all cursor-pointer ${
                    !notification.read ? 'bg-huttle-50 bg-opacity-50' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-huttle-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                        {notification.action && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              notification.action();
                              setShowNotificationPanel(false);
                            }}
                            className="text-xs font-medium text-huttle-primary hover:underline flex items-center gap-1"
                          >
                            {notification.actionLabel || 'View'}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-all"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

