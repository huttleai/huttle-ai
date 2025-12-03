/**
 * Plan Builder API Service
 * 
 * Handles async job creation and status polling for AI Plan Builder feature.
 * Uses Supabase Realtime subscriptions with polling fallback.
 */

import { supabase } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

