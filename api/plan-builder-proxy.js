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
const PLAN_BUILDER_CREDITS_BY_FEATURE = {
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
const RESERVATION_SOURCE = 'plan-builder-proxy';

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

async function getActiveSubscription(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { subscription: data, error };
}

async function getMonthlyUsageCount({ userId, feature }) {
  const { count, error } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', getStartOfMonthISO());

  if (error) throw error;
  return count ?? 0;
}

async function getMonthlyCreditUsage(userId) {
  const { count, error } = await supabase
    .from('user_activity')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', 'aiGenerations')
    .or(`metadata->>source.is.null,metadata->>source.neq.${DASHBOARD_GENERATION_SOURCE}`)
    .gte('created_at', getStartOfMonthISO());

  if (error) throw error;
  return count ?? 0;
}

async function hasCompleteReservation({ userId, jobId, featureKey, creditCost }) {
  const { data, error } = await supabase
    .from('user_activity')
    .select('feature, metadata')
    .eq('user_id', userId)
    .contains('metadata', { job_id: jobId, reservation_source: RESERVATION_SOURCE });

  if (error) throw error;

  const hasRun = data?.some(
    (row) => row.feature === featureKey && row.metadata?.reservation_index === 'run'
  );
  const creditIndexes = new Set(
    (data ?? [])
      .filter((row) => row.feature === 'aiGenerations')
      .map((row) => row.metadata?.creditIndex)
      .filter((index) => Number.isInteger(index))
  );
  const hasEveryCredit = Array.from(
    { length: creditCost },
    (_, creditIndex) => creditIndexes.has(creditIndex)
  ).every(Boolean);

  return hasRun && creditIndexes.size === creditCost && hasEveryCredit;
}

async function claimQueuedJob({ userId, jobId }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'running', started_at: now })
    .eq('id', jobId)
    .eq('user_id', userId)
    .eq('type', 'plan_builder')
    .eq('status', 'queued')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function releaseJobClaim({ userId, jobId }) {
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'queued', started_at: null })
    .eq('id', jobId)
    .eq('user_id', userId)
    .eq('type', 'plan_builder')
    .eq('status', 'running');

  if (error) throw error;
}

async function reservePlanBuilderUsage({
  userId,
  jobId,
  featureKey,
  creditCost,
  goal,
  period,
  platformFocus,
}) {
  const timestamp = new Date().toISOString();
  const reservationKey = `${jobId}:${featureKey}`;
  const commonMetadata = {
    job_id: jobId,
    reservation_key: reservationKey,
    reservation_source: RESERVATION_SOURCE,
    goal,
    period,
    platforms: platformFocus,
  };
  const rows = [
    {
      user_id: userId,
      feature: featureKey,
      metadata: {
        ...commonMetadata,
        type: 'run_counter',
        reservation_index: 'run',
      },
      created_at: timestamp,
    },
    ...Array.from({ length: creditCost }, (_, creditIndex) => ({
      user_id: userId,
      feature: 'aiGenerations',
      metadata: {
        ...commonMetadata,
        sourceFeature: featureKey,
        creditIndex,
        overallCredits: creditCost,
        reservation_index: `credit:${creditIndex}`,
      },
      created_at: timestamp,
    })),
  ];

  // PostgREST sends this array as one INSERT statement. PostgreSQL commits
  // every reservation row together or rolls the entire statement back.
  const { error } = await supabase.from('user_activity').insert(rows);
  if (error) throw error;
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
    brand_story_context,
    brandStoryContext,
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
      // IMPORTANT: This field must be mapped to the AI Plan Builder n8n
      // workflow system message node. Verify in n8n that the AI Agent
      // system message references: {{ $json.brand_story_context }}
      // Without this, getBrandStoryContext output never reaches the model.
      brand_story_context: typeof brand_story_context === 'string'
        ? brand_story_context
        : (typeof brandStoryContext === 'string' ? brandStoryContext : ''),
      brandStoryContext: typeof brandStoryContext === 'string'
        ? brandStoryContext
        : (typeof brand_story_context === 'string' ? brand_story_context : ''), // HUTTLE AI: userBrandType-based content philosophy
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

    const { data: job, error: jobLookupError } = await supabase
      .from('jobs')
      .select('id, user_id, type, status, input')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (jobLookupError) {
      logError('plan_builder_proxy.job_lookup_failed', {
        requestId,
        userId: user.id,
        job_id,
        message: jobLookupError.message,
      });
      return res.status(500).json({ error: 'Failed to verify Plan Builder job', requestId });
    }

    if (!job) {
      return res.status(404).json({ error: 'Plan Builder job not found', requestId });
    }

    if (job.type !== 'plan_builder') {
      return res.status(400).json({ error: 'Invalid job type for Plan Builder', requestId });
    }

    const requestedPeriod = Number(n8nPayload.timePeriod);
    const storedPeriod = Number(job.input?.timePeriod ?? job.input?.duration ?? job.input?.period);
    if (![7, 14].includes(requestedPeriod) || storedPeriod !== requestedPeriod) {
      return res.status(400).json({
        error: 'Plan period does not match the queued job',
        requestId,
      });
    }

    const { subscription, error: subscriptionError } = await getActiveSubscription(user.id);
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

    const isFourteenDay = requestedPeriod === 14;
    if (isFourteenDay && !PLAN_BUILDER_14DAY_ALLOWED_TIERS.includes(userTier)) {
      return res.status(403).json({
        error: 'tier_restricted',
        message: '14-day plans require Pro or above.',
        requestId,
      });
    }

    const { featureKey, cap } = resolvePlanBuilderCap(requestedPeriod, userTier);
    const creditCost = PLAN_BUILDER_CREDITS_BY_FEATURE[featureKey] ?? 0;

    if (job.status === 'running') {
      const isRetryAfterAcceptedStart = await hasCompleteReservation({
        userId: user.id,
        jobId: job_id,
        featureKey,
        creditCost,
      });

      if (isRetryAfterAcceptedStart) {
        return res.status(200).json({
          success: true,
          alreadyStarted: true,
          job_id,
          requestId,
        });
      }
    }

    if (job.status !== 'queued') {
      return res.status(409).json({
        error: 'Plan Builder job has already started or finished',
        requestId,
      });
    }

    if (cap == null || cap <= 0) {
      return res.status(403).json({
        error: 'Plan Builder not available for this subscription tier.',
        requestId,
      });
    }

    const [runsThisMonth, creditsUsed] = await Promise.all([
      getMonthlyUsageCount({ userId: user.id, feature: featureKey }),
      getMonthlyCreditUsage(user.id),
    ]);
    const poolLimit = TIER_CREDIT_POOLS[userTier] ?? 0;
    const remainingCredits = Math.max(0, poolLimit - creditsUsed);

    if (runsThisMonth >= cap) {
      const periodLabel = isFourteenDay ? '14-day' : '7-day';
      return res.status(429).json({
        error: 'AI usage limit reached',
        message: `You've reached your monthly limit of ${cap} ${periodLabel} plan generations. This allowance resets on the 1st of each month.`,
        currentUsage: runsThisMonth,
        limit: cap,
        requestId,
      });
    }

    if (poolLimit <= 0 || remainingCredits < creditCost) {
      return res.status(429).json({
        error: 'AI credit limit reached',
        message: `This feature uses ${creditCost} credits. You have ${remainingCredits} credits left this month.`,
        remaining: remainingCredits,
        required: creditCost,
        requestId,
      });
    }

    const didClaimJob = await claimQueuedJob({ userId: user.id, jobId: job_id });
    if (!didClaimJob) {
      return res.status(409).json({
        error: 'Plan Builder job is already being started',
        requestId,
      });
    }

    try {
      await reservePlanBuilderUsage({
        userId: user.id,
        jobId: job_id,
        featureKey,
        creditCost,
        goal: n8nPayload.contentGoal,
        period: requestedPeriod,
        platformFocus: n8nPayload.platformFocus,
      });
    } catch (reservationError) {
      logError('plan_builder_proxy.usage_reservation_failed', {
        requestId,
        userId: user.id,
        job_id,
        featureKey,
        message: reservationError.message,
        code: reservationError.code,
      });

      try {
        await releaseJobClaim({ userId: user.id, jobId: job_id });
      } catch (releaseError) {
        logError('plan_builder_proxy.claim_release_failed', {
          requestId,
          userId: user.id,
          job_id,
          message: releaseError.message,
        });
      }

      return res.status(500).json({ error: 'Failed to reserve usage', requestId });
    }

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

