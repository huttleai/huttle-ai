# Supabase Password Policy - How to Reduce Complexity

If your signup form shows all requirements met (green) but Supabase still rejects the password with "This password is not allowed," the **server-side password policy** in Supabase is stricter than your form's checks. You can relax it in the dashboard.

---

## Where to Change Settings

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Providers** → **Email**
4. Or: **Authentication** → **Policies** (depending on your dashboard version)
5. Look for **Password** or **Password security** settings

---

## What You Can Configure

### 1. Minimum password length
- **Default:** Often 6 or 8 characters
- **Reduce:** If you allow shorter passwords, set the minimum length accordingly
- **Note:** Supabase recommends at least 8 characters for security

### 2. Required character types
Supabase lets you choose how strict the password rules are:

| Option | Required |
|--------|----------|
| Weakest | Digits only |
| Medium | Digits + letters |
| Stronger | Digits + lowercase + uppercase |
| Strongest | Digits + lowercase + uppercase + **symbols** |

**If your form passes but Supabase rejects:**  
Supabase may be set to the strongest option (symbols required). Either:
- **Relax it:** Change to "Digits, lowercase and uppercase letters" (no symbols required), or
- **Align form:** Update your signup form to require a symbol and show it as a required checklist item.

### 3. Leaked password protection (Pro Plan only)
- Uses HaveIBeenPwned.org to reject known compromised passwords
- **Pro Plan and above:** Enabling/disabling this is usually in the same Auth/Password section
- **Free tier:** This feature is generally not available; rejections are from length/complexity only

If you're on Pro and it’s enabled:
- Check for a toggle like **"Prevent leaked passwords"** or **"Leaked password protection"**
- Turning it **off** will allow passwords that appear in breach databases (not recommended for production)

---

## Recommended Steps

1. **Open Authentication → Providers → Email** in your Supabase project.
2. **Find the password policy section** (sometimes under "Password" or "Security").
3. **Check the required character types:**
   - If it requires symbols and your form doesn’t, either relax Supabase or add symbol requirement to your form.
   - If it’s set to "Digits, lowercase and uppercase letters" (no symbols), your form should align.
4. **Check minimum length** and ensure it matches your form (e.g. 8 characters).
5. **Leaked password protection:** If you’re on Pro and want to relax it for testing, disable it there (not recommended for production).

---

## If Settings Are Hard to Find

Supabase sometimes moves these controls or hides them by plan:

- **Authentication → Configuration** – scroll for password options
- **Project Settings → Authentication** – look for password/security section
- **Authentication → Policies** – some versions put password rules here

Your project’s docs mention: [Auth providers](https://supabase.com/dashboard/project/_/auth/providers?provider=Email) – open that URL with your project ID to reach the Email provider settings.

---

## Quick Checklist

| Setting | Your form | Supabase should match |
|--------|-----------|------------------------|
| Min length | 8 chars | 8 chars |
| Lowercase | Required | Required |
| Uppercase | Required | Required |
| Number | Required | Required |
| Symbol | Optional (bonus) | Check if Supabase requires it |
| Leaked passwords | We check client-side | Pro: controlled by Supabase toggle |

---

## Summary

Supabase’s password policy is configured in the dashboard, not in your app code. To reduce complexity:

1. Use **Authentication → Providers → Email** (or equivalent) in the Supabase dashboard.
2. Relax **required character types** if symbols are required.
3. Confirm **minimum length** matches your form.
4. If on Pro, adjust **leaked password protection** if needed.

If you’re still seeing rejections after changes, the exact error message and response from Supabase Auth will indicate whether it’s length, complexity, or leaked-password related.
