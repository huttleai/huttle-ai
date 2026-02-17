import { createClient } from '@supabase/supabase-js';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Important: Use service_role key, not anon key

// Validate required credentials
if (!PERPLEXITY_API_KEY) {
  console.error('❌ PERPLEXITY_API_KEY is not configured');
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
          search_context_size: 'low'
        },
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
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.'
    });
  }
}

