import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_CONNECTION_WEBHOOK_URL = process.env.N8N_CONNECTION_WEBHOOK_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Supported platforms
const SUPPORTED_PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube'];

export default async function handler(req, res) {
  // Allow GET (for quick status checks) and POST (for detailed requests)
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.userId || req.body?.userId;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      });
    }

    // Get connection status from Supabase
    const { data: connections, error } = await supabase
      .from('social_connections')
      .select('platform, is_connected, platform_username, last_verified, connected_at')
      .eq('user_id', userId)
      .eq('is_connected', true);

    if (error) {
      console.error('Error fetching connections:', error);
      return res.status(500).json({ error: 'Failed to fetch connections' });
    }

    // Format response for frontend
    const connectionStatus = {};
    SUPPORTED_PLATFORMS.forEach(platform => {
      const connection = connections?.find(c => c.platform === platform);
      connectionStatus[platform.charAt(0).toUpperCase() + platform.slice(1)] = {
        connected: !!connection,
        username: connection?.platform_username || null,
        connectedAt: connection?.connected_at || null,
        lastVerified: connection?.last_verified || null
      };
    });

    // If n8n webhook is configured, also check real-time status
    let n8nStatus = null;
    if (N8N_CONNECTION_WEBHOOK_URL) {
      try {
        const n8nResponse = await fetch(N8N_CONNECTION_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Huttle-Source': 'api'
          },
          body: JSON.stringify({
            userId,
            action: 'check_status',
            timestamp: new Date().toISOString()
          })
        });

        if (n8nResponse.ok) {
          n8nStatus = await n8nResponse.json();

          // Update our database with fresh status from n8n
          if (n8nStatus && n8nStatus.platforms) {
            for (const [platform, status] of Object.entries(n8nStatus.platforms)) {
              const platformKey = platform.toLowerCase();

              if (SUPPORTED_PLATFORMS.includes(platformKey)) {
                const dbConnection = connections?.find(c => c.platform === platformKey);

                if (dbConnection && !status.connected) {
                  // Connection lost in n8n, update our database
                  await supabase
                    .from('social_connections')
                    .update({
                      is_connected: false,
                      last_verified: new Date(),
                      updated_at: new Date()
                    })
                    .eq('user_id', userId)
                    .eq('platform', platformKey);

                  // Update frontend response
                  connectionStatus[platform].connected = false;
                  connectionStatus[platform].lastVerified = new Date().toISOString();

                } else if (!dbConnection && status.connected) {
                  // New connection in n8n, add to database
                  await supabase
                    .from('social_connections')
                    .insert({
                      user_id: userId,
                      platform: platformKey,
                      is_connected: true,
                      platform_username: status.username,
                      connected_at: new Date(),
                      last_verified: new Date()
                    });

                  // Update frontend response
                  connectionStatus[platform] = {
                    connected: true,
                    username: status.username,
                    connectedAt: new Date().toISOString(),
                    lastVerified: new Date().toISOString()
                  };
                }
              }
            }
          }
        }
      } catch (n8nError) {
        console.warn('n8n status check failed:', n8nError.message);
        // Continue with database status only
      }
    }

    // Calculate summary stats
    const connectedCount = Object.values(connectionStatus).filter(s => s.connected).length;
    const totalPlatforms = SUPPORTED_PLATFORMS.length;

    return res.status(200).json({
      success: true,
      connections: connectionStatus,
      summary: {
        connectedCount,
        totalPlatforms,
        connectionRate: Math.round((connectedCount / totalPlatforms) * 100)
      },
      n8nStatus: n8nStatus ? 'available' : 'not_configured',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Connection status check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
