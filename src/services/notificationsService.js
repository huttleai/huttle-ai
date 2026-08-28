/*
 * notificationsService — General Notification System
 *
 * Reads from the `notifications` table in Supabase.
 * Notifications are written SERVER-SIDE ONLY (admin SQL or
 * server functions). The client only reads, marks read, and dismisses.
 *
 * HOW TO SEND A FUTURE NOTIFICATION TO ALL USERS:
 * Run this SQL in Supabase SQL Editor:
 *
 *   INSERT INTO notifications (user_id, type, title, message, cta_label, cta_url)
 *   SELECT id, '[type]', '[title]', '[message]', '[cta_label]', '[cta_url]'
 *   FROM auth.users
 *   WHERE email IS NOT NULL AND email != 'admin@huttleai.com';
 *
 * HOW TO TARGET SPECIFIC USERS (e.g. users missing a field):
 *   INSERT INTO notifications (user_id, type, title, message, cta_label, cta_url)
 *   SELECT u.id, '[type]', '[title]', '[message]', '[cta_label]', '[cta_url]'
 *   FROM auth.users u
 *   LEFT JOIN user_preferences up ON u.id = up.user_id
 *   WHERE (up.[field] IS NULL OR up.[field] = '');
 *
 * NOTIFICATION TYPES (add new types here as they are created):
 *   'brand_voice_update' — prompts user to update Brand Voice settings
 *
 * AUTO-DISMISS PATTERN:
 *   To make a notification auto-dismiss when a condition is met,
 *   add a watcher in NotificationContext that monitors the relevant
 *   BrandContext or SubscriptionContext field and calls
 *   dismissNotification() when the condition is satisfied.
 */

import { supabase } from '../config/supabase';

/**
 * @param {string} userId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchNotifications(userId) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[notificationsService] fetchNotifications:', error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[notificationsService] fetchNotifications:', e);
    return [];
  }
}

/**
 * @param {string} notificationId
 * @returns {Promise<boolean>}
 */
export async function markAsRead(notificationId) {
  if (!notificationId) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[notificationsService] markAsRead:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[notificationsService] markAsRead:', e);
    return false;
  }
}

/**
 * @param {string} notificationId
 * @returns {Promise<boolean>}
 */
export async function dismissNotification(notificationId) {
  if (!notificationId) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ dismissed: true, read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[notificationsService] dismissNotification:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[notificationsService] dismissNotification:', e);
    return false;
  }
}

/**
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function markAllAsRead(userId) {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('[notificationsService] markAllAsRead:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[notificationsService] markAllAsRead:', e);
    return false;
  }
}
