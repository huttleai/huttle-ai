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
import {
  DASHBOARD_GENERATION_SOURCE,
  PLAN_BUILDER_14DAY_ALLOWED_TIERS,
  PLAN_BUILDER_CREDIT_COST_BY_PERIOD,
  PLAN_BUILDER_CREDIT_POOLS_BY_TIER,
  resolvePlanBuilderCap,
} from './_utils/planBuilderLimits.js';
import { logInfo, logWarn, logError } from './_utils/observability.js';

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

function getStartOfMonthISO() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

async function reservePlanBuilderUsage({ requestId, userId, jobId, period }) {
  const periodNumber = Number(period) === 14 ? 14 : 7;
  const { featureKey } = resolvePlanBuilderCap(periodNumber, null);
  const creditCost = PLAN_BUILDER_CREDIT_COST_BY_PERIOD[periodNumber] ?? 0;
  const startOfMonth = getStartOfMonthISO();

  const { data: existingReservation, error: existingReservationError } = await supabase
    .from('user_activity')
    .select('id')
    .eq('user_id', userId)
    .eq('feature', featureKey)
    .filter('metadata->>job_id', 'eq', jobId)
    .maybeSingle();

  if (existingReservationError && existingReservationError.code !== 'PGRST116') {
    logError('plan_builder_proxy.reservation_lookup_failed', {
      requestId,
      userId,
      jobId,
      error: existingReservationError.message,
    });
    return { ok: false, status: 500, body: { error: 'Failed to verify usage reservation', requestId } };
  }

  if (existingReservation) {
    return { ok: true, alreadyReserved: true };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    logError('plan_builder_proxy.subscription_lookup_failed', {
      requestId,
      userId,
      error: subscriptionError.message,
    });
    return { ok: false, status: 500, body: { error: 'Failed to verify subscription', requestId } };
  }

  const userTier = subscription?.tier || null;
  if (!userTier) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Active subscription required', message: 'Choose a plan to use AI Plan Builder.', requestId },
    };
  }

  if (periodNumber === 14 && !PLAN_BUILDER_14DAY_ALLOWED_TIERS.includes(userTier)) {
    return {
      ok: false,
      status: 403,
      body: { error: 'tier_restricted', message: '14-day plans require Pro or above.', requestId },
    };
  }

  const tierCap = resolvePlanBuilderCap(periodNumber, userTier);
  if (tierCap.cap == null || tierCap.cap <= 0) {
    return {
      ok: false,
      status: 403,
      body: { error: 'Plan Builder not available for this subscription tier.', requestId },
    };
  }

  const { count: runCount, error: runCountError } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', tierCap.featureKey)
    .gte('created_at', startOfMonth);

  if (runCountError) {
    logError('plan_builder_proxy.run_count_failed', {
      requestId,
      userId,
      featureKey: tierCap.featureKey,
      error: runCountError.message,
    });
    return { ok: false, status: 500, body: { error: 'Failed to verify usage limits', requestId } };
  }

  if ((runCount ?? 0) >= tierCap.cap) {
    const periodLabel = periodNumber === 14 ? '14-day' : '7-day';
    return {
      ok: false,
      status: 429,
      body: {
        error: 'AI usage limit reached',
        message: `You've reached your monthly limit of ${tierCap.cap} ${periodLabel} plan generations. This allowance resets on the 1st of each month.`,
        currentUsage: runCount ?? 0,
        limit: tierCap.cap,
        requestId,
      },
    };
  }

  const { count: creditCount, error: creditCountError } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'aiGenerations')
    .or(`metadata->>source.is.null,metadata->>source.neq.${DASHBOARD_GENERATION_SOURCE}`)
    .gte('created_at', startOfMonth);

  if (creditCountError) {
    logError('plan_builder_proxy.credit_count_failed', {
      requestId,
      userId,
      error: creditCountError.message,
    });
    return { ok: false, status: 500, body: { error: 'Failed to verify credit balance', requestId } };
  }

  const creditPool = PLAN_BUILDER_CREDIT_POOLS_BY_TIER[userTier] ?? 0;
  const creditsUsed = creditCount ?? 0;
  if (creditPool > 0 && creditsUsed + creditCost > creditPool) {
    return {
      ok: false,
      status: 429,
      body: {
        error: 'Credit pool exhausted',
        message: `This feature uses ${creditCost} credits. You have ${Math.max(0, creditPool - creditsUsed)} credits left this month.`,
        remaining: Math.max(0, creditPool - creditsUsed),
        required: creditCost,
        requestId,
      },
    };
  }

  const now = new Date().toISOString();
  const rows = [
    {
      user_id: userId,
      feature: tierCap.featureKey,
      metadata: {
        type: 'run_counter',
        job_id: jobId,
        period: periodNumber,
        source: 'plan-builder-proxy',
      },
      created_at: now,
    },
    ...Array.from({ length: creditCost }, (_, creditIndex) => ({
      user_id: userId,
      feature: 'aiGenerations',
      metadata: {
        sourceFeature: tierCap.featureKey,
        job_id: jobId,
        creditIndex,
        overallCredits: creditCost,
        source: 'plan-builder-proxy',
      },
      created_at: now,
    })),
  ];

  const { error: reservationError } = await supabase.from('user_activity').insert(rows);
  if (reservationError) {
    logError('plan_builder_proxy.reservation_insert_failed', {
      requestId,
      userId,
      jobId,
      featureKey: tierCap.featureKey,
      error: reservationError.message,
    });
    return { ok: false, status: 500, body: { error: 'Failed to reserve usage', requestId } };
  }

  return { ok: true, alreadyReserved: false };
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

  try {
    const normalizedTimePeriod = ['7', '14'].includes(String(timePeriod)) ? String(timePeriod) : '7';
    const { data: jobRecord, error: jobLookupError } = await supabase
      .from('jobs')
      .select('id, user_id, type')
      .eq('id', job_id)
      .maybeSingle();

    if (jobLookupError && jobLookupError.code !== 'PGRST116') {
      logError('plan_builder_proxy.job_lookup_failed', {
        requestId,
        userId: user.id,
        job_id,
        error: jobLookupError.message,
      });
      return res.status(500).json({ error: 'Failed to verify job ownership', requestId });
    }

    if (!jobRecord) {
      return res.status(404).json({ error: 'Plan Builder job not found', requestId });
    }

    if (jobRecord.user_id !== user.id || jobRecord.type !== 'plan_builder') {
      logWarn('plan_builder_proxy.job_owner_mismatch', {
        requestId,
        userId: user.id,
        job_id,
        jobOwner: jobRecord.user_id,
        jobType: jobRecord.type,
      });
      return res.status(403).json({ error: 'You can only trigger your own Plan Builder jobs', requestId });
    }

    const usageReservation = await reservePlanBuilderUsage({
      requestId,
      userId: user.id,
      jobId: job_id,
      period: normalizedTimePeriod,
    });

    if (!usageReservation.ok) {
      return res.status(usageReservation.status).json(usageReservation.body);
    }

    const n8nPayload = {
      job_id,
      contentGoal: contentGoal || 'Grow followers',
      timePeriod: normalizedTimePeriod,
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

