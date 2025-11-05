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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Table names
export const TABLES = {
  USERS: 'users',
  CONTENT: 'generated_content',
  CONTENT_LIBRARY: 'content_library',
  PROJECTS: 'projects',
  TRENDS: 'trend_forecasts',
  ACTIVITY: 'user_activity',
  SUBSCRIPTIONS: 'subscriptions',
  SCHEDULED_POSTS: 'scheduled_posts',
  SOCIAL_UPDATES: 'social_updates',
};

// Subscription tiers
export const TIERS = {
  FREE: 'free',
  ESSENTIALS: 'essentials',
  PRO: 'pro',
};

// Tier limits
export const TIER_LIMITS = {
  [TIERS.FREE]: {
    aiGenerations: 20,
    trendForecasts: 0, // Not available
    captionGenerator: 20,
    hashtagGenerator: 5,
    hookBuilder: 10,
    ctaSuggester: 10,
    qualityScorer: 5,
    contentGapAnalysis: 0, // Not available
    burnoutGauge: true, // Available to all
    huttleAgent: 0, // Not available
    storageLimit: 100 * 1024 * 1024, // 100MB in bytes
  },
  [TIERS.ESSENTIALS]: {
    aiGenerations: 100,
    trendForecasts: 4, // Per week
    captionGenerator: 100,
    hashtagGenerator: 50,
    hookBuilder: 50,
    ctaSuggester: 50,
    qualityScorer: 50,
    contentGapAnalysis: 2, // Per week
    burnoutGauge: true,
    huttleAgent: 10, // Per month
    storageLimit: 250 * 1024 * 1024, // 250MB in bytes
  },
  [TIERS.PRO]: {
    aiGenerations: -1, // Unlimited
    trendForecasts: -1, // Unlimited
    captionGenerator: -1,
    hashtagGenerator: -1,
    hookBuilder: -1,
    ctaSuggester: -1,
    qualityScorer: -1,
    contentGapAnalysis: -1,
    burnoutGauge: true,
    huttleAgent: -1, // Unlimited
    storageLimit: 500 * 1024 * 1024, // 500MB in bytes
  },
};

/**
 * Check if user has access to a feature based on tier
 */
export function hasFeatureAccess(userTier, feature) {
  const tier = userTier || TIERS.FREE;
  const limit = TIER_LIMITS[tier]?.[feature];
  
  if (limit === undefined) return false;
  if (limit === -1) return true; // Unlimited
  if (limit === 0) return false; // Not available
  if (typeof limit === 'boolean') return limit;
  
  return true; // Has some limit, check usage separately
}

/**
 * Get remaining usage for a feature
 */
export async function getRemainingUsage(userId, feature, userTier) {
  const tier = userTier || TIERS.FREE;
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
      .eq('status', 'active')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return { success: true, tier: TIERS.FREE }; // No subscription
      throw error;
    }
    
    return { success: true, tier: data.tier };
  } catch (error) {
    console.error('Error getting tier:', error);
    return { success: true, tier: TIERS.FREE }; // Default to free on error
  }
}

/**
 * Get social media platform updates from Supabase
 * This fetches cached updates that were populated by the biweekly serverless function
 */
export async function getSocialUpdates(months = 12) {
  try {
    // Calculate date 12 months ago
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setMonth(today.getMonth() - months);
    
    const { data, error } = await supabase
      .from(TABLES.SOCIAL_UPDATES)
      .select('*')
      .gte('date_month', cutoffDate.toISOString().slice(0, 7)) // Filter by year-month
      .order('date_month', { ascending: false })
      .order('created_at', { ascending: false });
    
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
 * Upload file to Supabase Storage bucket (private bucket)
 */
export async function uploadFileToStorage(userId, file, type) {
  try {
    const filePath = `${userId}/${type}s/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
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
    return { success: false, error: error.message };
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
 * Save content library item to Supabase
 */
export async function saveContentLibraryItem(userId, itemData) {
  try {
    const { data, error } = await supabase
      .from(TABLES.CONTENT_LIBRARY)
      .insert({
        user_id: userId,
        ...itemData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving content library item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's content library items
 */
export async function getContentLibraryItems(userId, filters = {}) {
  try {
    let query = supabase
      .from(TABLES.CONTENT_LIBRARY)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters.project && filters.project !== 'all') {
      query = query.eq('project_id', filters.project);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
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
      throw error;
    }
    
    return { success: true, usageBytes: data?.storage_used_bytes || 0 };
  } catch (error) {
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

    const tierLimit = TIER_LIMITS[userTier]?.storageLimit || TIER_LIMITS[TIERS.FREE].storageLimit;
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
 */
export async function getScheduledPosts(userId, filters = {}) {
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

    const { data, error } = await query;

    if (error) throw error;
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
 */
export async function getUserPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Return defaults if no preferences exist
    return { 
      success: true, 
      data: data || {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        calendar_view: 'month',
        notification_settings: { reminders: [30, 15, 5] }
      }
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return { success: false, error: error.message };
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

