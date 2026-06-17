/**
 * AI Plan Builder Webhook Proxy
 * 
 * Serverless function that proxies Plan Builder webhook requests to n8n.
 * This avoids CORS issues by making the request server-side.
 * 
 * Environment Variables Required:
 * - N8N_PLAN_BUILDER_WEBHOOK: n8n webhook endpoint for plan builder
 * 
 * Expected Request Payload:
 * {
 *   "job_id": "<valid-uuid>",
 *   "contentGoal": "Grow followers",
 *   "timePeriod": "7",
 *   "platformFocus": ["Facebook", "Instagram"],
 *   "brandVoice": "Professional and Engaging"
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { parseBearerToken } from './_utils/billing.js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { logInfo, logError } from './_utils/observability.js';
import {
  PLAN_BUILDER_14DAY_ALLOWED_TIERS,
  resolvePlanBuilderCap,
} from './_utils/planBuilderLimits.js';

const N8N_WEBHOOK_URL =
  process.env.N8N_PLAN_BUILDER_WEBHOOK_URL ||
  process.env.N8N_PLAN_BUILDER_WEBHOOK ||
  process.env.VITE_N8N_PLAN_BUILDER_WEBHOOK;

// Initialize Supabase for auth verification
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];
const DASHBOARD_GENERATION_SOURCE = 'dashboard_daily_generation';
const PLAN_BUILDER_CREDIT_COSTS = {
  planBuilder7Day: 3,
  planBuilder14Day: 5,
};
const TIER_CREDIT_POOLS = {
  builder: 800,
  founder: 800,
  pro: 600,
  essentials: 200,
  free: 0,
};

/**
 * Validate UUID format
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getStartOfMonthIso() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth.toISOString();
}

async function markJobFailed(jobId, errorMessage) {
  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'failed',
      error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    logError('plan_builder_proxy.job_mark_failed_error', {
      jobId,
      message: error.message,
    });
  }
}

async function releasePlanBuilderUsage({ userId, jobId }) {
  const { error } = await supabase
    .from('user_activity')
    .delete()
    .eq('user_id', userId)
    .eq('metadata->>job_id', jobId);

  if (error) {
    logError('plan_builder_proxy.usage_release_failed', {
      userId,
      jobId,
      message: error.message,
    });
  }
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight request
  if (handlePreflight(req, res)) return;

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Require authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !supabase) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = parseBearerToken(authHeader);
  if (!token) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }

  // Validate environment variables
  if (!N8N_WEBHOOK_URL) {
    logError('plan_builder_proxy.missing_webhook_url', { requestId });
    return res.status(500).json({ 
      error: 'Service not configured. Please try again later.',
      requestId
    });
  }

  // Validate request body — forward all plan-builder fields n8n expects (see src/services/planBuilderAPI.js)
  const body = req.body || {};
  const {
    job_id,
    contentGoal,
    timePeriod,
    postingFrequency,
    platformFocus,
    niche,
    targetAudience,
    brandVoiceTone,
    contentPillars,
    followerRange,
    extraContext,
    brandVoice,
    brandContext,
    trendContext,
    platform_rules_block,
    platforms_list,
    profileType,
    firstName,
    businessPrimaryGoal,
    creatorMonetizationPath,
    isLocalBusiness,
    audienceLocationType,
    contentMixOverride,
    city,
  } = body;

  if (!job_id) {
    logError('plan_builder_proxy.missing_job_id', { requestId, userId: user.id });
    return res.status(400).json({ 
      error: 'Missing required field: job_id',
      hint: 'The job_id must be a valid UUID format',
      requestId
    });
  }

  if (!isValidUUID(job_id)) {
    logError('plan_builder_proxy.invalid_job_id', { requestId, userId: user.id, job_id });
    return res.status(400).json({ 
      error: 'Invalid job_id format. Must be a valid UUID.',
      received: job_id,
      example: '550e8400-e29b-41d4-a716-446655440000',
      requestId
    });
  }

  if (!Array.isArray(platformFocus) || platformFocus.length === 0) {
    return res.status(400).json({
      error: 'Missing required field: platformFocus (array with at least one platform)',
      requestId
    });
  }

  let usageReserved = false;

  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, user_id, type, status, input')
      .eq('id', job_id)
      .maybeSingle();

    if (jobError) {
      logError('plan_builder_proxy.job_lookup_failed', {
        requestId,
        userId: user.id,
        job_id,
        message: jobError.message,
      });
      return res.status(500).json({ error: 'Failed to verify job ownership', requestId });
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found', requestId });
    }

    if (job.user_id !== user.id) {
      logError('plan_builder_proxy.job_owner_mismatch', {
        requestId,
        userId: user.id,
        job_id,
        ownerId: job.user_id,
      });
      return res.status(403).json({ error: 'Job does not belong to authenticated user', requestId });
    }

    if (job.type !== 'plan_builder') {
      return res.status(400).json({ error: 'Invalid job type', requestId });
    }

    const jobInput = typeof job.input === 'string' ? safeJsonParse(job.input) : job.input;
    const meteredPeriod = String(jobInput?.timePeriod ?? jobInput?.duration ?? timePeriod ?? '7');

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      logError('plan_builder_proxy.subscription_lookup_failed', {
        requestId,
        userId: user.id,
        message: subscriptionError.message,
      });
      return res.status(500).json({ error: 'Failed to verify subscription', requestId });
    }

    const userTier = subscription?.tier || null;
    if (!userTier) {
      return res.status(403).json({
        error: 'Active subscription required',
        message: 'Choose a plan to use AI Plan Builder.',
        requestId,
      });
    }

    if (Number(meteredPeriod) === 14 && !PLAN_BUILDER_14DAY_ALLOWED_TIERS.includes(userTier)) {
      return res.status(403).json({
        error: 'tier_restricted',
        message: '14-day plans require Pro or above.',
        requestId,
      });
    }

    const { featureKey, cap } = resolvePlanBuilderCap(meteredPeriod, userTier);
    const creditCost = PLAN_BUILDER_CREDIT_COSTS[featureKey] ?? 0;
    const monthlyPool = TIER_CREDIT_POOLS[userTier] ?? 0;

    if (cap == null || cap <= 0 || creditCost <= 0) {
      return res.status(403).json({
        error: 'Plan Builder not available for this subscription tier.',
        requestId,
      });
    }

    const monthStart = getStartOfMonthIso();
    const { count: existingReservation, error: reservationLookupError } = await supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('metadata->>job_id', job_id);

    if (reservationLookupError) {
      logError('plan_builder_proxy.reservation_lookup_failed', {
        requestId,
        userId: user.id,
        job_id,
        message: reservationLookupError.message,
      });
      return res.status(500).json({ error: 'Failed to verify usage reservation', requestId });
    }

    if ((existingReservation ?? 0) === 0) {
      const { count: featureCount, error: featureCountError } = await supabase
        .from('user_activity')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('feature', featureKey)
        .gte('created_at', monthStart);

      if (featureCountError) {
        logError('plan_builder_proxy.feature_count_failed', {
          requestId,
          userId: user.id,
          featureKey,
          message: featureCountError.message,
        });
        return res.status(500).json({ error: 'Failed to verify usage limits', requestId });
      }

      if ((featureCount ?? 0) >= cap) {
        return res.status(429).json({
          error: 'AI usage limit reached',
          message: `You've reached your monthly limit of ${cap} ${Number(meteredPeriod) === 14 ? '14-day' : '7-day'} plan generations.`,
          currentUsage: featureCount ?? 0,
          limit: cap,
          requestId,
        });
      }

      const { count: poolCount, error: poolCountError } = await supabase
        .from('user_activity')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('feature', 'aiGenerations')
        .or(`metadata->>source.is.null,metadata->>source.neq.${DASHBOARD_GENERATION_SOURCE}`)
        .gte('created_at', monthStart);

      if (poolCountError) {
        logError('plan_builder_proxy.pool_count_failed', {
          requestId,
          userId: user.id,
          message: poolCountError.message,
        });
        return res.status(500).json({ error: 'Failed to verify credit pool', requestId });
      }

      const creditsUsed = poolCount ?? 0;
      if (monthlyPool > 0 && creditsUsed + creditCost > monthlyPool) {
        return res.status(429).json({
          error: 'AI credit pool exhausted',
          message: `This feature uses ${creditCost} credits. You have ${Math.max(0, monthlyPool - creditsUsed)} credits left this month.`,
          currentUsage: creditsUsed,
          required: creditCost,
          limit: monthlyPool,
          requestId,
        });
      }

      const nowIso = new Date().toISOString();
      const usageRows = [
        {
          user_id: user.id,
          feature: featureKey,
          metadata: {
            type: 'run_counter',
            job_id,
            period: meteredPeriod,
            source: 'plan-builder-proxy',
          },
          created_at: nowIso,
        },
        ...Array.from({ length: creditCost }, (_, creditIndex) => ({
          user_id: user.id,
          feature: 'aiGenerations',
          metadata: {
            sourceFeature: featureKey,
            source: 'plan-builder-proxy',
            job_id,
            period: meteredPeriod,
            creditIndex,
            overallCredits: creditCost,
          },
          created_at: nowIso,
        })),
      ];

      const { error: usageInsertError } = await supabase
        .from('user_activity')
        .insert(usageRows);

      if (usageInsertError) {
        logError('plan_builder_proxy.usage_reservation_failed', {
          requestId,
          userId: user.id,
          job_id,
          message: usageInsertError.message,
        });
        await markJobFailed(job_id, 'Failed to reserve Plan Builder usage');
        return res.status(500).json({ error: 'Failed to reserve usage', requestId });
      }

      usageReserved = true;
    }

    const n8nPayload = {
      job_id,
      contentGoal: contentGoal || 'Grow followers',
      timePeriod: ['7', '14'].includes(String(timePeriod)) ? String(timePeriod) : '7',
      postingFrequency:
        postingFrequency != null && postingFrequency !== ''
          ? Number(postingFrequency)
          : null,
      platformFocus,
      niche: typeof niche === 'string' ? niche : '',
      targetAudience: typeof targetAudience === 'string' ? targetAudience : '',
      brandVoiceTone: typeof brandVoiceTone === 'string' ? brandVoiceTone : '',
      contentPillars: Array.isArray(contentPillars) ? contentPillars : [],
      followerRange: typeof followerRange === 'string' ? followerRange : '',
      extraContext: extraContext ?? null,
      brandVoice: typeof brandVoice === 'string' ? brandVoice : (typeof brandVoiceTone === 'string' ? brandVoiceTone : ''),
      brandContext: typeof brandContext === 'string' ? brandContext : '',
      trendContext: typeof trendContext === 'string' ? trendContext : '',
      platform_rules_block:
        typeof platform_rules_block === 'string' ? platform_rules_block : '',
      platforms_list:
        typeof platforms_list === 'string'
          ? platforms_list
          : Array.isArray(platformFocus)
            ? platformFocus.join(', ')
            : '',
      profileType: profileType ?? null,
      firstName: firstName ?? null,
      businessPrimaryGoal: businessPrimaryGoal ?? null,
      creatorMonetizationPath: creatorMonetizationPath ?? null,
      isLocalBusiness: typeof isLocalBusiness === 'boolean'
        ? isLocalBusiness : false,
      audienceLocationType: audienceLocationType ?? null,
      contentMixOverride: contentMixOverride ?? null,
      city: city ?? null,
    };

    logInfo('plan_builder_proxy.n8n_outbound', {
      requestId,
      userId: user.id,
      job_id,
      timePeriod: n8nPayload.timePeriod,
      platformFocus: n8nPayload.platformFocus,
      profileType: n8nPayload.profileType,
    });

    // Forward request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
      // Timeout for webhook trigger (should be fast)
      signal: AbortSignal.timeout(30000), // 30 seconds
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      logError('plan_builder_proxy.n8n_http_error', {
        requestId,
        userId: user.id,
        job_id,
        status: response.status,
        statusText: response.statusText,
        snippet: String(errorText).slice(0, 400),
      });
      if (usageReserved) {
        await releasePlanBuilderUsage({ userId: user.id, jobId: job_id });
        await markJobFailed(job_id, `n8n webhook error: ${response.status} ${response.statusText}`);
      }
      return res.status(response.status).json({ 
        error: `n8n webhook error: ${response.status} ${response.statusText}`,
        details: errorText.substring(0, 200),
        requestId
      });
    }

    // Parse response payload when available so malformed workflow responses surface clearly.
    const rawResponse = await response.text().catch(() => '');
    const parsedResponse = rawResponse ? safeJsonParse(rawResponse) : null;

    logInfo('plan_builder_proxy.n8n_inbound', {
      requestId,
      userId: user.id,
      job_id,
      ok: response.ok,
      status: response.status,
      bytes: rawResponse.length,
      parsed: parsedResponse != null,
    });

    if (parsedResponse && parsedResponse.success === false) {
      if (usageReserved) {
        await releasePlanBuilderUsage({ userId: user.id, jobId: job_id });
        await markJobFailed(job_id, parsedResponse.error || 'n8n rejected the request');
      }
      return res.status(502).json({
        error: parsedResponse.error || 'n8n rejected the request',
        requestId
      });
    }
    
    // Return success (n8n will update job via Supabase)
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook triggered successfully',
      job_id: job_id,
      requestId
    });

  } catch (error) {
    if (usageReserved) {
      await releasePlanBuilderUsage({ userId: user.id, jobId: job_id });
      await markJobFailed(job_id, error.message || 'Plan Builder proxy failed');
    }
    logError('plan_builder_proxy.handler_error', {
      requestId,
      userId: user?.id,
      job_id,
      name: error.name,
      message: error.message,
      stack: error.stack?.slice?.(0, 800),
    });

    // Handle timeout errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return res.status(504).json({ 
        error: 'Request timeout: n8n webhook took longer than 30 seconds',
        requestId
      });
    }

    // Handle network errors
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return res.status(502).json({ 
        error: 'Unable to reach n8n webhook. Please check the webhook URL.',
        requestId
      });
    }

    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.',
      requestId
    });
  }
}

