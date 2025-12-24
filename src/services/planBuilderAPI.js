/**
 * Plan Builder API Service
 * 
 * ============================================================================
 * Fire-and-Forget Async Architecture
 * ============================================================================
 * 
 * Flow:
 * 1. Frontend calls createJobDirectly() -> inserts job in Supabase (status: pending)
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
const N8N_WEBHOOK_URL = 'https://huttleai.app.n8n.cloud/webhook/content-calendar-async';

// ============================================================================
// NEW: Direct Supabase Job Creation (Fire-and-Forget Architecture)
// ============================================================================

/**
 * Create a job directly in Supabase (client-side)
 * This bypasses the serverless function for faster job creation.
 * 
 * @param {Object} params - Job parameters
 * @param {string} params.goal - Content goal (e.g., 'Grow followers')
 * @param {number} params.duration - Time period in days (7 or 14)
 * @param {string[]} params.platforms - Selected platforms
 * @param {string} params.niche - User's niche/industry
 * @param {string} params.brandVoice - Brand voice description
 * @returns {Promise<{jobId?: string, error?: Error}>}
 */
export async function createJobDirectly({ goal, duration, platforms, niche, brandVoice }) {
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
        status: 'pending',
        input: {
          goal,
          duration,
          platforms,
          niche: niche || 'general',
          brandVoice: brandVoice || '',
          requestedAt: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating job directly:', error);
      throw error;
    }

    return { jobId: data.id };
  } catch (error) {
    console.error('createJobDirectly failed:', error);
    return { error };
  }
}

/**
 * Trigger n8n webhook with job_id (fire-and-forget)
 * Includes retry logic with exponential backoff.
 * 
 * @param {string} jobId - The job ID to process
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function triggerN8nWebhook(jobId, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      });

      if (response.ok) {
        console.log(`[PlanBuilder] n8n webhook triggered successfully for job: ${jobId}`);
        return { success: true };
      }

      // If not OK but not a network error, log and continue
      console.warn(`[PlanBuilder] n8n webhook returned status ${response.status}, attempt ${attempt + 1}`);
    } catch (err) {
      console.warn(`[PlanBuilder] n8n webhook attempt ${attempt + 1} failed:`, err.message);
      
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  console.error(`[PlanBuilder] n8n webhook failed after ${retries + 1} attempts`);
  return { success: false, error: 'Failed to trigger n8n webhook after retries' };
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





