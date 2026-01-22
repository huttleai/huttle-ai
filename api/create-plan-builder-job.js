/**
 * Vercel Serverless Function: Create Plan Builder Job
 * 
 * This endpoint creates an async job for AI Plan Builder generation.
 * It validates auth, checks usage limits, creates a job record, and triggers n8n.
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for backend operations
);

const N8N_WEBHOOK_URL = process.env.N8N_PLAN_BUILDER_WEBHOOK_URL;

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Extract auth token and verify user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;

    // 2. Get user's subscription tier
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .maybeSingle();

    const userTier = subscription?.tier || 'free';

    // 3. Check AI usage limits before accepting job
    // Count user_activity rows for this feature in current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: usageData, error: usageError } = await supabase
      .from('user_activity')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('feature', 'aiPlanBuilder')
      .gte('created_at', startOfMonth.toISOString());

    const currentUsage = usageData?.length || 0;
    
    // Define limits per tier
    const limits = {
      free: 3, // 3 plan generations per month
      essentials: 20,
      pro: Infinity
    };

    const limit = limits[userTier] || limits.free;

    if (currentUsage >= limit && limit !== Infinity) {
      return res.status(429).json({ 
        error: 'AI usage limit reached',
        message: `You've reached your monthly limit of ${limit} AI Plan generations. Upgrade to generate more!`,
        currentUsage,
        limit
      });
    }

    // 4. Extract and validate input from request
    const { goal, period, platforms, niche, brandVoiceId } = req.body;

    if (!goal || !period || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: goal, period, and platforms are required' });
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
      console.error('Error creating job:', jobError);
      // SECURITY: Don't expose internal error details to client
      return res.status(500).json({ error: 'Failed to create job. Please try again.' });
    }

    // 6. Call n8n webhook to start processing (non-blocking)
    if (N8N_WEBHOOK_URL) {
      try {
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
          })
        });

        if (!n8nResponse.ok) {
          console.error('n8n webhook failed:', await n8nResponse.text());
          // Don't fail the request - n8n might pick it up via polling
        }
      } catch (n8nError) {
        console.error('Error calling n8n webhook:', n8nError);
        // Don't fail the request - n8n might pick it up via polling
      }
    } else {
      console.warn('N8N_PLAN_BUILDER_WEBHOOK_URL not configured - job created but n8n webhook not called');
    }

    // 7. Track the usage immediately (reserved slot)
    await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        feature: 'aiPlanBuilder',
        metadata: {
          job_id: job.id,
          goal,
          period,
          platforms
        }
      });

    // 8. Return job ID to frontend
    return res.status(200).json({
      success: true,
      jobId: job.id,
      status: 'queued',
      message: 'Plan generation started'
    });

  } catch (error) {
    console.error('Error in create-plan-builder-job:', error);
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.'
    });
  }
}














