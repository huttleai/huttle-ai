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
import { authenticateBillingRequest } from './_utils/billing.js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import { logInfo, logError } from './_utils/observability.js';
import {
  AI_CREDIT_POOL_BY_TIER,
  DASHBOARD_GENERATION_SOURCE,
  PLAN_BUILDER_14DAY_ALLOWED_TIERS,
  PLAN_BUILDER_CREDIT_COST_BY_FEATURE,
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
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth.toISOString();
}

function createHttpError(statusCode, message, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function buildUsageRows({ userId, jobId, featureKey, creditCost, contentGoal, timePeriod, platformFocus }) {
  const now = new Date().toISOString();
  const baseMetadata = {
    source: 'plan-builder-proxy',
    job_id: jobId,
    goal: contentGoal,
    period: timePeriod,
    platforms: platformFocus,
  };

  const rows = [
    {
      user_id: userId,
      feature: featureKey,
      metadata: {
        ...baseMetadata,
        type: 'run_counter',
      },
      created_at: now,
    },
  ];

  for (let creditIndex = 0; creditIndex < creditCost; creditIndex += 1) {
    rows.push({
      user_id: userId,
      feature: 'aiGenerations',
      metadata: {
        ...baseMetadata,
        sourceFeature: featureKey,
        creditIndex,
        overallCredits: creditCost,
      },
      created_at: now,
    });
  }

  return rows;
}

async function reservePlanBuilderUsage({ userId, jobId, contentGoal, timePeriod, platformFocus, requestId }) {
  const [{ data: job, error: jobError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, user_id, type, status')
      .eq('id', jobId)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (jobError) {
    logError('plan_builder_proxy.job_lookup_failed', { requestId, userId, jobId, error: jobError.message });
    throw createHttpError(500, 'Failed to verify job ownership');
  }

  if (!job) {
    throw createHttpError(404, 'Plan Builder job not found');
  }

  if (job.user_id !== userId || job.type !== 'plan_builder') {
    logError('plan_builder_proxy.job_ownership_mismatch', {
      requestId,
      userId,
      jobId,
      jobUserId: job.user_id,
      jobType: job.type,
    });
    throw createHttpError(403, 'You can only run your own Plan Builder jobs');
  }

  if (subscriptionError) {
    logError('plan_builder_proxy.subscription_lookup_failed', { requestId, userId, error: subscriptionError.message });
    throw createHttpError(500, 'Failed to verify subscription');
  }

  const userTier = subscription?.tier || null;
  if (!userTier) {
    throw createHttpError(403, 'Active subscription required');
  }

  const isFourteenDay = Number(timePeriod) === 14;
  if (isFourteenDay && !PLAN_BUILDER_14DAY_ALLOWED_TIERS.includes(userTier)) {
    throw createHttpError(403, '14-day plans require Pro or above');
  }

  const { featureKey, cap } = resolvePlanBuilderCap(timePeriod, userTier);
  const creditCost = PLAN_BUILDER_CREDIT_COST_BY_FEATURE[featureKey] ?? 0;
  const poolLimit = AI_CREDIT_POOL_BY_TIER[userTier] ?? 0;

  if (!cap || cap <= 0 || !poolLimit || poolLimit <= 0) {
    throw createHttpError(403, 'Plan Builder is not available for this subscription tier');
  }

  const startOfMonth = getStartOfMonthISO();
  const [{ count: runCount, error: runCountError }, { count: creditCount, error: creditCountError }] = await Promise.all([
    supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', featureKey)
      .gte('created_at', startOfMonth),
    supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', 'aiGenerations')
      .or(`metadata->>source.is.null,metadata->>source.neq.${DASHBOARD_GENERATION_SOURCE}`)
      .gte('created_at', startOfMonth),
  ]);

  if (runCountError || creditCountError) {
    logError('plan_builder_proxy.usage_count_failed', {
      requestId,
      userId,
      jobId,
      runCountError: runCountError?.message,
      creditCountError: creditCountError?.message,
    });
    throw createHttpError(500, 'Failed to verify usage limits');
  }

  if ((runCount ?? 0) >= cap) {
    throw createHttpError(429, 'AI usage limit reached', {
      currentUsage: runCount ?? 0,
      limit: cap,
    });
  }

  if ((creditCount ?? 0) + creditCost > poolLimit) {
    throw createHttpError(429, 'AI credit limit reached', {
      currentUsage: creditCount ?? 0,
      limit: poolLimit,
    });
  }

  const { error: insertError } = await supabase.from('user_activity').insert(
    buildUsageRows({ userId, jobId, featureKey, creditCost, contentGoal, timePeriod, platformFocus })
  );

  if (insertError) {
    logError('plan_builder_proxy.usage_reservation_failed', {
      requestId,
      userId,
      jobId,
      featureKey,
      error: insertError.message,
    });
    throw createHttpError(500, 'Failed to reserve usage');
  }

  return { featureKey, creditCost };
}

async function releasePlanBuilderUsage({ userId, jobId, featureKey, requestId }) {
  const { error } = await supabase
    .from('user_activity')
    .delete()
    .eq('user_id', userId)
    .in('feature', [featureKey, 'aiGenerations'])
    .contains('metadata', { source: 'plan-builder-proxy', job_id: jobId });

  if (error) {
    logError('plan_builder_proxy.usage_release_failed', {
      requestId,
      userId,
      jobId,
      featureKey,
      error: error.message,
    });
  }
}

async function markPlanBuilderJobFailed({ userId, jobId, reason }) {
  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'failed',
      error_message: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('user_id', userId);

  if (error) {
    logError('plan_builder_proxy.job_failed_mark_failed', { userId, jobId, error: error.message });
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
  if (!supabase) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const authResult = await authenticateBillingRequest(req, supabase);
  if (authResult.error || !authResult.user) {
    return res.status(authResult.statusCode).json({ error: authResult.error });
  }
  const { user } = authResult;

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

  let usageReservation = null;

  try {
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

    usageReservation = await reservePlanBuilderUsage({
      userId: user.id,
      jobId: job_id,
      contentGoal: n8nPayload.contentGoal,
      timePeriod: n8nPayload.timePeriod,
      platformFocus: n8nPayload.platformFocus,
      requestId,
    });

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
      await releasePlanBuilderUsage({
        userId: user.id,
        jobId: job_id,
        featureKey: usageReservation.featureKey,
        requestId,
      });
      await markPlanBuilderJobFailed({
        userId: user.id,
        jobId: job_id,
        reason: `n8n webhook error: ${response.status} ${response.statusText}`,
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
      await releasePlanBuilderUsage({
        userId: user.id,
        jobId: job_id,
        featureKey: usageReservation.featureKey,
        requestId,
      });
      await markPlanBuilderJobFailed({
        userId: user.id,
        jobId: job_id,
        reason: parsedResponse.error || 'n8n rejected the request',
      });
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
      usageReserved: true,
      requestId
    });

  } catch (error) {
    if (usageReservation?.featureKey) {
      await releasePlanBuilderUsage({
        userId: user.id,
        jobId: job_id,
        featureKey: usageReservation.featureKey,
        requestId,
      });
      await markPlanBuilderJobFailed({
        userId: user.id,
        jobId: job_id,
        reason: error.message || 'Plan generation failed before n8n accepted the job',
      });
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : null;

    logError('plan_builder_proxy.handler_error', {
      requestId,
      userId: user?.id,
      job_id,
      name: error.name,
      message: error.message,
      stack: error.stack?.slice?.(0, 800),
    });

    if (statusCode) {
      return res.status(statusCode).json({
        error: error.message,
        currentUsage: error.currentUsage,
        limit: error.limit,
        requestId,
      });
    }

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

