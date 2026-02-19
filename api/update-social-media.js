import { createClient } from '@supabase/supabase-js';

const PERPLEXITY_API_KEY =
  process.env.PERPLEXITY_API_KEY ||
  process.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required credentials
if (!PERPLEXITY_API_KEY) {
  console.error('❌ PERPLEXITY_API_KEY / VITE_PERPLEXITY_API_KEY is not configured');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase credentials are not configured');
}

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_KEY) ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

// Allowed platforms only
const ALLOWED_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'X', 'Twitter', 'YouTube'];

// Secret for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  // Only allow POST requests (or GET for manual triggers)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Verify cron secret for scheduled jobs
  // This prevents unauthorized access to this endpoint
  const providedSecret = req.headers['x-cron-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!CRON_SECRET) {
    console.error('❌ CRON_SECRET not configured - rejecting request for security');
    return res.status(500).json({ error: 'Endpoint not configured. CRON_SECRET must be set.' });
  }
  
  if (providedSecret !== CRON_SECRET) {
    console.warn('Unauthorized access attempt to update-social-media endpoint');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate services are configured
  if (!PERPLEXITY_API_KEY) {
    return res.status(500).json({ error: 'PERPLEXITY_API_KEY is not configured' });
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' });
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
        web_search_options: {
          search_context_size: 'medium'
        },
        messages: [
          {
            role: 'system',
            content: `You are a social media platform updates expert for content creators. You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON array.

Each update must be a JSON object with these EXACT fields:
- platform: string (one of: Facebook, Instagram, TikTok, X, YouTube)
- date: string in format "Month YYYY"
- title: string (concise headline, max 10 words)
- description: string (2–3 sentence factual summary of the update)
- impact: string ("high", "medium", or "low")
- update_type: string (one of: "algorithm change", "new feature", "policy update", "monetization", "analytics", "creator tools", "general")
- action_required: boolean (true only if content creators MUST take action or risk account/content impact)
- what_it_means: string (1–2 sentences explaining what this means practically for a content creator — conversational tone, e.g. "Your Reels now get more reach if you post before 9am...")
- keyTakeaways: array of strings (2–4 bullet points)
- actionItems: array of strings (1–3 specific actions creators should take)
- affectedUsers: string
- timeline: string
- link: string (URL to official announcement or credible source; use "#" if not available)

QUALITY GATE: Only include updates that are genuinely significant for content creators. Do NOT include minor UI tweaks, vague "platform is testing" notes with no outcome, or updates where there is truly nothing new to report. If a platform has no meaningful update in the period, omit it entirely — do NOT fabricate filler content.

ONLY include updates from: Facebook, Instagram, TikTok, X (Twitter), and YouTube. DO NOT include LinkedIn, Threads, Snapchat, or any other platforms.`
          },
          {
            role: 'user',
            content: `Find the most significant social media platform updates from the past 90 days (as of ${currentMonth} ${currentYear}). Focus on changes that directly affect content creators, influencers, and social media managers. ONLY include updates from: Facebook, Instagram, TikTok, X (Twitter), and YouTube. EXCLUDE all other platforms. Return ONLY a valid JSON array. Sort by impact descending (high first), then by date descending.`
          }
        ],
        temperature: 0.1,
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

    // Expiry durations by impact level
    const EXPIRY_DAYS = { high: 21, medium: 10, low: 5 };

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
        if (platform.toLowerCase() === 'twitter') platform = 'X';

        const impactLevel = (update.impact || 'medium').toLowerCase();
        const expiryDays = EXPIRY_DAYS[impactLevel] ?? 10;
        const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
        const sourceUrl = (update.link && update.link !== '#') ? update.link : null;

        return {
          platform,
          date_month: dateMonth || new Date().toISOString().slice(0, 7),
          title: update.title || 'Platform Update',
          description: update.description || '',
          link: sourceUrl || '#',
          impact: impactLevel,
          key_takeaways: Array.isArray(update.keyTakeaways) ? update.keyTakeaways : [],
          action_items: Array.isArray(update.actionItems) ? update.actionItems : [],
          affected_users: update.affectedUsers || '',
          timeline: update.timeline || '',
          // Enriched fields
          update_type: update.update_type || 'general',
          action_required: Boolean(update.action_required),
          what_it_means: update.what_it_means || '',
          source_url: sourceUrl,
          expires_at: expiresAt,
          fetched_at: new Date().toISOString(),
          published_date: dateMonth ? `${dateMonth}-01` : null
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
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.'
    });
  }
}

