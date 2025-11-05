# Smart Calendar Supabase Integration - Setup Guide

## Overview

The Smart Calendar has been upgraded with full Supabase integration, providing:
- **Cloud sync** across all your devices
- **Automatic data migration** from localStorage
- **Timezone support** for accurate scheduling
- **Status tracking** (draft, scheduled, posted, etc.)
- **Optimistic UI updates** for instant feedback
- **Offline detection** with automatic sync when reconnected

---

## 📋 Prerequisites

Before setting up, ensure you have:
- Completed basic Supabase setup (see `SUPABASE-N8N-SETUP.md`)
- Supabase project URL and anon key configured in `.env`
- User authentication working (AuthContext)

---

## 🗄️ Step 1: Run Database Migration

### 1.1 Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** from the left sidebar
3. Click **New query**

### 1.2 Execute the Migration

1. Open `supabase-scheduled-posts-schema.sql` from your project root
2. Copy the entire SQL script
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected output:** You should see success messages for:
- Table columns added
- Constraint created
- Indexes created
- Triggers created
- User preferences table created
- RLS policies enabled

### 1.3 Verify Migration

Run this query to verify the schema:

```sql
-- Check scheduled_posts columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scheduled_posts' 
ORDER BY ordinal_position;

-- Check user_preferences table
SELECT * FROM user_preferences LIMIT 1;
```

You should see columns like: `title`, `caption`, `platforms`, `timezone`, `status`, etc.

---

## ✅ Step 2: Test the Integration

### 2.1 Automatic Migration

The app will automatically migrate existing localStorage data to Supabase:

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Log in as a user**
   - Navigate to the app
   - Log in with your credentials

3. **Check for migration toast**
   - If you had posts in localStorage, you'll see:
   - "Migrating X posts to cloud..."
   - "Successfully migrated X posts!"

4. **Verify in Supabase**
   ```sql
   SELECT id, title, scheduled_for, status 
   FROM public.scheduled_posts 
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC;
   ```

### 2.2 Create a New Post

1. Go to **Smart Calendar**
2. Click **Schedule Post**
3. Fill in post details
4. Click **Schedule**
5. Post should appear immediately (optimistic update)
6. Check Supabase to confirm it was saved

### 2.3 Test Sync Indicator

1. Create or edit a post
2. Watch for the "Syncing..." indicator in the calendar header
3. Indicator should disappear when sync completes

---

## 🌍 Step 3: Timezone Configuration (Optional)

Users can set their preferred timezone:

### Default Behavior
- Auto-detects user timezone from browser
- Stores in `user_preferences` table
- Converts all display times to user timezone

### Future Enhancement
You can add a timezone selector in Settings:

```javascript
import { getCommonTimezones } from '../utils/timezoneHelpers';
import { saveUserPreferences } from '../config/supabase';

// In Settings component
const timezones = getCommonTimezones();

<select onChange={(e) => handleTimezoneChange(e.target.value)}>
  {timezones.map(tz => (
    <option key={tz.value} value={tz.value}>
      {tz.label}
    </option>
  ))}
</select>
```

---

## 📊 Step 4: Monitor & Maintain

### View Storage Usage

```sql
-- Total posts per user
SELECT 
  u.email,
  COUNT(sp.id) as total_posts,
  COUNT(CASE WHEN sp.status = 'scheduled' THEN 1 END) as scheduled,
  COUNT(CASE WHEN sp.status = 'posted' THEN 1 END) as posted
FROM users u
LEFT JOIN scheduled_posts sp ON u.id = sp.user_id
GROUP BY u.email
ORDER BY total_posts DESC;
```

### Clean Up Old Posts

```sql
-- Delete posts older than 90 days that have been posted
DELETE FROM scheduled_posts
WHERE status = 'posted'
  AND posted_at < NOW() - INTERVAL '90 days';
```

---

## 🔧 Troubleshooting

### Issue: Migration doesn't run

**Symptoms:**
- No migration toast appears
- Posts not syncing to Supabase

**Solutions:**
1. Check browser console for errors
2. Verify user is logged in (`user.id` exists)
3. Clear migration flag:
   ```javascript
   // In browser console
   localStorage.removeItem('migrated_posts_YOUR_USER_ID');
   ```
4. Reload the page

### Issue: "Failed to load scheduled posts" error

**Symptoms:**
- Error toast on calendar load
- No posts display

**Solutions:**
1. Check RLS policies are enabled:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'scheduled_posts';
   ```
2. Verify user authentication token is valid
3. Check browser console for specific error message
4. Ensure Supabase URL and key are correct in `.env`

### Issue: Offline sync not working

**Symptoms:**
- Changes made offline don't sync when back online
- "You are offline" toast doesn't appear

**Solutions:**
1. Check `useOfflineDetection` hook is imported
2. Test browser's online/offline detection:
   ```javascript
   // In browser console
   console.log('Online:', navigator.onLine);
   ```
3. Try toggling network in browser DevTools
4. Ensure `ToastContext` is properly set up

### Issue: Status updates don't persist

**Symptoms:**
- "Mark as Posted" button doesn't work
- Status changes revert after refresh

**Solutions:**
1. Check `updatePostStatus` function is imported
2. Verify user has permission to update:
   ```sql
   SELECT * FROM scheduled_posts WHERE id = 'post-id';
   ```
3. Check browser console for API errors
4. Ensure post belongs to logged-in user

### Issue: Timezone issues

**Symptoms:**
- Posts appear at wrong times
- Scheduled times don't match expectations

**Solutions:**
1. Check user's browser timezone:
   ```javascript
   console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
   ```
2. Verify `timezone` column has correct values
3. Check `user_preferences` table for timezone setting
4. Use `formatInUserTimezone` helper for display

---

## 🎯 Feature Status

### ✅ Implemented
- [x] Supabase CRUD operations
- [x] Automatic localStorage migration
- [x] Optimistic UI updates
- [x] Loading and sync states
- [x] Offline detection
- [x] Status tracking (scheduled, posted, etc.)
- [x] Timezone support
- [x] Error handling and rollback
- [x] Cross-device sync

### 📋 Future Enhancements
- [ ] Real-time collaboration (multiple users)
- [ ] Recurring posts
- [ ] Bulk operations (multi-select)
- [ ] Search and advanced filters
- [ ] Analytics integration
- [ ] Post templates
- [ ] Media attachment from Content Library
- [ ] Email/push notifications for reminders

---

## 📁 Key Files Reference

### Database
- `supabase-scheduled-posts-schema.sql` - Database schema
- `src/config/supabase.js` - API helper functions

### Frontend
- `src/context/ContentContext.jsx` - State management with Supabase
- `src/pages/SmartCalendar.jsx` - Calendar UI with sync states
- `src/hooks/useOfflineDetection.js` - Offline detection
- `src/utils/timezoneHelpers.js` - Timezone utilities

---

## 🔐 Security Notes

### Row Level Security (RLS)
The schema includes RLS policies that ensure:
- Users can only see their own posts
- Users can only modify their own posts
- User preferences are private

### Data Privacy
- All post data is user-scoped
- No cross-user data leaks
- Timezone info stored per user
- Deleted posts are permanently removed

---

## 📈 Performance Tips

### Optimize Loading
```javascript
// Load only upcoming posts
const result = await getScheduledPosts(userId, {
  startDate: new Date().toISOString(),
  status: 'scheduled'
});
```

### Batch Updates
```javascript
// Use optimistic updates for instant feedback
// Real sync happens in background
const updatedPosts = posts.map(p => ({ ...p, status: 'posted' }));
setScheduledPosts(updatedPosts);
await updatePostStatus(postId, 'posted', userId);
```

### Cache Management
```javascript
// Clear cache when user logs out
useEffect(() => {
  if (!user) {
    setScheduledPosts([]);
    setLoading(false);
  }
}, [user]);
```

---

## 🆘 Need Help?

### Common Questions

**Q: How do I reset everything?**
A: Clear localStorage and delete user's posts from Supabase:
```sql
DELETE FROM scheduled_posts WHERE user_id = 'your-user-id';
DELETE FROM user_preferences WHERE user_id = 'your-user-id';
```

**Q: Can users share calendars?**
A: Not currently. Each user has their own private calendar. Collaboration features are planned for future release.

**Q: What happens to old localStorage data?**
A: It's automatically migrated on first login, then cleared. The migration only runs once per user.

**Q: How do I add custom post statuses?**
A: Update the check constraint in the schema:
```sql
ALTER TABLE scheduled_posts 
DROP CONSTRAINT scheduled_posts_status_check;

ALTER TABLE scheduled_posts 
ADD CONSTRAINT scheduled_posts_status_check 
CHECK (status IN ('draft', 'scheduled', 'ready', 'posting', 'posted', 'failed', 'cancelled', 'your_custom_status'));
```

---

**Setup Complete! 🎉**

Your Smart Calendar is now powered by Supabase with full cloud sync, cross-device support, and production-ready reliability.

For questions or issues, check the troubleshooting section above or review the related documentation files.

