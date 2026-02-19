import { useEffect, useRef, useContext } from 'react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useContent } from '../context/ContentContext';

/** localStorage key for tracking which notification types have been shown */
const NOTIF_SHOWN_KEY = 'huttle_notif_shown';

/**
 * Get the set of notification keys that have already been shown to this user.
 * @returns {Set<string>}
 */
function getShownKeys() {
  try {
    const raw = localStorage.getItem(NOTIF_SHOWN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Mark a notification key as shown so it won't be regenerated.
 * @param {string} key
 */
function markShown(key) {
  const shown = getShownKeys();
  shown.add(key);
  localStorage.setItem(NOTIF_SHOWN_KEY, JSON.stringify([...shown]));
}

/**
 * useNotificationGenerator
 *
 * Runs on mount and periodically to generate contextual notifications:
 * 1. Welcome message for new users
 * 2. Onboarding nudges (incomplete Brand Voice, no platforms)
 * 3. Scheduled post reminders (upcoming posts within 30 min)
 * 4. Post confirmations (triggered externally via schedulePost)
 */
export default function useNotificationGenerator() {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addNotification, addPostReminder } = useNotifications();
  const { scheduledPosts } = useContent();
  const generatedRef = useRef(false);
  const reminderIntervalRef = useRef(null);

  // ──────────────── One-time notifications on mount ────────────────
  useEffect(() => {
    if (!user?.id || generatedRef.current) return;
    generatedRef.current = true;

    const shown = getShownKeys();

    // 1. Onboarding nudges — Brand Voice incomplete
    if (!shown.has('onboard_brandvoice') && brandData) {
      const hasName = !!(brandData.firstName || brandData.brandName);
      const hasNiche = !!brandData.niche;
      const hasVoice = !!brandData.brandVoice;

      if (!hasName || !hasNiche || !hasVoice) {
        addNotification({
          type: 'info',
          title: 'Complete your Brand Voice',
          message: 'Personalize your AI content by finishing your Brand Voice setup — add your niche, audience, and tone.',
          action: () => { window.location.href = '/dashboard/brand-voice'; },
          actionLabel: 'Complete Now',
          persistent: true,
        });
        markShown('onboard_brandvoice');
      }
    }

    // 2. Onboarding nudge — No platforms selected
    if (!shown.has('onboard_platforms') && brandData) {
      const platforms = brandData.platforms || [];
      if (platforms.length === 0) {
        addNotification({
          type: 'info',
          title: 'Select your platforms',
          message: 'Choose your preferred social media platforms in Brand Voice settings for tailored content.',
          action: () => { window.location.href = '/dashboard/brand-voice'; },
          actionLabel: 'Select Platforms',
          persistent: true,
        });
        markShown('onboard_platforms');
      }
    }
  }, [user?.id, brandData]);

  // ──────────────── Scheduled post reminders (runs every minute) ────────────────
  useEffect(() => {
    if (!scheduledPosts || scheduledPosts.length === 0) return;

    const checkUpcoming = () => {
      const now = new Date();
      const remindedKey = 'huttle_reminded_posts';
      let reminded;
      try {
        reminded = new Set(JSON.parse(localStorage.getItem(remindedKey) || '[]'));
      } catch {
        reminded = new Set();
      }

      scheduledPosts.forEach(post => {
        if (post.status === 'posted' || post.status === 'cancelled') return;

        const postDate = post.date || post.scheduledDate;
        const postTime = post.time || post.scheduledTime;
        if (!postDate || !postTime) return;

        const [year, month, day] = postDate.split('-').map(Number);
        const [hours, minutes] = postTime.split(':').map(Number);
        const scheduledAt = new Date(year, month - 1, day, hours, minutes);
        const minutesUntil = (scheduledAt - now) / (1000 * 60);

        // Remind at 30, 15, and 5 minutes before
        const thresholds = [30, 15, 5];
        for (const threshold of thresholds) {
          const key = `${post.id}_${threshold}`;
          if (minutesUntil > 0 && minutesUntil <= threshold && !reminded.has(key)) {
            addPostReminder(post, Math.round(minutesUntil));
            reminded.add(key);
          }
        }
      });

      localStorage.setItem(remindedKey, JSON.stringify([...reminded]));
    };

    // Check immediately, then every 60 seconds
    checkUpcoming();
    reminderIntervalRef.current = setInterval(checkUpcoming, 60000);

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
      }
    };
  }, [scheduledPosts]);
}
