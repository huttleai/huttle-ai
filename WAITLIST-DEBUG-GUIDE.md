# Waitlist Debug Guide

## Issue: "Join Waitlist" shows "Joining..." then nothing happens

### ✅ Fixed: Better Error Handling

I've added error handling so you'll now see error messages if something goes wrong.

---

## 🔍 How to Debug

### Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Click "Join Waitlist" and fill out the form
4. Submit the form
5. Look for any error messages in red

### Step 2: Check Network Tab

1. Open Developer Tools → **Network** tab
2. Click "Join Waitlist" and submit
3. Look for a request to `/api/subscribe-waitlist`
4. Click on it to see:
   - **Status Code** (200 = success, 400/500 = error)
   - **Response** tab to see the error message
   - **Headers** to see what was sent

### Step 3: Are You Running Locally or on Production?

#### If Running Locally (npm run dev):
- The Vite proxy points `/api` to `localhost:3001`
- You need to run the API server: `npm run dev:api`
- OR use `npm run dev:local` (runs both frontend and API)
- OR use `vercel dev` (recommended - uses Vercel's local serverless functions)

#### If Running on Production (Vercel):
- API routes should work automatically
- Check Vercel Function Logs:
  1. Go to Vercel Dashboard
  2. Your Project → Functions
  3. Click on `subscribe-waitlist`
  4. Check "Logs" tab for errors

---

## 🐛 Common Issues

### Issue 1: "Network error" or 404
**Cause**: API endpoint not found  
**Solution**: 
- Local: Make sure API server is running (`vercel dev` recommended)
- Production: Check that `/api/subscribe-waitlist.js` exists and is deployed

### Issue 2: "Service configuration error" or 500
**Cause**: Mailchimp API key or Audience ID not set  
**Solution**:
- Check Vercel Environment Variables:
  - `MAILCHIMP_WAITLIST_API_KEY` must be set
  - `MAILCHIMP_WAITLIST_AUDIENCE_ID` must be set
- Redeploy after adding environment variables

### Issue 3: "Failed to subscribe" (400)
**Cause**: Mailchimp API error  
**Check**:
- API key is valid (not expired/revoked)
- Audience ID is correct
- API key has permissions to add subscribers
- Check browser console for the specific Mailchimp error

### Issue 4: Still shows "Joining..." forever
**Cause**: Request is hanging/timing out  
**Check**:
- Network connection
- API server is responding
- CORS is configured correctly
- Check browser Network tab - is the request pending?

---

## ✅ Quick Test

Try this in your browser console (after opening the waitlist modal):

```javascript
fetch('/api/subscribe-waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

This will show you exactly what error you're getting.

---

## 📋 Checklist

- [ ] Open browser console
- [ ] Try "Join Waitlist" again
- [ ] Check for error messages (should now be visible)
- [ ] Check Network tab for API request
- [ ] Verify environment variables in Vercel
- [ ] Check Vercel function logs (if on production)
- [ ] Make sure API server is running (if local)

---

## 🔧 Next Steps

After you check the console/network tab, you'll see the specific error. Common fixes:

1. **Missing env vars** → Add to Vercel and redeploy
2. **Invalid API key** → Rotate and update Mailchimp key
3. **Wrong Audience ID** → Double-check in Mailchimp dashboard
4. **Local dev issue** → Run `vercel dev` instead of `npm run dev`

Let me know what error message you see and I can help fix it!


