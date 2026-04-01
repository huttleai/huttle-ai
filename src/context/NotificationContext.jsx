import { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, AlertTriangle, CheckCircle, Info, X, ExternalLink, Sparkles, Zap } from 'lucide-react';
import { safeReadJson, safeWriteJson } from '../utils/storageHelpers';
import { AuthContext } from './AuthContext';
import {
  fetchNotifications as fetchNotificationsFromDb,
  markAsRead as markServerNotificationRead,
  dismissNotification as dismissServerNotification,
  markAllAsRead as markAllServerNotificationsRead,
} from '../services/notificationsService';

const NOTIFICATION_SOURCE_SUPABASE = 'supabase';
const NOTIFICATION_SOURCE_LOCAL = 'local';

const NotificationContext = createContext();

function getNotificationStorageKey(userId) {
  return userId ? `huttleNotifications:${userId}` : null;
}

function getDismissalStorageKey(userId) {
  return userId ? `huttleDismissed:${userId}` : null;
}

function mapServerRowToPanel(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: Boolean(row.read),
    timestamp: row.created_at,
    actionUrl: row.cta_url || null,
    actionLabel: row.cta_label || null,
    cta_url: row.cta_url ?? null,
    cta_label: row.cta_label ?? null,
    _source: NOTIFICATION_SOURCE_SUPABASE,
    created_at: row.created_at,
  };
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.user?.id || null;
  const prevUserIdRef = useRef(currentUserId);

  const [localNotifications, setLocalNotifications] = useState([]);
  const [serverNotifications, setServerNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const notifications = useMemo(() => {
    const server = serverNotifications.map(mapServerRowToPanel);
    return [...server, ...localNotifications];
  }, [serverNotifications, localNotifications]);

  const refreshNotifications = useCallback(async () => {
    if (!currentUserId) {
      setServerNotifications([]);
      return;
    }
    const rows = await fetchNotificationsFromDb(currentUserId);
    const list = Array.isArray(rows) ? rows : [];
    setServerNotifications(list);
  }, [currentUserId]);

  // Clear stale data and reload locals when user changes (sign-out, different account)
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    if (prevId !== currentUserId) {
      setLocalNotifications([]);
      setServerNotifications([]);
      setUnreadCount(0);
      setShowNotificationPanel(false);
    }

    const storageKey = getNotificationStorageKey(currentUserId);
    if (storageKey) {
      const parsed = safeReadJson(localStorage, storageKey, []);
      if (Array.isArray(parsed)) {
        setLocalNotifications(parsed);
      }
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setServerNotifications([]);
      return;
    }
    void refreshNotifications();
  }, [currentUserId, refreshNotifications]);

  // Persist local notifications to user-scoped localStorage
  useEffect(() => {
    const storageKey = getNotificationStorageKey(currentUserId);
    if (storageKey) {
      safeWriteJson(localStorage, storageKey, localNotifications, { maxBytes: 1_500_000 });
    }
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [localNotifications, notifications, currentUserId]);

  /**
   * Add a notification
   * @param {Object} notification - { type, title, message, action, actionLabel, persistent }
   */
  const addNotification = (notification) => {
    const dismissKeyEarly = notification.dismissKey || notification.title;
    const isDuplicate = localNotifications.some(
      (n) =>
        (dismissKeyEarly && n.dismissKey === dismissKeyEarly)
        || (n.title === notification.title && !n.read),
    );
    if (isDuplicate) return null;

    const dismissKey = dismissKeyEarly;
    const dismissStorageKey = getDismissalStorageKey(currentUserId);
    if (dismissKey && dismissStorageKey) {
      try {
        const dismissed = new Set(JSON.parse(localStorage.getItem(dismissStorageKey) || '[]'));
        if (dismissed.has(dismissKey)) return null;
      } catch { /* ignore */ }
    }

    const newNotification = {
      ...notification,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      _source: NOTIFICATION_SOURCE_LOCAL,
    };

    setLocalNotifications((prev) => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, 50);
    });

    return newNotification.id;
  };

  const addConnectionWarning = (platform) => {
    return addNotification({
      type: 'warning',
      title: `${platform} not connected`,
      message: `Connect your ${platform} account to post directly from Huttle AI`,
      actionUrl: '/dashboard/settings',
      actionLabel: 'Connect Now',
      persistent: true,
    });
  };

  const addMissingContentWarning = (post, missingFields) => {
    return addNotification({
      type: 'error',
      title: 'Post incomplete',
      message: `Missing: ${missingFields.join(', ')}`,
      actionUrl: '/dashboard',
      actionLabel: 'Fix Now',
      persistent: true,
    });
  };

  const addSuccess = (title, message) => {
    return addNotification({
      type: 'success',
      title,
      message,
      persistent: false,
    });
  };

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

  const addPanelUpdate = (panelName, description) => {
    return addNotification({
      type: 'info',
      title: `${panelName} Updated`,
      message: description,
      actionUrl: '/dashboard',
      actionLabel: 'View Dashboard',
      persistent: false,
    });
  };

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
      actionUrl: '/dashboard/subscription',
      actionLabel: percentage >= 75 ? 'Upgrade Now' : 'View Plans',
      persistent: percentage >= 75,
    });
  };

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
      actionUrl: '/dashboard/social-updates',
      actionLabel: 'View Update',
      persistent: impact === 'high',
    });
  };

  const addEngagementSpike = (platform, percentage, postTitle) => {
    return addNotification({
      type: 'success',
      title: `📈 Engagement Spike on ${platform}`,
      message: `${postTitle} is performing ${percentage}% better than average!`,
      actionUrl: '/dashboard',
      actionLabel: 'View Analytics',
      persistent: false,
    });
  };

  const addContentInsight = (insight, description) => {
    return addNotification({
      type: 'info',
      title: `💡 Insight: ${insight}`,
      message: description,
      actionUrl: '/dashboard',
      actionLabel: 'View Details',
      persistent: false,
    });
  };

  const markAsRead = useCallback((id) => {
    const idStr = id != null ? String(id) : '';
    const serverMatch = serverNotifications.find((n) => String(n.id) === idStr);
    if (serverMatch) {
      setServerNotifications((prev) =>
        prev.map((n) => (String(n.id) === idStr ? { ...n, read: true } : n)),
      );
      void markServerNotificationRead(idStr).then((ok) => {
        if (ok) void refreshNotifications();
      });
      return;
    }

    setLocalNotifications((prev) =>
      prev.map((n) => (String(n.id) === idStr ? { ...n, read: true } : n)),
    );
  }, [serverNotifications, refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (currentUserId) {
      setServerNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await markAllServerNotificationsRead(currentUserId);
      void refreshNotifications();
    }
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [currentUserId, refreshNotifications]);

  const dismissNotification = useCallback(async (notificationId) => {
    const idStr = notificationId != null ? String(notificationId) : '';
    const serverMatch = serverNotifications.some((n) => String(n.id) === idStr);
    if (serverMatch) {
      setServerNotifications((prev) => prev.filter((n) => String(n.id) !== idStr));
      await dismissServerNotification(idStr);
      void refreshNotifications();
      return;
    }

    setLocalNotifications((prev) => {
      const target = prev.find((n) => String(n.id) === idStr);
      const dismissStorageKey = getDismissalStorageKey(currentUserId);
      if (target?.dismissKey && dismissStorageKey) {
        try {
          const dismissed = new Set(JSON.parse(localStorage.getItem(dismissStorageKey) || '[]'));
          dismissed.add(target.dismissKey);
          localStorage.setItem(dismissStorageKey, JSON.stringify([...dismissed]));
        } catch { /* ignore */ }
      }
      return prev.filter((n) => String(n.id) !== idStr);
    });
  }, [serverNotifications, currentUserId, refreshNotifications]);

  const removeNotification = useCallback((id) => {
    dismissNotification(id);
  }, [dismissNotification]);

  const clearAll = useCallback(() => {
    setLocalNotifications([]);
  }, []);

  const value = useMemo(() => ({
    notifications,
    localNotifications,
    unreadCount,
    showNotificationPanel,
    setShowNotificationPanel,
    addNotification,
    addConnectionWarning,
    addMissingContentWarning,
    addSuccess,
    addInfo,
    addPanelUpdate,
    addAIUsageWarning,
    addSocialUpdate,
    addEngagementSpike,
    addContentInsight,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    removeNotification,
    clearAll,
    refreshNotifications,
  }), [
    notifications,
    localNotifications,
    unreadCount,
    showNotificationPanel,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    removeNotification,
    clearAll,
    refreshNotifications,
  ]);

  return (
    <NotificationContext.Provider value={value}>
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
    dismissNotification,
    clearAll,
    localNotifications,
  } = useNotifications();
  const navigate = useNavigate();

  // Auto-mark all as read when the panel is opened
  useEffect(() => {
    if (showNotificationPanel && unreadCount > 0) {
      const timer = setTimeout(() => {
        void markAllAsRead();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showNotificationPanel, unreadCount, markAllAsRead]);

  if (!showNotificationPanel) return null;

  const getIcon = (notification) => {
    if (notification._source === NOTIFICATION_SOURCE_SUPABASE) {
      const Icon = notification.type === 'brand_voice_update' ? Sparkles : Zap;
      return <Icon className="w-5 h-5 text-amber-500" />;
    }
    switch (notification.type) {
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

  const hasLocal = localNotifications.length > 0;

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
              onClick={() => void markAllAsRead()}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-all font-medium"
            >
              Mark all read
            </button>
            {hasLocal && (
              <button
                onClick={clearAll}
                className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all font-medium"
              >
                Clear all
              </button>
            )}
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
              {notifications.map((notification) => {
                const unreadClasses = !notification.read
                  ? 'bg-huttle-50 bg-opacity-50 border-l-4 border-l-amber-400'
                  : '';
                const ctaUrl = notification.cta_url || notification.actionUrl;
                const ctaLabel = notification.cta_label || notification.actionLabel;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-all cursor-pointer ${unreadClasses}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex gap-3 relative">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-huttle-primary rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="text-xs text-gray-500">
                            {getTimeAgo(notification.timestamp)}
                          </span>
                          {(notification.action || ctaUrl) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof notification.action === 'function') {
                                  notification.action();
                                } else if (ctaUrl) {
                                  navigate(ctaUrl);
                                }
                                setShowNotificationPanel(false);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors w-fit"
                            >
                              {ctaLabel || 'View'}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void dismissNotification(notification.id);
                        }}
                        className="absolute top-0 right-0 p-1 hover:bg-gray-200 rounded transition-all"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
