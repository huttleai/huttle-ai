import { useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useContent } from '../context/ContentContext';

export function usePostReminders() {
  const { addPostReminder } = useNotifications();
  const { scheduledPosts } = useContent();
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const checkUpcomingPosts = () => {
    const now = new Date();

    scheduledPosts.forEach(post => {
      if (!post.scheduledDate || !post.scheduledTime) return;

      const postDateTime = new Date(`${post.scheduledDate}T${post.scheduledTime}`);
      const minutesUntil = Math.floor((postDateTime - now) / 1000 / 60);

      // Notify at 30 minutes, 15 minutes, and 5 minutes before
      if ([30, 15, 5].includes(minutesUntil)) {
        // Check if we haven't already notified for this time
        const notificationKey = `reminder_${post.id}_${minutesUntil}`;
        if (!localStorage.getItem(notificationKey)) {
          addPostReminder(post, minutesUntil);
          localStorage.setItem(notificationKey, 'true');
          
          // Clear this notification key after the time has passed
          const timeout = setTimeout(() => {
            localStorage.removeItem(notificationKey);
          }, 120000); // Clear after 2 minutes
          timeoutsRef.current.push(timeout);
        }
      }

      // Notify when it's time to post (within 1 minute)
      if (minutesUntil === 0) {
        const notificationKey = `reminder_${post.id}_now`;
        if (!localStorage.getItem(notificationKey)) {
          addPostReminder(post, 0);
          localStorage.setItem(notificationKey, 'true');
          
          // Clear after 5 minutes
          const timeout = setTimeout(() => {
            localStorage.removeItem(notificationKey);
          }, 300000);
          timeoutsRef.current.push(timeout);
        }
      }
    });
    };

    // Check for upcoming posts every minute
    const interval = setInterval(() => {
      checkUpcomingPosts();
    }, 60000); // Check every minute

    // Initial check
    checkUpcomingPosts();

    return () => {
      clearInterval(interval);
      // Clear all pending timeouts
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, [scheduledPosts, addPostReminder]);
}

