# AI Usage Reset Implementation

## Overview
Implemented subscription-based AI usage reset system that resets on the user's billing cycle anniversary rather than a fixed calendar date.

## Changes Made

### 1. Created `src/utils/aiUsageHelpers.js`
New utility file with functions for:
- `shouldResetAIUsage()` - Checks if usage should reset based on subscription anniversary
- `getNextResetDate()` - Calculates the next reset date based on subscription start date
- `getFormattedResetDate()` - Returns formatted reset date for display
- `getDaysUntilReset()` - Returns human-readable time until reset

### 2. Updated `src/context/AuthContext.jsx`
- Added automatic `subscriptionStartDate` to user object
- Sets subscription start date on first login if not present
- Ensures existing users get their subscription date set to current date

### 3. Updated `src/components/AIFeatureLock.jsx`
- Now displays personalized reset date based on subscription anniversary
- Changed "this month" to "this billing cycle" for accuracy
- Shows exact date like "December 7, 2024" instead of generic "1st of next month"
- Added Calendar icon for visual clarity

### 4. Updated `src/pages/AITools.jsx`
- Added automatic usage reset check on page load
- Resets AI usage when subscription anniversary is reached
- Shows success notification when usage resets
- Unlocks AI features automatically on reset

### 5. Updated `src/pages/Dashboard.jsx`
- Added automatic usage reset check
- Shows info notification when usage resets
- Keeps AI usage counter in sync

## How It Works

### Example Scenarios

**Scenario 1: User signs up on November 7**
- First billing cycle: November 7 - December 6
- Usage resets on December 7
- Next reset: January 7, then February 7, etc.

**Scenario 2: User signs up on January 31**
- First billing cycle: January 31 - February 28/29
- Usage resets on February 28/29 (last day of month)
- March reset: March 31
- April reset: April 30 (handles months with fewer days)

**Scenario 3: User hits limit on November 15**
- Signed up: November 7
- Hit limit: November 15
- Lock message: "Your limit resets on December 7, 2024"
- AI features unlock automatically on December 7

### Edge Cases Handled

1. **Months with fewer days**: If user subscribes on Jan 31, resets on last day of shorter months (Feb 28/29)
2. **Leap years**: Properly handles February 29
3. **Existing users**: Auto-assigns current date as subscription start date
4. **New users**: Sets subscription start date on first login
5. **Automatic unlock**: AI features become available again when reset date arrives

### Storage

- `localStorage.aiGensUsed` - Current usage count
- `localStorage.aiUsageLastReset` - ISO timestamp of last reset
- `user.subscriptionStartDate` - ISO timestamp of subscription start

### Notifications

Users receive notifications at:
- **75% usage**: Warning with upgrade suggestion
- **95% usage**: Critical warning, almost exhausted
- **100% usage**: Error notification, features locked
- **Reset**: Success notification when usage refreshes

## Testing

To test the reset functionality:

1. Set a user's `subscriptionStartDate` to a past date
2. Set `aiUsageLastReset` to before that date
3. Reload the page - usage should reset automatically
4. Check that the lock screen shows correct next reset date

Example:
```javascript
// In browser console
localStorage.setItem('user', JSON.stringify({
  name: 'Test User',
  subscriptionStartDate: '2024-10-07T00:00:00.000Z'
}));
localStorage.setItem('aiUsageLastReset', '2024-10-15T00:00:00.000Z');
// Reload page - should reset if past November 7
```

## Future Enhancements

1. Backend integration for server-side reset tracking
2. Email notifications before reset date
3. Option to change billing cycle date
4. Annual subscription handling
5. Prorated usage for mid-cycle upgrades

