import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Supported platforms
const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      platform,
      action, // 'connect' or 'disconnect'
      username,
      userId: platformUserId,
      credentialId
    } = req.body;

    // Validate required fields
    if (!userId || !platform || !action) {
      return res.status(400).json({
        error: 'Missing required fields: userId, platform, action'
      });
    }

    // Validate platform
    const platformKey = platform.toLowerCase();
    if (!SUPPORTED_PLATFORMS.includes(platformKey)) {
      return res.status(400).json({
        error: `Unsupported platform: ${platform}. Supported: ${SUPPORTED_PLATFORMS.join(', ')}`
      });
    }

    // Validate action
    if (!['connect', 'disconnect'].includes(action)) {
      return res.status(400).json({
        error: 'Action must be "connect" or "disconnect"'
      });
    }

    if (action === 'connect') {
      // Connect platform
      const { error: upsertError } = await supabase
        .from('social_connections')
        .upsert({
          user_id: userId,
          platform: platformKey,
          is_connected: true,
          platform_username: username,
          platform_user_id: platformUserId,
          n8n_credential_id: credentialId,
          connected_at: new Date(),
          last_verified: new Date(),
          updated_at: new Date()
        }, {
          onConflict: 'user_id,platform'
        });

      if (upsertError) {
        console.error('Error connecting platform:', upsertError);
        return res.status(500).json({
          error: 'Failed to connect platform',
          details: upsertError.message
        });
      }

      return res.status(200).json({
        success: true,
        action: 'connect',
        platform: platformKey,
        username: username,
        message: `${platform} connected successfully`
      });

    } else if (action === 'disconnect') {
      // Disconnect platform
      const { error: updateError } = await supabase
        .from('social_connections')
        .update({
          is_connected: false,
          n8n_credential_id: null,
          last_verified: new Date(),
          updated_at: new Date()
        })
        .eq('user_id', userId)
        .eq('platform', platformKey);

      if (updateError) {
        console.error('Error disconnecting platform:', updateError);
        return res.status(500).json({
          error: 'Failed to disconnect platform',
          details: updateError.message
        });
      }

      return res.status(200).json({
        success: true,
        action: 'disconnect',
        platform: platformKey,
        message: `${platform} disconnected successfully`
      });
    } else {
      return res.status(400).json({
        error: 'Invalid action. Must be "connect" or "disconnect"'
      });
    }

  } catch (error) {
    console.error('Update connection error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
