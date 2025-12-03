# Supabase Auth Security Configuration

This guide will help you fix the authentication security warnings in Supabase.

## Overview

You currently have **2 auth-related warnings** that need to be addressed manually in the Supabase Dashboard:

1. **Leaked Password Protection** - Currently disabled
2. **Insufficient MFA Options** - Too few multi-factor authentication options enabled

---

## 1. Enable Leaked Password Protection

**What it does:** This feature checks passwords against known breached password databases (like Have I Been Pwned) to prevent users from using compromised passwords.

**How to enable:**

### Method 1: Via Authentication Policies (Most Common Location)
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Policies** (or **Configuration**)
3. Look for **"Password Protection"** or **"Security"** section
4. Find **"Breach password protection"** or **"Check for leaked passwords"**
5. **Toggle ON** this option
6. Save the changes

### Method 2: Via Authentication Settings
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings**
3. Scroll to **"Auth Security"** or **"Password Settings"**
4. Enable **"Leaked password protection"**
5. Save

### Method 3: If Not Available in UI
If you cannot find this option in the UI, it may need to be enabled via SQL or may not be available in your Supabase plan. Check:
- Your Supabase version (older versions may not have this feature)
- Your plan tier (some features are Pro/Team only)

**Note:** If this option is not visible, it may already be enabled by default, or you may need to contact Supabase support.

**Impact:** When enabled, users will be prevented from using passwords that have been found in data breaches, significantly improving account security.

---

## 2. Enable Additional MFA Options

**What it does:** Multi-factor authentication adds an extra layer of security by requiring users to verify their identity with more than just a password.

**Recommended MFA methods:**

### Option A: TOTP (Time-based One-Time Password) - **Recommended**

TOTP is the most common MFA method, compatible with apps like:
- Google Authenticator
- Authy
- Microsoft Authenticator
- 1Password

**How to enable:**

### Method 1: Via Authentication Configuration (Most Common)
1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Configuration** or **Settings**
3. Look for **"Multi-Factor Authentication"** or **"MFA"** section
4. Find **"TOTP"** or **"Authenticator App"** option
5. **Toggle ON** TOTP
6. Save the changes

### Method 2: Via Authentication Providers
1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Look for an **"Add Provider"** button or existing provider list
4. If TOTP/MFA isn't listed, check the **Configuration** or **Policies** tabs
5. Enable TOTP/MFA there

### Method 3: Check Project Settings
1. Go to **Project Settings** → **Authentication**
2. Look for **"MFA"** or **"Two-Factor Authentication"** section
3. Enable available MFA methods

**Note:** MFA configuration location varies by Supabase version. If you can't find it in these locations, it may require code implementation rather than dashboard configuration.

### Option B: Phone/SMS Authentication

SMS-based verification (if your app requires it):

**How to enable:**

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Find **"Phone"** provider
4. Enable phone authentication
5. Configure your SMS provider (Twilio, MessageBird, Vonage, etc.)
6. Save the changes

**Note:** SMS authentication requires additional setup with a third-party provider and may incur costs.

### Option C: Email-based MFA

Email-based verification (already available if email auth is enabled):

1. Navigate to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Consider enabling **"Secure email change"** option
4. Enable **"Confirm email"** if not already enabled

---

## 3. Verify Your Changes

After making these changes:

1. Go to **Project Settings** → **Advisors** in your Supabase Dashboard
2. Click the **Refresh** button (circular arrow icon)
3. The auth-related warnings should be resolved

---

## 4. Implementation in Your App

Once you've enabled these features in Supabase, you may want to:

### For Leaked Password Protection:
- Update your signup/password change forms to show better error messages
- Add UI indicators when a password is rejected due to being compromised
- Consider adding a password strength indicator

### For TOTP MFA:
- Add MFA setup flow in your user settings
- Show QR code for users to scan with their authenticator app
- Add backup codes functionality
- Update login flow to prompt for TOTP code

**Example implementation:** See Supabase's [MFA documentation](https://supabase.com/docs/guides/auth/auth-mfa) for code examples.

---

## Additional Security Best Practices

While you're improving security, consider these additional measures:

1. **Password Requirements:**
   - Minimum length: 12 characters (already enforced)
   - Require mix of uppercase, lowercase, numbers, symbols
   
2. **Session Management:**
   - Set appropriate session timeout durations
   - Enable "Single session per user" if needed
   
3. **Email Settings:**
   - Enable email confirmation
   - Require email re-authentication for sensitive actions
   
4. **Rate Limiting:**
   - Already configured by Supabase by default
   - Monitor for unusual login attempts

---

## Support

If you encounter any issues:

- **Supabase Documentation:** https://supabase.com/docs/guides/auth
- **MFA Guide:** https://supabase.com/docs/guides/auth/auth-mfa
- **Supabase Discord:** https://discord.supabase.com

---

## Summary

✅ **Database Functions** - Fixed automatically via SQL updates
✅ **Leaked Password Protection** - Enable manually in Dashboard
✅ **MFA Options** - Enable manually in Dashboard (recommend TOTP)

Once you complete steps 1 and 2 above, all Supabase warnings should be resolved! 🎉

