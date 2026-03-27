/**
 * Supabase Configuration
 * 
 * Used for:
 * - User authentication and profiles
 * - Content storage (generated captions, trends, etc.)
 * - Subscription tier management
 * - Activity tracking for burnout detection
 * - Content gap analysis data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase configuration missing. Some features may not work.');
  console.warn('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'huttle-auth-token',
  },
});

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection() {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { 
        success: false, 
        error: 'Supabase credentials not configured',
        details: { url: !!supabaseUrl, key: !!supabaseAnonKey }
      };
    }

    // Try a simple query to test connection
    const { error } = await supabase.from('scheduled_posts').select('id').limit(1);
    
    if (error) {
      // Check if it's an auth error (expected for unauthenticated requests)
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        return { 
          success: true, 
          message: 'Supabase connection OK (auth required)',
          authenticated: false
        };
      }
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }

    return { 
      success: true, 
      message: 'Supabase connection successful',
      authenticated: true
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || 'Unknown error',
      type: 'network_error'
    };
  }
}

// Table names
export const TABLES = {
  USERS: 'users',
  CONTENT: 'generated_content',
  CONTENT_LIBRARY: 'content_library',
  CONTENT_COLLECTIONS: 'content_collections',
  CONTENT_COLLECTION_ITEMS: 'content_collection_items',
  PROJECTS: 'projects',
  TRENDS: 'trend_forecasts',
  ACTIVITY: 'user_activity',
  SUBSCRIPTIONS: 'subscriptions',
  SCHEDULED_POSTS: 'scheduled_posts',
  SOCIAL_UPDATES: 'social_updates',
  JOBS: 'jobs',
  JOB_NOTIFICATIONS: 'job_notifications',
};

// Subscription tiers
export const TIERS = {
  FREE: 'free',
  ESSENTIALS: 'essentials',
  PRO: 'pro',
  FOUNDER: 'founder',
  BUILDER: 'builder',
};

const PRO_ACCESS_TIERS = [TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER];

export function getTierAccessLevel(userTier) {
  if (!userTier) return null;
  if (userTier === TIERS.ESSENTIALS) return TIERS.ESSENTIALS;
  if (PRO_ACCESS_TIERS.includes(userTier)) return TIERS.PRO;
  return null;
}

/** Full Post Builder: credits deducted from monthly AI pool per completed wizard run (charged at hook generation). */
export const FULL_POST_BUILDER_CREDITS_PER_RUN = 4;

// Tier limits based on Huttle AI's paid-only plans.
export const TIER_LIMITS = {
  [TIERS.FREE]: {
    aiGenerations: 0,
    captionGenerator: false,
    hashtagGenerator: false,
    hookBuilder: false,
    ctaSuggester: false,
    qualityScorer: false,
    visualBrainstormer: false,
    contentRepurposer: false,
    huttleAgent: false,
    trendForecaster: false,
    trendLab: false,
    igniteEngine: 0, // HUTTLE AI: updated 3
    fullPostBuilder: false,
    fullPostBuilderRuns: 0,
    humanizerScore: false,
    performancePrediction: false,
    algorithmChecker: false,
    nicheIntel: 0,
    aiPlanBuilderDays: 0,
    storageLimit: 0,
    scheduledPostsLimit: 0,
  },
  [TIERS.ESSENTIALS]: {
    aiGenerations: 150,
    captionGenerator: true,
    hashtagGenerator: true,
    hookBuilder: true,
    ctaSuggester: true,
    qualityScorer: true,
    visualBrainstormer: true,
    contentRepurposer: false, // Pro only
    huttleAgent: false, // Pro only
    trendForecaster: false, // Pro only
    trendLab: true, // Full access
    igniteEngine: 15, // HUTTLE AI: updated 3
    fullPostBuilder: true,
    fullPostBuilderRuns: 12,
    humanizerScore: true,
    performancePrediction: true,
    algorithmChecker: true,
    nicheIntel: 0, // Pro+ only
    aiPlanBuilderDays: 14, // 7 or 14 days
    planBuilder: 20, // mirrored in api/_utils/planBuilderLimits.js for create-plan-builder-job
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB in bytes
    scheduledPostsLimit: 50,
  },
  [TIERS.PRO]: {
    aiGenerations: 600,
    // Per-feature monthly limits
    trendQuickScan: 200,
    trendDeepDive: 50,
    contentRemix: 75,
    igniteEngine: 60, // HUTTLE AI: updated 3
    planBuilder: 20, // mirrored in api/_utils/planBuilderLimits.js for create-plan-builder-job
    captionGenerator: true,
    hashtagGenerator: true,
    hookBuilder: true,
    ctaSuggester: true,
    qualityScorer: true,
    visualBrainstormer: true,
    contentRepurposer: true, // Pro feature
    huttleAgent: true, // Pro feature
    trendForecaster: true, // Pro feature
    trendLab: true, // Full access
    fullPostBuilder: true,
    fullPostBuilderRuns: 40,
    humanizerScore: true,
    performancePrediction: true,
    algorithmChecker: true,
    nicheIntel: 5, // 5 analyses/month
    aiPlanBuilderDays: 14, // 7 or 14 days
    storageLimit: 50 * 1024 * 1024 * 1024, // 50GB in bytes
    scheduledPostsLimit: -1, // Unlimited
  },
  // Founders Club: launch pricing with Pro feature access.
  [TIERS.FOUNDER]: {
    aiGenerations: 800,
    // Per-feature monthly limits
    trendQuickScan: 200,
    trendDeepDive: 50,
    contentRemix: 75,
    igniteEngine: 60, // HUTTLE AI: updated 3
    planBuilder: 20, // mirrored in api/_utils/planBuilderLimits.js for create-plan-builder-job
    captionGenerator: true,
    hashtagGenerator: true,
    hookBuilder: true,
    ctaSuggester: true,
    qualityScorer: true,
    visualBrainstormer: true,
    contentRepurposer: true,
    huttleAgent: true,
    trendForecaster: true,
    trendLab: true,
    fullPostBuilder: true,
    fullPostBuilderRuns: 40,
    humanizerScore: true,
    performancePrediction: true,
    algorithmChecker: true,
    nicheIntel: 10, // 10 analyses/month
    aiPlanBuilderDays: 14,
    storageLimit: 50 * 1024 * 1024 * 1024, // 50GB in bytes
    scheduledPostsLimit: -1, // Unlimited
  },
  // Builders Club: launch pricing with Pro feature access.
  [TIERS.BUILDER]: {
    aiGenerations: 800,
    trendQuickScan: 200,
    trendDeepDive: 50,
    contentRemix: 75,
    igniteEngine: 60, // HUTTLE AI: updated 3
    planBuilder: 20, // mirrored in api/_utils/planBuilderLimits.js for create-plan-builder-job
    captionGenerator: true,
    hashtagGenerator: true,
    hookBuilder: true,
    ctaSuggester: true,
    qualityScorer: true,
    visualBrainstormer: true,
    contentRepurposer: true,
    huttleAgent: true,
    trendForecaster: true,
    trendLab: true,
    fullPostBuilder: true,
    fullPostBuilderRuns: 40,
    humanizerScore: true,
    performancePrediction: true,
    algorithmChecker: true,
    nicheIntel: 10,
    aiPlanBuilderDays: 14,
    storageLimit: 50 * 1024 * 1024 * 1024,
    scheduledPostsLimit: -1,
  },
};

// Feature access mapping
export const FEATURES = {
  'caption-generator': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'hashtag-generator': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'hook-builder': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'cta-suggester': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'quality-scorer': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'visual-brainstormer': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'content-repurposer': [TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'huttle-agent': [TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'trend-forecaster': [TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'trend-lab': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'ignite-engine': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER], // HUTTLE AI: updated 3
  'ai-plan-builder': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'full-post-builder': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'humanizer-score': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'performance-prediction': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'algorithm-checker': [TIERS.ESSENTIALS, TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
  'niche-intel': [TIERS.PRO, TIERS.FOUNDER, TIERS.BUILDER],
};

/**
 * Check if user has access to a feature based on tier
 */
export function hasFeatureAccess(userTier, feature) {
  if (!userTier) return false;
  const tier = userTier;
  const limit = TIER_LIMITS[tier]?.[feature];
  
  if (limit === undefined) return false;
  if (limit === -1) return true; // Unlimited
  if (limit === 0) return false; // Not available
  if (typeof limit === 'boolean') return limit;
  
  return true; // Has some limit, check usage separately
}

/**
 * Check if user tier can access a feature by feature name
 */
export function canAccessFeature(featureName, userTier) {
  if (!userTier) return false;
  const tier = userTier;
  const allowedTiers = FEATURES[featureName];
  
  if (!allowedTiers) return false;
  return allowedTiers.includes(tier);
}

/**
 * Get remaining usage for a feature
 */
export async function getRemainingUsage(userId, feature, userTier) {
  if (!userTier) return 0;
  const tier = userTier;
  const limit = TIER_LIMITS[tier]?.[feature];
  
  if (limit === -1) return Infinity; // Unlimited
  if (limit === 0) return 0; // Not available
  
  try {
    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from(TABLES.ACTIVITY)
      .select('*')
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('created_at', startOfMonth.toISOString());
    
    if (error) throw error;
    
    const used = data?.length || 0;
    return Math.max(0, limit - used);
  } catch (error) {
    console.error('Error getting usage:', error);
    return 0;
  }
}

/**
 * Get the count of a feature used this billing cycle.
 * @param {string} userId
 * @param {string} feature - e.g. 'aiGenerations', 'trendDeepDive'
 * @returns {Promise<number>}
 */
export async function getFeatureUsageCount(userId, feature) {
  try {
    // KNOWN EDGE: `startOfMonth` is local midnight on the 1st; `created_at` is timestamptz (UTC). Rows within a few
    // hours of the boundary can count toward different "months" than a strict UTC month — document before changing.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from(TABLES.ACTIVITY)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('created_at', startOfMonth.toISOString());

    if (error) throw error;
    return count || 0;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'supabase.js:getFeatureUsageCount',message:'usage count query failed',data:{hypothesisId:'H2',feature,errCode:error?.code,errMsg:String(error?.message||'').slice(0,200),details:error?.details},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Error getting feature usage count:', error);
    return 0;
  }
}

/**
 * Get overall AI generations used this billing cycle (all features combined).
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getOverallAIUsageCount(userId) {
  try {
    // KNOWN EDGE: local start-of-month vs UTC `created_at` — same caveat as getFeatureUsageCount; keep rollover logic aligned.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Only count 'aiGenerations' rows to avoid double-counting.
    // Each feature usage creates a feature-specific row + an 'aiGenerations' row.
    // If we counted ALL rows, we'd double the actual usage.
    const { count, error } = await supabase
      .from(TABLES.ACTIVITY)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', 'aiGenerations')
      .gte('created_at', startOfMonth.toISOString());

    if (error) throw error;
    return count || 0;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'supabase.js:getOverallAIUsageCount',message:'overall usage count query failed',data:{hypothesisId:'H2',errCode:error?.code,errMsg:String(error?.message||'').slice(0,200),details:error?.details},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.error('Error getting overall AI usage count:', error);
    return 0;
  }
}

/**
 * Track feature usage
 */
export async function trackUsage(userId, feature, metadata = {}) {
  try {
    const { error } = await supabase
      .from(TABLES.ACTIVITY)
      .insert({
        user_id: userId,
        feature,
        metadata,
        created_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error tracking usage:', error);
    return false;
  }
}

/**
 * Save generated content to Supabase
 */
export async function saveContent(userId, contentData) {
  try {
    const { data, error } = await supabase
      .from(TABLES.CONTENT)
      .insert({
        user_id: userId,
        ...contentData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's saved content
 */
export async function getSavedContent(userId, filters = {}) {
  try {
    let query = supabase
      .from(TABLES.CONTENT)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save trend forecast to Supabase
 */
export async function saveTrendForecast(userId, forecastData) {
  try {
    const { data, error } = await supabase
      .from(TABLES.TRENDS)
      .insert({
        user_id: userId,
        ...forecastData,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving forecast:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get latest trend forecast (if still valid)
 */
export async function getLatestForecast(userId, niche) {
  try {
    const { data, error } = await supabase
      .from(TABLES.TRENDS)
      .select('*')
      .eq('user_id', userId)
      .eq('niche', niche)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return { success: true, data: null }; // No results
      throw error;
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error getting forecast:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user activity for burnout detection
 */
export async function getUserActivity(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from(TABLES.ACTIVITY)
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's subscription tier
 */
export async function getUserTier(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLES.SUBSCRIPTIONS)
      .select('tier, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return { success: true, tier: null }; // No subscription
      throw error;
    }
    
    return { success: true, tier: data.tier };
  } catch (error) {
    console.error('Error getting tier:', error);
    return { success: true, tier: null };
  }
}

/**
 * Get social media platform updates from Supabase
 * This fetches cached updates that were populated by the biweekly serverless function
 */
/**
 * Get social media platform updates from Supabase.
 * Optionally filter by specific platforms (e.g. user's Brand Voice platforms).
 * @param {number} months - How many months back to fetch
 * @param {string[]} [platforms] - Optional platform names to filter by
 */
export async function getSocialUpdates(months = 12, platforms = null) {
  try {
    // Calculate date 12 months ago
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setMonth(today.getMonth() - months);
    
    let query = supabase
      .from(TABLES.SOCIAL_UPDATES)
      .select('*')
      .gte('date_month', cutoffDate.toISOString().slice(0, 7))
      .order('date_month', { ascending: false })
      .order('created_at', { ascending: false });

    // If platforms specified, filter by them
    if (platforms && platforms.length > 0) {
      query = query.in('platform', platforms);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { 
      success: true, 
      updates: data || [],
      count: data?.length || 0
    };
  } catch (error) {
    console.error('Error fetching social updates from Supabase:', error);
    return { 
      success: false, 
      error: error.message,
      updates: []
    };
  }
}

/**
 * Sanitize a filename for Supabase Storage.
 * Replaces spaces, special characters, and non-ASCII with underscores.
 * Preserves the file extension.
 */
function sanitizeFileName(fileName) {
  if (!fileName) return 'unnamed_file';
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot > 0 ? fileName.slice(lastDot) : '';
  const base = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  const sanitized = base
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_')              // Collapse consecutive underscores
    .replace(/^_|_$/g, '')            // Trim leading/trailing underscores
    .substring(0, 100);               // Limit length
  return (sanitized || 'file') + ext.toLowerCase();
}

/**
 * Upload file to Supabase Storage bucket (private bucket)
 */
export async function uploadFileToStorage(userId, file, type) {
  try {
    const safeName = sanitizeFileName(file.name);
    const filePath = `${userId}/${type}s/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from('content-library')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // For private bucket, we don't return a URL here
    // Signed URLs will be generated on-demand when displaying content
    return {
      success: true,
      storagePath: filePath,
      sizeBytes: file.size
    };
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = error.message;
    if (error.message?.includes('Bucket not found') || error.statusCode === 400) {
      errorMessage = 'Storage bucket not configured. Please ensure the "content-library" bucket exists in Supabase Storage.';
    } else if (error.message?.includes('new row violates') || error.message?.includes('policy')) {
      errorMessage = 'Storage permission denied. Please check Supabase Storage RLS policies for the content-library bucket.';
    } else if (error.message?.includes('Payload too large') || error.statusCode === 413) {
      errorMessage = 'File is too large. Please try a smaller file.';
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate a signed URL for private bucket access
 * URLs expire after the specified time (default: 1 hour)
 */
export async function getSignedUrl(storagePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('content-library')
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw error;

    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000)
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save content library item to Supabase (delegates to shared saveToVault — sanitizes columns / metadata).
 */
export async function saveContentLibraryItem(userId, itemData) {
  const { saveToVault } = await import('../services/contentService.js');
  return saveToVault(userId, itemData);
}

/**
 * Get user's content library items
 */
export async function getContentLibraryItems(userId, filters = {}) {
  try {
    const safeLimit = Number(filters.limit) > 0 ? Number(filters.limit) : 100;
    const safeOffset = Number(filters.offset) >= 0 ? Number(filters.offset) : 0;

    let query = supabase
      .from(TABLES.CONTENT_LIBRARY)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters.project && filters.project !== 'all') {
      query = query.eq('project_id', filters.project);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting content library items:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's current storage usage
 */
export async function getStorageUsage(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('storage_used_bytes')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no row found

    // If no user record exists, return 0 (not an error)
    if (error) {
      // PGRST116 = no rows found - this is OK, user just hasn't been initialized
      if (error.code === 'PGRST116') {
        return { success: true, usageBytes: 0 };
      }
      // Defensive fallback for schemas using user_id instead of id
      const { data: fallbackData, error: fallbackError } = await supabase
        .from(TABLES.USERS)
        .select('storage_used_bytes')
        .eq('user_id', userId)
        .maybeSingle();

      if (!fallbackError) {
        return { success: true, usageBytes: fallbackData?.storage_used_bytes || 0 };
      }
      throw error;
    }
    
    if (data) {
      return { success: true, usageBytes: data.storage_used_bytes || 0 };
    }

    // Defensive fallback for schemas using user_id instead of id
    const { data: fallbackData, error: fallbackError } = await supabase
      .from(TABLES.USERS)
      .select('storage_used_bytes')
      .eq('user_id', userId)
      .maybeSingle();

    if (!fallbackError) {
      return { success: true, usageBytes: fallbackData?.storage_used_bytes || 0 };
    }

    return { success: true, usageBytes: 0 };
  } catch {
    // Silently fail - storage tracking isn't critical
    // console.error('Error getting storage usage:', error);
    return { success: true, usageBytes: 0 }; // Return success with 0 instead of error
  }
}

/**
 * Check if upload would exceed storage limit
 */
export async function checkStorageLimit(userId, additionalBytes, userTier) {
  try {
    const { success, usageBytes } = await getStorageUsage(userId);
    if (!success) return { allowed: false, reason: 'error' };

    const tierLimit = TIER_LIMITS[userTier]?.storageLimit ?? 0;
    const newTotal = usageBytes + additionalBytes;

    return {
      allowed: newTotal <= tierLimit,
      currentUsage: usageBytes,
      newTotal,
      limit: tierLimit,
      remaining: Math.max(0, tierLimit - usageBytes),
      overBy: Math.max(0, newTotal - tierLimit)
    };
  } catch (error) {
    console.error('Error checking storage limit:', error);
    return { allowed: false, reason: 'error' };
  }
}

/**
 * Update content library item
 */
export async function updateContentLibraryItem(itemId, updates, userId) {
  try {
    const { data, error } = await supabase
      .from(TABLES.CONTENT_LIBRARY)
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating content library item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete content library item and file
 */
export async function deleteContentLibraryItem(itemId, userId) {
  try {
    // First get the item to check if it has a storage path
    const { data: item, error: fetchError } = await supabase
      .from(TABLES.CONTENT_LIBRARY)
      .select('storage_path, type')
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete file from storage if it exists (for images/videos)
    if (item.storage_path && item.type !== 'text') {
      const { error: storageError } = await supabase.storage
        .from('content-library')
        .remove([item.storage_path]);

      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Don't throw - continue with database deletion
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from(TABLES.CONTENT_LIBRARY)
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting content library item:', error);
    return { success: false, error: error.message };
  }
}

export async function getContentCollections(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLES.CONTENT_COLLECTIONS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting content collections:', error);
    return { success: false, error: error.message };
  }
}

export async function createContentCollection(userId, name) {
  try {
    const trimmedName = String(name || '').trim();

    if (!trimmedName) {
      return { success: false, error: 'Collection name is required.' };
    }

    const { data, error } = await supabase
      .from(TABLES.CONTENT_COLLECTIONS)
      .insert({
        user_id: userId,
        name: trimmedName,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating content collection:', error);
    return { success: false, error: error.message };
  }
}

export async function getContentCollectionItems(collectionIds = []) {
  try {
    if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from(TABLES.CONTENT_COLLECTION_ITEMS)
      .select('collection_id, content_item_id')
      .in('collection_id', collectionIds);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting content collection items:', error);
    return { success: false, error: error.message };
  }
}

export async function setContentItemCollections(userId, contentItemId, collectionIds = []) {
  try {
    const uniqueCollectionIds = [...new Set((collectionIds || []).filter(Boolean))];

    const { error: deleteError } = await supabase
      .from(TABLES.CONTENT_COLLECTION_ITEMS)
      .delete()
      .eq('content_item_id', contentItemId);

    if (deleteError) throw deleteError;

    if (uniqueCollectionIds.length === 0) {
      return { success: true, data: [] };
    }

    const rows = uniqueCollectionIds.map((collectionId) => ({
      collection_id: collectionId,
      content_item_id: contentItemId,
    }));

    const { data, error } = await supabase
      .from(TABLES.CONTENT_COLLECTION_ITEMS)
      .insert(rows)
      .select('collection_id, content_item_id');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error setting content item collections:', error);
    return { success: false, error: error.message };
  }
}

export async function addItemsToCollection(userId, collectionId, contentItemIds = []) {
  try {
    const uniqueItemIds = [...new Set((contentItemIds || []).filter(Boolean))];

    if (!collectionId || uniqueItemIds.length === 0) {
      return { success: true, data: [] };
    }

    const rows = uniqueItemIds.map((contentItemId) => ({
      collection_id: collectionId,
      content_item_id: contentItemId,
    }));

    const { data, error } = await supabase
      .from(TABLES.CONTENT_COLLECTION_ITEMS)
      .upsert(rows, { onConflict: 'collection_id,content_item_id' })
      .select('collection_id, content_item_id');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error adding items to content collection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ============================================================================
 * SMART CALENDAR - Scheduled Posts Management
 * ============================================================================
 */

/**
 * Create a scheduled post
 */
export async function createScheduledPost(userId, postData) {
  try {
    const { data, error } = await supabase
      .from(TABLES.SCHEDULED_POSTS)
      .insert({
        user_id: userId,
        title: postData.title,
        caption: postData.caption,
        hashtags: postData.hashtags,
        keywords: postData.keywords,
        platforms: postData.platforms,
        content_type: postData.contentType,
        image_prompt: postData.imagePrompt,
        video_prompt: postData.videoPrompt,
        media_urls: postData.media || [],
        scheduled_for: postData.scheduledDate && postData.scheduledTime 
          ? `${postData.scheduledDate}T${postData.scheduledTime}:00`
          : null,
        timezone: postData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'scheduled',
        content: postData.caption || '', // Legacy field for compatibility
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating scheduled post:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's scheduled posts with filters
 * Includes timeout protection to prevent hanging queries
 */
export async function getScheduledPosts(userId, filters = {}) {
  const QUERY_TIMEOUT_MS = 10000; // 10 seconds
  
  try {
    let query = supabase
      .from(TABLES.SCHEDULED_POSTS)
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true, nullsFirst: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.startDate) {
      query = query.gte('scheduled_for', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('scheduled_for', filters.endDate);
    }

    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timed out - scheduled_posts table may not exist or RLS is misconfigured')), QUERY_TIMEOUT_MS);
    });

    const { data, error } = await Promise.race([query, timeoutPromise]);

    if (error) {
      // Check for table not existing
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('❌ The scheduled_posts table does not exist! Run the SQL schema in Supabase.');
      }
      throw error;
    }
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting scheduled posts:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Update a scheduled post
 */
export async function updateScheduledPost(postId, updates, userId) {
  try {
    // Transform app format to DB format
    const dbUpdates = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.caption !== undefined) {
      dbUpdates.caption = updates.caption;
      dbUpdates.content = updates.caption; // Keep legacy field in sync
    }
    if (updates.hashtags !== undefined) dbUpdates.hashtags = updates.hashtags;
    if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
    if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms;
    if (updates.contentType !== undefined) dbUpdates.content_type = updates.contentType;
    if (updates.imagePrompt !== undefined) dbUpdates.image_prompt = updates.imagePrompt;
    if (updates.videoPrompt !== undefined) dbUpdates.video_prompt = updates.videoPrompt;
    if (updates.media !== undefined) dbUpdates.media_urls = updates.media;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
    
    // Handle scheduledDate and scheduledTime updates
    if (updates.scheduledDate !== undefined || updates.scheduledTime !== undefined) {
      // Need to get current values if only one is being updated
      if (updates.scheduledDate !== undefined && updates.scheduledTime === undefined) {
        // Get current time from the post
        const { data: currentPost } = await supabase
          .from(TABLES.SCHEDULED_POSTS)
          .select('scheduled_for')
          .eq('id', postId)
          .eq('user_id', userId)
          .single();
        
        const currentTime = currentPost?.scheduled_for 
          ? currentPost.scheduled_for.split('T')[1].substring(0, 5) 
          : '09:00';
        
        dbUpdates.scheduled_for = `${updates.scheduledDate}T${currentTime}:00`;
      } else if (updates.scheduledTime !== undefined && updates.scheduledDate === undefined) {
        // Get current date from the post
        const { data: currentPost } = await supabase
          .from(TABLES.SCHEDULED_POSTS)
          .select('scheduled_for')
          .eq('id', postId)
          .eq('user_id', userId)
          .single();
        
        const currentDate = currentPost?.scheduled_for 
          ? currentPost.scheduled_for.split('T')[0] 
          : new Date().toISOString().split('T')[0];
        
        dbUpdates.scheduled_for = `${currentDate}T${updates.scheduledTime}:00`;
      } else {
        // Both provided
        dbUpdates.scheduled_for = `${updates.scheduledDate}T${updates.scheduledTime}:00`;
      }
    }

    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLES.SCHEDULED_POSTS)
      .update(dbUpdates)
      .eq('id', postId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating scheduled post:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a scheduled post
 */
export async function deleteScheduledPost(postId, userId) {
  try {
    const { error } = await supabase
      .from(TABLES.SCHEDULED_POSTS)
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update post status (with automatic posted_at timestamp)
 */
export async function updatePostStatus(postId, status, userId) {
  try {
    const updates = { status };
    
    if (status === 'posted') {
      updates.posted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(TABLES.SCHEDULED_POSTS)
      .update(updates)
      .eq('id', postId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating post status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user timezone preferences
 * Includes timeout protection and graceful fallback to defaults
 */
export async function getUserPreferences(userId) {
  // Cold Supabase projects often need >8s on first request — align with BrandContext.
  const QUERY_TIMEOUT_MS = 15000;
  const defaultPreferences = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendar_view: 'month',
    notification_settings: { reminders: [30, 15, 5] }
  };

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timed out')), QUERY_TIMEOUT_MS);
    });

    const queryPromise = supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('⚠️ user_preferences table does not exist, using defaults');
        return { success: true, data: defaultPreferences };
      }
      throw error;
    }
    
    return { 
      success: true, 
      data: data || defaultPreferences
    };
  } catch (error) {
    // Timeouts are expected on slow networks / Supabase cold start — defaults are safe.
    const isTimeout = error?.message === 'Query timed out';
    if (!isTimeout) {
      console.warn('[Preferences] Using defaults:', error?.message || error);
    }
    return { success: true, data: defaultPreferences };
  }
}

/**
 * Save user timezone preferences
 */
export async function saveUserPreferences(userId, preferences) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ============================================
 * PROJECT MANAGEMENT FUNCTIONS
 * ============================================
 */

/**
 * Create a new project
 */
export async function createProject(userId, projectData) {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .insert([{
        user_id: userId,
        name: projectData.name,
        description: projectData.description || null,
        color: projectData.color || '#6366f1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all projects for a user
 */
export async function getProjects(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Update a project
 */
export async function updateProject(projectId, updates, userId) {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROJECTS)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a project
 * Note: This will set content items' project_id to null, not delete them
 */
export async function deleteProject(projectId, userId) {
  try {
    // First, remove project association from all content items
    const { error: updateError } = await supabase
      .from(TABLES.CONTENT_LIBRARY)
      .update({ project_id: null })
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Then delete the project
    const { error: deleteError } = await supabase
      .from(TABLES.PROJECTS)
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get content count for each project
 */
export async function getProjectContentCounts(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLES.CONTENT_LIBRARY)
      .select('project_id')
      .eq('user_id', userId);

    if (error) throw error;

    // Count items per project
    const counts = {};
    data.forEach(item => {
      const projectId = item.project_id || 'all';
      counts[projectId] = (counts[projectId] || 0) + 1;
    });

    return { success: true, data: counts };
  } catch (error) {
    console.error('Error getting project counts:', error);
    return { success: false, error: error.message, data: {} };
  }
}

