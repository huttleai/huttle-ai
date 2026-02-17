import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from '../_utils/cors.js';

const N8N_WEBHOOK_URL = process.env.N8N_TREND_DEEP_DIVE_WEBHOOK;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!N8N_WEBHOOK_URL) {
    return res.status(503).json({
      error: 'Deep Dive workflow is not configured.'
    });
  }

  let userId = null;
  const authHeader = req.headers.authorization;

  if (authHeader && supabase) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    } catch (error) {
      console.error('[trend-deep-dive] Auth check failed:', error);
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { trend, topic, niche, platforms = [], brandData = {} } = req.body || {};
    const selectedTopic = (trend || topic || '').trim();

    if (!selectedTopic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const payload = {
      userId,
      trend: selectedTopic,
      topic: selectedTopic,
      trendTopic: selectedTopic,
      niche: niche || '',
      platforms: Array.isArray(platforms) ? platforms : [],
      brandData: brandData && typeof brandData === 'object' ? brandData : {},
      timestamp: new Date().toISOString()
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 58000);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(502).json({
          error: 'Deep Dive service error. Please try again.'
        });
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'Deep Dive request timed out.'
        });
      }

      console.error('[trend-deep-dive] Network error:', error);
      return res.status(502).json({
        error: 'Unable to reach Deep Dive workflow.'
      });
    }
  } catch (error) {
    console.error('[trend-deep-dive] Proxy error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred.'
    });
  }
}
