import { useEffect, useRef, useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { hasProfileContext } from '../utils/brandContextBuilder';

const reminderStorageKey = (userId) => `huttle_brand_profile_reminder_day:${userId}`;

/**
 * useNotificationGenerator
 *
 * Daily in-app reminder (notification bell) when Brand Profile is still incomplete.
 * Intentionally does not spam the same CTA across every page — users see one link on
 * the Dashboard header + this daily nudge until they finish setup.
 */
export default function useNotificationGenerator() {
  const { brandData, brandFetchComplete } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addNotification } = useNotifications();
  const attemptedForDayRef = useRef('');

  useEffect(() => {
    if (!user?.id || !brandFetchComplete || !brandData) return;

    if (hasProfileContext(brandData)) {
      attemptedForDayRef.current = '';
      try {
        localStorage.removeItem(reminderStorageKey(user.id));
      } catch {
        /* ignore */
      }
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (attemptedForDayRef.current === today) return;

    const lastScheduled = localStorage.getItem(reminderStorageKey(user.id));
    if (lastScheduled === today) {
      attemptedForDayRef.current = today;
      return;
    }

    const dateLabel = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    addNotification({
      type: 'info',
      title: `Brand Profile — ${dateLabel}`,
      message:
        'Daily reminder: add your niche, audience, and platforms so AI can personalize your experience. Open Brand Profile from the sidebar (Account).',
      actionUrl: '/dashboard/brand-voice',
      actionLabel: 'Open Brand Profile',
      dismissKey: `brand_profile_reminder_${today}`,
      persistent: true,
    });

    attemptedForDayRef.current = today;
    localStorage.setItem(reminderStorageKey(user.id), today);
  }, [user?.id, brandData, brandFetchComplete, addNotification]);
}
