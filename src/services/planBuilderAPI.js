/**
 * Plan Builder API Service
 * 
 * ============================================================================
 * Fire-and-Forget Async Architecture
 * ============================================================================
 * 
 * Flow:
 * 1. Frontend calls createJobDirectly() -> inserts job in Supabase (status: queued)
 * 2. Frontend calls triggerN8nWebhook() -> fires job_id to n8n (no wait)
 * 3. Frontend subscribes to Supabase Realtime for job updates
 * 4. n8n processes job and updates Supabase when complete
 * 5. Frontend receives update via Realtime, renders optimized schedule
 * 
 * See:
 * - src/pages/AIPlanBuilder.jsx (main component)
 * - docs/n8n/N8N-WORKFLOW-FEATURES.md (workflow specification)
 */

import { supabase } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
// N8N Webhook URL for Plan Builder (via serverless proxy to avoid CORS)
const N8N_PLAN_BUILDER_WEBHOOK_URL = '/api/plan-builder-proxy';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ============================================================================
// NEW: Direct Supabase Job Creation (Fire-and-Forget Architecture)
// ============================================================================

/**
 * Create a job directly in Supabase (client-side)
 * This bypasses the serverless function for faster job creation.
 * 
 * @param {Object} params - Job parameters (stored on `jobs.input` JSON)
 * @param {string} params.contentGoal - Content goal
 * @param {number} params.timePeriod - 7 or 14
 * @param {number} params.postingFrequency - Posts per week
 * @param {string[]} params.platformFocus - Platform names
 * @param {string} params.niche
 * @param {string} params.targetAudience
 * @param {string} params.brandVoiceTone
 * @param {string[]} params.contentPillars
 * @param {string} params.followerRange - e.g. "0-500"
 * @param {string|null} [params.extraContext]
 * @param {string} [params.trendContext]
 * @param {string} [params.platform_rules_block]
 * @returns {Promise<{jobId?: string, error?: Error}>}
 */
export async function createJobDirectly({
  contentGoal,
  timePeriod,
  postingFrequency,
  platformFocus,
  niche,
  targetAudience,
  brandVoiceTone,
  contentPillars,
  followerRange,
  extraContext = null,
  trendContext = '',
  platform_rules_block = '',
  businessName = '',
  brandName = '',
  website = '',
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        user_id: session.user.id,
        type: 'plan_builder',
        status: 'queued', // DB lifecycle: queued → running → completed/failed
        input: {
          goal: contentGoal,
          niche,
          duration: timePeriod,
          timePeriod,
          platforms: platformFocus,
          brandVoice: brandVoiceTone,
          brandVoiceTone,
          targetAudience,
          contentPillars,
          postingFrequency,
          followerRange,
          extraContext: extraContext || '',
          requestedAt: new Date().toISOString(),
          // Aliases / extended fields used by UI and n8n
          contentGoal,
          platformFocus,
          trendContext: trendContext || '',
          platform_rules_block: typeof platform_rules_block === 'string' ? platform_rules_block : '',
          businessName: typeof businessName === 'string' ? businessName : '',
          brandName: typeof brandName === 'string' ? brandName : '',
          website: typeof website === 'string' ? website : '',
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating job directly:', error);
      // Provide actionable error messages for common issues
      if (error.message?.includes('row-level security') || error.code === '42501' || error.code === '42000') {
        console.error('[PlanBuilder] RLS policy issue on jobs table. Verify migrations have been applied.');
        throw new Error('Permission error creating job. The database security policies may need to be updated. Please contact support.');
      }
      if (error.message?.includes('violates foreign key') || error.code === '23503') {
        console.error('[PlanBuilder] FK constraint error — user may not exist in referenced table');
        throw new Error('Account setup incomplete. Please try logging out and back in.');
      }
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.error('[PlanBuilder] Jobs table does not exist. Database migration needed.');
        throw new Error('Feature not yet configured. Please contact support.');
      }
      throw error;
    }

    return { jobId: data.id };
  } catch (error) {
    console.error('createJobDirectly failed:', error);
    return { error };
  }
}

/**
 * Trigger n8n webhook with job_id and form data (fire-and-forget)
 * Includes retry logic with exponential backoff.
 * 
 * @param {string} jobId - The job ID to process (valid UUID)
 * @param {Object} formData - Form data to send to n8n
 * @param {string} formData.contentGoal - Content goal (e.g., 'Grow followers')
 * @param {string} formData.timePeriod - Time period ('7' or '14')
 * @param {string[]} formData.platformFocus - Selected platforms array
 * @param {string} formData.brandVoice - Brand voice description
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function triggerN8nWebhook(jobId, formData = {}, retries = 2) {
  // Validate webhook URL is configured
  if (!N8N_PLAN_BUILDER_WEBHOOK_URL || N8N_PLAN_BUILDER_WEBHOOK_URL.trim() === '') {
    console.error('[PlanBuilder] Webhook URL is not configured');
    return { success: false, error: 'Webhook URL not configured' };
  }

  // Validate job_id is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!jobId || !uuidRegex.test(jobId)) {
    console.error('[PlanBuilder] Invalid job_id format. Expected UUID, got:', jobId);
    return { success: false, error: 'Invalid job_id format. Must be a valid UUID.' };
  }

  // Build the complete payload
  const platformFocus = formData.platformFocus || formData.platforms || [];
  const payload = {
    job_id: jobId,
    contentGoal: formData.contentGoal || formData.goal || 'Grow followers',
    timePeriod: String(formData.timePeriod || formData.duration || '7'),
    postingFrequency: formData.postingFrequency != null ? Number(formData.postingFrequency) : null,
    platformFocus,
    niche: formData.niche ?? '',
    targetAudience: formData.targetAudience ?? '',
    brandVoiceTone: formData.brandVoiceTone ?? formData.brandVoice ?? '',
    contentPillars: Array.isArray(formData.contentPillars) ? formData.contentPillars : [],
    followerRange: formData.followerRange ?? '',
    extraContext: formData.extraContext ?? null,
    brandVoice: formData.brandVoice || formData.brandVoiceTone || '',
    brandContext: typeof formData.brandContext === 'string' ? formData.brandContext : '',
    trendContext: formData.trendContext || '',
    platform_rules_block: typeof formData.platform_rules_block === 'string' ? formData.platform_rules_block : '',
    platforms_list:
      typeof formData.platforms_list === 'string'
        ? formData.platforms_list
        : Array.isArray(platformFocus)
          ? platformFocus.join(', ')
          : '',
  };

  if (import.meta.env.DEV) {
    console.log('[PlanBuilder] n8n webhook payload (keys + sizes):', {
      ...payload,
      brandContext: payload.brandContext ? `${payload.brandContext.slice(0, 120)}…` : '',
      platform_rules_block: payload.platform_rules_block
        ? `${payload.platform_rules_block.slice(0, 160)}…`
        : '',
    });
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Include auth headers for the proxy endpoint
      const requestHeaders = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          requestHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (e) {
        console.warn('[PlanBuilder] Could not get auth session:', e.message);
      }

      const response = await fetch(N8N_PLAN_BUILDER_WEBHOOK_URL, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
        mode: 'cors'
      });

      if (response.ok) {
        const responseText = await response.text().catch(() => '');
        const parsedResponse = responseText ? safeJsonParse(responseText) : null;

        if (parsedResponse && parsedResponse.success === false) {
          console.error('[PlanBuilder] Proxy returned success=false:', parsedResponse);
          return {
            success: false,
            error: parsedResponse.error || 'Webhook proxy rejected the request',
          };
        }

        return { success: true };
      }

      // If not OK, get error details
      const errorText = await response.text().catch(() => 'No error details');
      console.warn(`[PlanBuilder] n8n webhook returned status ${response.status}, attempt ${attempt + 1}`);
      console.warn(`[PlanBuilder] Error response:`, errorText.substring(0, 200));
      
      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        console.error(`[PlanBuilder] Client error (${response.status}), stopping retries`);
        return { success: false, error: 'Unable to generate your plan right now. Please try again.' };
      }
    } catch (err) {
      console.error(`[PlanBuilder] ====== FETCH ERROR (Attempt ${attempt + 1}) ======`);
      console.error(`[PlanBuilder] Error name:`, err.name);
      console.error(`[PlanBuilder] Error message:`, err.message);
      console.error(`[PlanBuilder] Error stack:`, err.stack);
      console.error(`[PlanBuilder] ===============================================`);
      
      // Check for CORS errors specifically
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        console.error('[PlanBuilder] CORS or network error - check webhook URL and CORS settings');
        if (attempt === retries) {
          return { success: false, error: 'CORS_ERROR: ' + err.message };
        }
      }
      
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[PlanBuilder] n8n webhook failed after ${retries + 1} attempts`);
  return { success: false, error: 'Plan generation service is temporarily unavailable. Please try again in a moment.' };
}

// ============================================================================
// LEGACY: Serverless Function Job Creation (kept for backwards compatibility)
// ============================================================================

/**
 * Create a new Plan Builder job
 * @param {Object} params - Job parameters
 * @param {string} params.goal - Content goal (e.g., 'Grow followers')
 * @param {string} params.period - Time period ('7 days' or '14 days')
 * @param {string[]} params.platforms - Selected platforms
 * @param {string} params.niche - User's niche/industry
 * @param {string|null} params.brandVoiceId - Brand voice ID if available
 * @returns {Promise<{success: boolean, jobId?: string, status?: string, error?: string}>}
 */
export async function createPlanBuilderJob({ goal, period, platforms, niche, brandVoiceId }) {
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/create-plan-builder-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        goal,
        period,
        platforms,
        niche,
        brandVoiceId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to create job');
    }

    return {
      success: true,
      jobId: data.jobId,
      status: data.status
    };

  } catch (error) {
    console.error('Error creating plan builder job:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get job status (polling method)
 * @param {string} jobId - Job ID
 * @returns {Promise<{success: boolean, job?: Object, error?: string}>}
 */
export async function getJobStatus(jobId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/get-job-status?jobId=${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get job status');
    }

    return {
      success: true,
      job: data.job
    };

  } catch (error) {
    console.error('Error getting job status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Subscribe to job updates via Supabase Realtime
 * @param {string} jobId - Job ID to subscribe to
 * @param {Function} callback - Callback function called when job updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToJob(jobId, callback) {
  const channel = supabase
    .channel(`job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}





