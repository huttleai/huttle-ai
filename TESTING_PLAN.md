# Testing Plan: Magic Link Race Condition Fix

## Quick Test (Priority 1)

### Test Magic Link Authentication
1. **Setup**: Ensure you're logged out
2. **Action**: Request a Magic Link (password reset or login link)
3. **Expected**: 
   - Click the link in your email
   - You should see a loading spinner briefly
   - You should be authenticated and see the `/secure-account` page
   - You should NOT be redirected to `/login`

### Console Logging to Watch
Open the browser console and look for these logs:

```
🚀 [Auth] Initializing session...
🔐 [Auth] Session found: true <email>
🔍 [Auth] Checking user profile for: <user-id>
✅ [Auth] Setting loading to false
🔒 [Secure Account] User authenticated, showing password setup
```

If you see this instead, there's a problem:
```
🔒 [Secure Account] No user found after loading complete, redirecting to login
```

## Comprehensive Test Suite

### 1. Magic Link to /secure-account
- [ ] Request password reset link
- [ ] Click link in email
- [ ] Should see loading spinner (1-2 seconds)
- [ ] Should land on password setup page
- [ ] Should NOT redirect to login

### 2. Regular Login Flow
- [ ] Go to `/login` directly
- [ ] Enter email/password
- [ ] Should login successfully
- [ ] Should redirect to dashboard

### 3. Protected Route Access (Logged Out)
- [ ] Log out completely
- [ ] Try to access `/dashboard`
- [ ] Should see loading spinner briefly
- [ ] Should redirect to `/dashboard/login`

### 4. Protected Route Access (Logged In)
- [ ] Log in normally
- [ ] Navigate to `/dashboard`
- [ ] Should load dashboard without issues
- [ ] Should NOT see unexpected loading spinners

### 5. Tab Switching (Token Refresh)
- [ ] Log in successfully
- [ ] Switch to another tab for 10 minutes
- [ ] Come back to the app
- [ ] Should stay logged in (token refresh)
- [ ] Should NOT redirect to login
- [ ] Console should show: `🔄 [Auth] Token refreshed - keeping existing state`

### 6. Direct Navigation to /secure-account (No Auth)
- [ ] Log out
- [ ] Navigate directly to `/secure-account`
- [ ] Should see loading spinner
- [ ] Should redirect to `/dashboard/login` (because no valid session)

### 7. Expired Magic Link
- [ ] Request a Magic Link
- [ ] Wait for it to expire (check Supabase settings for expiry time)
- [ ] Click expired link
- [ ] Should see loading spinner
- [ ] Should redirect to `/dashboard/login` with error message

## Debug Checklist

If Magic Links still don't work:

1. **Check Supabase Setup**
   - [ ] Verify redirect URLs are configured in Supabase dashboard
   - [ ] Check that `/secure-account` is in the allowed redirect URLs
   - [ ] Verify email templates have correct redirect URL

2. **Check Browser Console**
   - [ ] Look for auth-related errors
   - [ ] Check if session is being established
   - [ ] Verify `loading` state changes from `true` to `false`

3. **Check Network Tab**
   - [ ] Look for Supabase auth API calls
   - [ ] Verify session endpoint returns 200 OK
   - [ ] Check for any 4xx or 5xx errors

4. **Check Environment Variables**
   - [ ] Verify `VITE_SUPABASE_URL` is correct
   - [ ] Verify `VITE_SUPABASE_ANON_KEY` is correct
   - [ ] Ensure no typos in `.env` file

## Known Good Flow

When everything works correctly, you should see:

1. Click Magic Link → Browser opens `/secure-account`
2. Loading spinner appears (1-2 seconds)
3. Console logs show session initialization
4. Console logs show "User authenticated"
5. Password setup page appears
6. No redirects to `/login`

## Timing Details

- **Initial loading**: 1-2 seconds (Supabase session check)
- **Profile check**: Additional 0.5-1 seconds (if user exists)
- **Timeout protection**: 8 seconds max (safety fallback)

## Common Issues

### Issue: Still redirecting to /login
**Solution**: Check that:
- Loading state is properly exposed from AuthContext (✅ Already verified)
- Loading check happens BEFORE auth checks (✅ Already fixed)
- Supabase redirect URL matches your route (Check Supabase dashboard)

### Issue: Loading spinner shows forever
**Solution**: Check console for errors:
- Profile table might not exist
- RLS policies might be blocking queries
- Network connection issues

### Issue: "Configuration Error" message
**Solution**: AuthContext is not available
- Verify AuthProvider wraps the component
- Check for provider nesting issues
