/**
 * Ignite Engine Webhook Proxy
 *
 * Serverless function that proxies Ignite Engine requests to n8n webhook.
 * Now supports the enriched blueprintContext payload with required_sections,
 * excluded_sections, viral_score_weights, etc.
 *
 * Environment Variables Required:
 * - N8N_IGNITE_ENGINE_WEBHOOK: n8n webhook endpoint for Ignite Engine
 * - GROK_API_KEY: server-side Grok key forwarded to the workflow when needed
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

const N8N_WEBHOOK_URL =
  process.env.N8N_IGNITE_ENGINE_WEBHOOK || // HUTTLE AI: updated 3
  process.env.VITE_N8N_IGNITE_ENGINE_WEBHOOK; // HUTTLE AI: updated 3
const GROK_API_KEY = process.env.GROK_API_KEY;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const ALLOWED_PLATFORMS = new Set(['TikTok', 'Instagram', 'Facebook', 'X', 'YouTube', 'LinkedIn']);

function hasUsefulBlueprintContent(payload) {
  if (!payload) return false;
  if (typeof payload === 'string') return payload.trim().length > 0;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload !== 'object') return false;

  const meaningfulKeys = [
    'blueprint', 'sections', 'viral_score', 'viral_score_breakdown',
    'directors_cut', 'directorsCut', 'slide_breakdown', 'tweet_breakdown',
    'frame_breakdown', 'caption_structure', 'hooks', 'content_script',
    'seo_keywords', 'suggested_hashtags',
  ];

  if (meaningfulKeys.some((key) => payload[key])) return true;

  return ['data', 'result', 'output', 'response', 'payload'].some((key) =>
    hasUsefulBlueprintContent(payload[key])
  );
}

export default async function handler(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  setCorsHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !supabase) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }

  if (!N8N_WEBHOOK_URL) {
    console.error('[ignite-engine-proxy] N8N webhook URL not configured', { requestId }); // HUTTLE AI: updated 3
    return res.status(500).json({ error: 'Service not configured. Please try again later.', requestId });
  }

  try {
    const {
      topic,
      platform,
      content_type,
      goal,
      niche,
      target_audience,
      brand_voice_tone,
      required_sections,
      optional_sections,
      excluded_sections,
      viral_score_weights,
      blueprint_label,
    } = req.body || {};

    if (!platform || !topic) {
      return res.status(400).json({ error: 'Missing required fields: platform, topic', requestId });
    }
    if (!ALLOWED_PLATFORMS.has(platform)) {
      return res.status(400).json({ error: 'Unsupported platform value', requestId });
    }

    const sanitizedPayload = {
      topic: String(topic).substring(0, 500),
      platform,
      content_type: content_type || 'Post',
      goal: goal || 'Grow Followers',
      niche: niche ? String(niche).substring(0, 200) : '',
      target_audience: target_audience ? String(target_audience).substring(0, 200) : '',
      brand_voice_tone: brand_voice_tone ? String(brand_voice_tone).substring(0, 100) : 'Authentic',
      required_sections: Array.isArray(required_sections) ? required_sections : [],
      optional_sections: Array.isArray(optional_sections) ? optional_sections : [],
      excluded_sections: Array.isArray(excluded_sections) ? excluded_sections : [],
      viral_score_weights: viral_score_weights && typeof viral_score_weights === 'object' ? viral_score_weights : {},
      blueprint_label: blueprint_label || '',
      // Legacy fields for backward compatibility with existing n8n workflows
      format: content_type || 'Post',
      postType: content_type || 'Post',
      requestedPostType: content_type || 'Post',
      objective: goal || 'viral',
      targetAudience: target_audience || '',
      ...(GROK_API_KEY ? { grokApiKey: GROK_API_KEY } : {}),
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('[ignite-engine-proxy] n8n error response:', errorText, { requestId }); // HUTTLE AI: updated 3
      return res.status(response.status).json({
        error: `n8n webhook error: ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 200),
        requestId
      });
    }

    const rawResponse = await response.text().catch(() => '');
    const data = rawResponse ? (() => {
      try { return JSON.parse(rawResponse); } catch { return null; }
    })() : {};

    if (!hasUsefulBlueprintContent(data || rawResponse)) {
      return res.status(502).json({
        error: 'n8n response missing blueprint content.',
        requestId
      });
    }

    if (data && typeof data === 'object') {
      return res.status(200).json({ ...data, requestId });
    }

    return res.status(200).json({ content: rawResponse, requestId });

  } catch (error) {
    console.error('[ignite-engine-proxy] Error:', { // HUTTLE AI: updated 3
      name: error.name,
      message: error.message,
    });

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request timeout: n8n workflow took longer than 120 seconds', requestId });
    }

    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return res.status(502).json({ error: 'Unable to reach n8n webhook.', requestId });
    }

    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.', requestId });
  }
}
