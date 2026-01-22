/**
 * Vercel Serverless Function: Get Job Status
 * 
 * This endpoint allows the frontend to poll for job status updates.
 * Used as a fallback if Supabase Realtime subscriptions don't work.
 */

import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, handlePreflight } from './_utils/cors.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Set secure CORS headers
  setCorsHeaders(req, res);

  // Handle preflight requests
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId parameter' });
    }

    // Fetch job - RLS will ensure user can only see their own jobs
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        input: job.input,
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at
      }
    });

  } catch (error) {
    console.error('Error in get-job-status:', error);
    // SECURITY: Don't expose internal error details to client
    return res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.'
    });
  }
}














