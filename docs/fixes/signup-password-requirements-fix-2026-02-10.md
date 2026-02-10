# Signup Password Requirements Fix - Feb 10, 2026

## Problem Summary

Users saw all green checkmarks on the signup form (indicating password met requirements), but Supabase rejected the password on submission with error: "This password is not allowed."

## Root Cause

**Mismatch between client-side validation and server-side requirements:**

- **Supabase** was configured to require: lowercase, uppercase, digits **AND symbols**
- **Signup form** was only enforcing: lowercase, uppercase, and digits (symbols were optional/bonus)

This caused the form to show "all requirements met" for passwords like `Password123`, but Supabase rejected them because they lacked symbols.

## Solution Applied

### Supabase Configuration Changed

Accessed via: **Authentication → Sign In / Providers → Email → Password Requirements**

**Changed from:**
- ❌ "Lowercase, uppercase letters, digits and symbols (recommended)"

**Changed to:**
- ✅ "Lowercase, uppercase letters and digits" (no symbols required)

### Why This Works

Now both the client form and Supabase server enforce the same requirements:
- 8+ characters
- Lowercase letter
- Uppercase letter
- Number
- Symbols are optional (bonus points for strength, but not required)

## Code Already Aligned

The signup form (`src/pages/Signup.jsx`) already had the correct validation:

```javascript
// Required checks
- At least 8 characters ✓
- Lowercase letter ✓
- Uppercase letter ✓
- Number ✓

// Optional (bonus)
- Special character (bonus) ✓

// Security check
- Unique enough (HIBP check) ✓
```

## Additional Features Implemented

1. **Client-side uniqueness check** - Uses HaveIBeenPwned API (k-anonymity) to warn users about common passwords before submission
2. **Password visibility toggle** - Eye icon to show/hide password while typing
3. **Real-time validation** - Requirements checklist updates as user types
4. **Disabled submit button** - Button stays disabled until all requirements pass

## Result

✅ **Form validation now matches Supabase requirements**  
✅ **Users can create accounts with passwords like:** `MyPassword123`  
✅ **No more false positives** - If form shows green, Supabase will accept it  
✅ **Better UX** - Users know immediately if password will be rejected

## Testing

Test with these passwords:

| Password | Should work? |
|----------|--------------|
| `password` | ❌ No - too short, no uppercase, no number |
| `Password` | ❌ No - too short, no number |
| `Password1` | ❌ No - too short (only 9 chars if min is 8, but likely too common) |
| `Password123` | ✅ Yes - meets all requirements |
| `MySecurePass99` | ✅ Yes - meets all requirements |
| `Test1234` | ⚠️ Maybe - meets format but might be too common (HIBP check) |

## Files Changed

1. `src/pages/Signup.jsx` - Added:
   - HIBP uniqueness check with neutral wording
   - Password visibility toggles
   - Real-time requirement validation
   - Disabled button until requirements met

2. `docs/setup/SUPABASE-PASSWORD-POLICY-GUIDE.md` - Created guide for future reference

3. `docs/fixes/signup-password-requirements-fix-2026-02-10.md` - This document

## Future Considerations

- If you want to require symbols in the future, update both:
  1. Supabase: Authentication → Email → Password Requirements
  2. Form: Change "Special character (bonus)" to required in `Signup.jsx`
  
- For production, consider re-enabling leaked password protection in Supabase (Pro plan feature)

## Credits

Fixed by Claude in Chrome (Supabase configuration) and Cursor AI (form implementation).
