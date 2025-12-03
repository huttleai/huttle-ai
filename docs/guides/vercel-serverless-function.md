# Vercel Serverless Function for Social Updates

This document explains how to set up a biweekly serverless function that fetches social media updates from Perplexity API and stores them in Supabase.

## 📋 Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Supabase project with `social_updates` table created (run `supabase-social-updates-schema.sql`)
3. Environment variables configured

## 🗂️ Project Structure

```
huttle-ai/
├── api/
│   └── update-social-media.js  (serverless function)
├── vercel.json                  (Vercel configuration)
└── package.json
```

## 📝 Step 1: Create the Serverless Function

Create `api/update-social-media.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Important: Use service_role key, not anon key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Allowed platforms only
const ALLOWED_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'X', 'Twitter', 'YouTube'];

export default async function handler(req, res) {
  // Only allow POST requests (or GET for manual triggers)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting social media updates fetch...');
    
    // Get current date for the prompt
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    
    // Call Perplexity API
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a social media platform updates expert. You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON array. Each update must be a JSON object with these exact fields: platform (string), date (string in format "Month YYYY"), title (string), description (string), impact (string: "high", "medium", or "low"), keyTakeaways (array of strings), actionItems (array of strings), affectedUsers (string), timeline (string), link (string URL). ONLY include updates from: Facebook, Instagram, TikTok, X (also known as Twitter), and YouTube. DO NOT include updates from LinkedIn, Threads, Snapchat, or any other platforms.'
          },
          {
            role: 'user',
            content: `Provide the latest social media platform updates from the past 12 months (from ${currentMonth} ${currentYear} going back to 12 months ago). ONLY include updates from these platforms: Facebook, Instagram, TikTok, X (Twitter), and YouTube. EXCLUDE LinkedIn, Threads and Snapchat completely. Return ONLY a valid JSON array, starting with [ and ending with ]. Each update object must have: platform (must be one of: Facebook, Instagram, TikTok, X, YouTube), date (format "Month YYYY"), title, description, impact ("high"/"medium"/"low"), keyTakeaways (array), actionItems (array), affectedUsers, timeline, link. Sort by date descending (most recent first).`
          }
        ],
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return res.status(500).json({ error: `Perplexity API error: ${response.status}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    if (!content || content.trim().length === 0) {
      return res.status(500).json({ error: 'Perplexity API returned empty content' });
    }

    // Parse JSON from response
    let updates = [];
    try {
      // Try to extract JSON from markdown code blocks
      const jsonBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonBlockMatch) {
        updates = JSON.parse(jsonBlockMatch[1]);
      } else {
        // Try to find JSON array in content
        const jsonArrayMatch = content.match(/(\[[\s\S]*\])/);
        if (jsonArrayMatch) {
          updates = JSON.parse(jsonArrayMatch[1]);
        } else {
          updates = JSON.parse(content.trim());
        }
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Content received:', content.substring(0, 500));
      return res.status(500).json({ error: 'Failed to parse JSON from Perplexity response' });
    }

    // Filter to only allowed platforms and transform for database
    const filteredUpdates = updates
      .filter(update => {
        const platform = update.platform || '';
        return ALLOWED_PLATFORMS.some(allowed => 
          platform.toLowerCase() === allowed.toLowerCase()
        ) && platform.toLowerCase() !== 'threads' && platform.toLowerCase() !== 'snapchat';
      })
      .map(update => {
        // Parse date "Month YYYY" to "YYYY-MM" format
        const dateStr = update.date || '';
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const parts = dateStr.split(' ');
        let dateMonth = null;
        
        if (parts.length === 2) {
          const monthName = parts[0];
          const year = parts[1];
          const monthIndex = monthNames.indexOf(monthName);
          if (monthIndex !== -1 && year) {
            dateMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
          }
        }
        
        // Normalize platform name
        let platform = update.platform || '';
        if (platform.toLowerCase() === 'twitter') {
          platform = 'X';
        }
        
        return {
          platform,
          date_month: dateMonth || new Date().toISOString().slice(0, 7), // Fallback to current month
          title: update.title || 'Platform Update',
          description: update.description || '',
          link: update.link || '#',
          impact: (update.impact || 'medium').toLowerCase(),
          key_takeaways: Array.isArray(update.keyTakeaways) ? update.keyTakeaways : [],
          action_items: Array.isArray(update.actionItems) ? update.actionItems : [],
          affected_users: update.affectedUsers || '',
          timeline: update.timeline || ''
        };
      });

    console.log(`Parsed ${filteredUpdates.length} updates from API`);

    // Clear old updates (older than 12 months) to keep database clean
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const cutoffMonth = twelveMonthsAgo.toISOString().slice(0, 7);

    await supabase
      .from('social_updates')
      .delete()
      .lt('date_month', cutoffMonth);

    // Upsert new updates (insert or update if exists)
    const { data: insertedData, error: insertError } = await supabase
      .from('social_updates')
      .upsert(filteredUpdates, {
        onConflict: 'platform,date_month,title',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: `Database error: ${insertError.message}` });
    }

    console.log(`Successfully stored ${insertedData?.length || 0} updates in Supabase`);

    return res.status(200).json({
      success: true,
      message: `Successfully fetched and stored ${filteredUpdates.length} social media updates`,
      updatesCount: filteredUpdates.length,
      storedCount: insertedData?.length || 0
    });

  } catch (error) {
    console.error('Error in update-social-media function:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
```

## 📝 Step 2: Install Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

Run:
```bash
npm install @supabase/supabase-js
```

## 📝 Step 3: Configure Vercel

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/update-social-media",
      "schedule": "0 0 */14 * *"
    }
  ]
}
```

This schedules the function to run every 14 days (biweekly).

## 🔑 Step 4: Set Environment Variables in Vercel

In your Vercel project settings, add these environment variables:

```
PERPLEXITY_API_KEY=your_perplexity_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** Use the `service_role` key from Supabase, NOT the `anon` key. This allows the function to bypass RLS policies.

To get your service role key:
1. Go to Supabase Dashboard → Settings → API
2. Copy the `service_role` key (keep this secret!)

## 🚀 Step 5: Deploy to Vercel

1. Connect your GitHub repo to Vercel
2. Vercel will auto-detect the project
3. Add environment variables in Vercel dashboard
4. Deploy

## 🧪 Step 6: Test Manually

Test the function manually by visiting:
```
https://your-vercel-app.vercel.app/api/update-social-media
```

Or trigger via curl:
```bash
curl -X POST https://your-vercel-app.vercel.app/api/update-social-media
```

## 📊 Monitoring

Check Vercel dashboard → Functions to see:
- Execution logs
- Success/failure rates
- Execution time
- Error messages

## 🔄 Alternative: Netlify Functions

If using Netlify instead of Vercel:

1. Create `netlify/functions/update-social-media.js` (same code)
2. Use `netlify.toml` for cron:

```toml
[build]
  functions = "netlify/functions"

[[plugins]]
  package = "@netlify/plugin-scheduled-functions"
  
[[plugins.inputs.schedules]]
  cron = "0 0 */14 * *"
  path = "/.netlify/functions/update-social-media"
```

## ✅ Verification

After deployment:
1. Check Supabase dashboard → Table Editor → `social_updates`
2. You should see new entries appear after the function runs
3. Check Vercel logs to confirm the function executed successfully

## 🆘 Troubleshooting

**Function not running:**
- Check Vercel cron is enabled (Pro plan required for cron)
- Verify `vercel.json` syntax is correct
- Check Vercel function logs

**No data in Supabase:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check Supabase logs for errors
- Test function manually first

**Perplexity API errors:**
- Verify `PERPLEXITY_API_KEY` is set
- Check API quota/limits
- Review function logs for API response

---

**Note:** For free Vercel accounts, cron jobs require the Pro plan. Alternatively, you can:
- Use a third-party cron service (cron-job.org, EasyCron)
- Set up a GitHub Action with scheduled triggers
- Use Supabase Edge Functions with PgCron

