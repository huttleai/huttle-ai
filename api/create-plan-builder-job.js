/**
 * Vercel Serverless Function: Create Plan Builder Job
 * 
 * This endpoint creates an async job for AI Plan Builder generation.
 * It validates auth, checks usage limits, creates a job record, and triggers n8n.
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';
import {
  PLAN_BUILDER_14DAY_ALLOWED_TIERS,
  resolvePlanBuilderCap,
} from './_utils/planBuilderLimits.js';
import { logInfo, logWarn, logError } from './_utils/observability.js';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];

// SECURITY: Use non-VITE_ prefixed URL for server-side code, with fallback for backwards compatibility
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

const N8N_WEBHOOK_URL = process.env.N8N_PLAN_BUILDER_WEBHOOK_URL || process.env.N8N_PLAN_BUILDER_WEBHOOK || process.env.VITE_N8N_PLAN_BUILDER_WEBHOOK;

export default async function handler(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate services are configured
  if (!supabase) {
    logError('create_plan_builder_job.supabase_not_configured', { requestId });
    return res.status(500).json({ error: 'Service not configured', requestId });
  }

  try {
    // 1. Extract auth token and verify user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const bearerMatch = /^Bearer\s+(\S+)/i.exec(String(authHeader).trim());
    const token = bearerMatch ? bearerMatch[1] : null;
    if (!token) {
      return res.status(401).json({ error: 'Invalid authorization header' });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    // 2. Get user's subscription tier
    const { data: subscription, error: subLookupError } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subLookupError) {
      logError('create_plan_builder_job.subscription_lookup_failed', {
        requestId,
        userId,
        message: subLookupError.message,
      });
      return res.status(500).json({ error: 'Failed to verify subscription', requestId });
    }

    const userTier = subscription?.tier || null;

    if (!userTier) {
      return res.status(403).json({
        error: 'Active subscription required',
        message: 'Choose a plan to use AI Plan Builder.',
      });
    }

    // 3. Extract and validate input FIRST (the per-period tier gate below
    //    needs to know whether this is a 7-day or 14-day request before we
    //    even run the usage count query).
    const { goal, period, platforms, niche, brandVoiceId } = req.body;

    if (!goal || !period || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: goal, period, and platforms are required' });
    }

    // 3a. 14-day tier gate — Essentials cannot request 14-day plans.
    //     Matches creditConfig.PLAN_BUILDER_14DAY_TIERS on the client.
    const isFourteenDay = Number(period) === 14;
    if (isFourteenDay && !PLAN_BUILDER_14DAY_ALLOWED_TIERS.includes(userTier)) {
      logWarn('create_plan_builder_job.tier_restricted_14day', {
        requestId,
        userId,
        userTier,
      });
      return res.status(403).json({
        error: 'tier_restricted',
        message: '14-day plans require Pro or above.',
      });
    }

    // 3b. Per-period monthly run cap check.
    const { featureKey, cap } = resolvePlanBuilderCap(period, userTier);
    if (cap == null || cap <= 0) {
      return res.status(403).json({
        error: 'Plan Builder not available for this subscription tier.',
      });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usageCount, error: usageCountError } = await supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', featureKey)
      .gte('created_at', startOfMonth.toISOString());

    if (usageCountError) {
      logError('create_plan_builder_job.usage_count_failed', {
        requestId,
        userId,
        message: usageCountError.message,
      });
      return res.status(500).json({ error: 'Failed to verify usage limits', requestId });
    }

    const currentUsage = usageCount ?? 0;

    if (currentUsage >= cap) {
      const periodLabel = isFourteenDay ? '14-day' : '7-day';
      return res.status(429).json({
        error: 'AI usage limit reached',
        message: `You've reached your monthly limit of ${cap} ${periodLabel} plan generations. This allowance resets on the 1st of each month.`,
        currentUsage,
        limit: cap,
      });
    }

    // 5. Create job record in Supabase
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: userId,
        type: 'plan_builder',
        status: 'queued',
        input: {
          goal,
          period,
          platforms,
          niche: niche || 'general',
          brandVoiceId: brandVoiceId || null,
          userTier,
          requestedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (jobError) {
      logError('create_plan_builder_job.job_insert_failed', {
        requestId,
        userId,
        message: jobError.message,
        code: jobError.code,
      });
      // SECURITY: Don't expose internal error details to client
      return res.status(500).json({ error: 'Failed to create job. Please try again.' });
    }

    // 6. Call n8n webhook to start processing (non-blocking)
    if (N8N_WEBHOOK_URL) {
      try {
        logInfo('create_plan_builder_job.n8n_outbound', {
          requestId,
          userId,
          jobId: job.id,
          period,
          platforms,
        });

        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_id: job.id,
            user_id: userId,
            job_type: 'plan_builder',
            input: job.input
          }),
          // Bound the trigger call so a slow/hung n8n doesn't keep the
          // Vercel function alive until the platform timeout (~300s).
          // The job remains in 'queued' on abort — identical to the
          // prior non-ok/throw branches below.
          signal: AbortSignal.timeout(30000),
        });

        if (!n8nResponse.ok) {
          const errorText = await n8nResponse.text().catch(() => '');
          logError('create_plan_builder_job.n8n_http_error', {
            requestId,
            userId,
            jobId: job.id,
            status: n8nResponse.status,
            statusText: n8nResponse.statusText,
            snippet: String(errorText).slice(0, 400),
          });
          // Don't fail the request - n8n might pick it up via polling
        } else {
          logInfo('create_plan_builder_job.n8n_inbound', {
            requestId,
            userId,
            jobId: job.id,
            ok: true,
            status: n8nResponse.status,
          });
        }
      } catch (n8nError) {
        logError('create_plan_builder_job.n8n_fetch_failed', {
          requestId,
          userId,
          jobId: job.id,
          name: n8nError?.name,
          message: n8nError?.message,
        });
        // Don't fail the request - n8n might pick it up via polling
      }
    } else {
      logWarn('create_plan_builder_job.webhook_not_configured', {
        requestId,
        userId,
        jobId: job.id,
      });
    }

    // 7. Track the usage immediately (reserved slot).
    //    NOTE: the client's useAIUsage hook also writes credit rows when the
    //    job is queued. This server row is the authoritative RUN COUNTER
    //    consulted by the pre-flight cap check above; it uses the same
    //    per-period featureKey so 7-day and 14-day counts stay separate.
    const { error: usageTrackError } = await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        feature: featureKey,
        metadata: {
          type: 'run_counter',
          job_id: job.id,
          goal,
          period,
          platforms,
          source: 'create-plan-builder-job',
        },
      });
    if (usageTrackError) {
      logError('create_plan_builder_job.usage_track_failed', {
        requestId,
        userId,
        jobId: job.id,
        message: usageTrackError.message,
        code: usageTrackError.code,
      });
    }

    // 8. Return job ID to frontend
    return res.status(200).json({
      success: true,
      jobId: job.id,
      status: 'queued',
      message: 'Plan generation started',
      usageTracked: !usageTrackError,
      requestId
    });

  } catch (error) {
    logError('create_plan_builder_job.handler_error', {
      requestId,
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.slice?.(0, 800),
    });
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.',
      requestId
    });
  }
}














