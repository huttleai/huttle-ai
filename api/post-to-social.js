import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Supported platforms (must match n8n workflow)
const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postData, userId } = req.body;

    // Validate required fields
    if (!postData || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: postData and userId'
      });
    }

    // Validate post data structure
    const { title, caption, platforms, scheduledDate, scheduledTime } = postData;
    if (!title || !platforms || platforms.length === 0) {
      return res.status(400).json({
        error: 'Post must have title and at least one platform'
      });
    }

    // Check which platforms the user has connected
    const { data: connections, error: connectionError } = await supabase
      .from('social_connections')
      .select('platform')
      .eq('user_id', userId)
      .eq('is_connected', true);

    if (connectionError) {
      console.error('Error checking connections:', connectionError);
      return res.status(500).json({ error: 'Failed to check connections' });
    }

    const connectedPlatforms = connections?.map(c => c.platform) || [];

    // Filter to only connected platforms
    const validPlatforms = platforms.filter(platform =>
      SUPPORTED_PLATFORMS.includes(platform.toLowerCase()) &&
      connectedPlatforms.includes(platform.toLowerCase())
    );

    if (validPlatforms.length === 0) {
      return res.status(400).json({
        error: 'No connected platforms selected',
        availablePlatforms: connectedPlatforms,
        requestedPlatforms: platforms
      });
    }

    // Prepare post data for n8n
    const n8nPostData = {
      userId,
      post: {
        id: postData.id || `post_${Date.now()}`,
        title,
        caption: caption || '',
        hashtags: postData.hashtags || '',
        platforms: validPlatforms,
        imagePrompt: postData.imagePrompt,
        videoPrompt: postData.videoPrompt,
        scheduledDate,
        scheduledTime
      },
      metadata: {
        source: 'huttle_ai',
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    // Store in post queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('n8n_post_queue')
      .insert({
        user_id: userId,
        post_data: n8nPostData,
        platforms: validPlatforms,
        status: 'queued',
        scheduled_for: scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`)
          : null
      })
      .select()
      .single();

    if (queueError) {
      console.error('Error creating queue entry:', queueError);
      return res.status(500).json({ error: 'Failed to queue post' });
    }

    // If n8n webhook is configured, send immediately
    if (N8N_WEBHOOK_URL) {
      try {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Huttle-Source': 'api'
          },
          body: JSON.stringify({
            ...n8nPostData,
            queueId: queueEntry.id
          })
        });

        // Update queue status based on n8n response
        const n8nResult = await n8nResponse.json();

        await supabase
          .from('n8n_post_queue')
          .update({
            status: n8nResponse.ok ? 'processing' : 'failed',
            n8n_workflow_id: n8nResult.workflowId,
            n8n_response: n8nResult,
            error_message: !n8nResponse.ok ? n8nResult.error : null,
            updated_at: new Date()
          })
          .eq('id', queueEntry.id);

        return res.status(200).json({
          success: true,
          queueId: queueEntry.id,
          platforms: validPlatforms,
          message: n8nResponse.ok
            ? 'Post sent to n8n for processing'
            : 'Post queued but n8n webhook failed',
          n8nResponse: n8nResult
        });

      } catch (n8nError) {
        console.error('n8n webhook error:', n8nError);

        // Keep in queue for retry
        return res.status(200).json({
          success: true,
          queueId: queueEntry.id,
          platforms: validPlatforms,
          message: 'Post queued for n8n processing (webhook failed, will retry)',
          error: n8nError.message
        });
      }
    } else {
      // No n8n webhook configured, just queue the post
      console.log('No n8n webhook configured, post queued for manual processing');
      return res.status(200).json({
        success: true,
        queueId: queueEntry.id,
        platforms: validPlatforms,
        message: 'Post queued (n8n webhook not configured)'
      });
    }

  } catch (error) {
    console.error('Post to social error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
