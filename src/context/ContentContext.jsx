import { createContext, useState, useContext, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import {
  getScheduledPosts,
  createScheduledPost,
  updateScheduledPost as updateScheduledPostDB,
  deleteScheduledPost as deleteScheduledPostDB,
  getUserPreferences,
} from '../config/supabase';
import { mockScheduledPosts } from '../data/mockData';

export const ContentContext = createContext();

export function ContentProvider({ children }) {
  const authContext = useContext(AuthContext);
  const { addToast } = useToast();
  const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';
  
  // Safety check for AuthContext
  const user = authContext?.user || null;
  
  const [savedContent, setSavedContent] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [draftContent, setDraftContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Seed demo posts for dev mode using realistic mock data
  // Note: Only supported platforms should be used (Instagram, Facebook, TikTok, YouTube, X/Twitter)
  const seedDevModeScheduledPosts = () => {
    setScheduledPosts(mockScheduledPosts);
    setLoading(false);
  };

  // Load on mount and when user changes
  useEffect(() => {
    if (skipAuth) {
      seedDevModeScheduledPosts();
      setUserTimezone('America/New_York');
      loadSavedContent();
      setLoading(false);
      setSyncing(false);
      return;
    }

    if (user?.id) {
      loadScheduledPosts();
      loadUserPreferences();
      migrateLocalStorageData();
    } else {
      setLoading(false);
    }
    // Load saved content regardless of user (from localStorage)
    loadSavedContent();
  }, [user, skipAuth]);

  // Load user preferences (timezone, etc.)
  const loadUserPreferences = async () => {
    if (skipAuth) return;
    if (!user?.id) return;

    const result = await getUserPreferences(user.id);
    if (result.success && result.data) {
      setUserTimezone(result.data.timezone);
    }
  };

  // Load scheduled posts from Supabase (with localStorage fallback)
  const loadScheduledPosts = async () => {
    // If skipAuth is enabled, seed demo posts instead
    if (skipAuth) {
      seedDevModeScheduledPosts();
      return;
    }

    if (!user?.id) {
      // Try loading from localStorage if no user
      const localPosts = localStorage.getItem('scheduledPosts');
      if (localPosts) {
        try {
          const posts = JSON.parse(localPosts);
          setScheduledPosts(posts || []);
        } catch (e) {
          console.error('Error parsing localStorage posts:', e);
        }
      }
      setLoading(false);
      return;
    }

    // Check if this is a dev/mock user
    const isDevUser = user.id === 'dev-user-123' || user.email === 'dev@huttle.ai';
    
    try {
      setLoading(true);
      const result = await getScheduledPosts(user.id);

      if (result.success) {
        // Transform to match existing format
        const transformed = result.data.map(post => ({
          id: post.id,
          title: post.title,
          caption: post.caption,
          hashtags: post.hashtags,
          keywords: post.keywords,
          platforms: post.platforms || [],
          contentType: post.content_type,
          imagePrompt: post.image_prompt,
          videoPrompt: post.video_prompt,
          media: post.media_urls || [],
          scheduledDate: post.scheduled_for ? post.scheduled_for.split('T')[0] : '',
          scheduledTime: post.scheduled_for ? post.scheduled_for.split('T')[1].substring(0, 5) : '',
          status: post.status,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
          timezone: post.timezone,
        }));

        setScheduledPosts(transformed);
        
        // Also save to localStorage as backup
        localStorage.setItem('scheduledPosts', JSON.stringify(transformed));
      } else {
        // Supabase failed - try localStorage fallback
        console.warn('Supabase query failed, trying localStorage fallback:', result.error);
        const localPosts = localStorage.getItem('scheduledPosts');
        if (localPosts) {
          try {
            const posts = JSON.parse(localPosts);
            setScheduledPosts(posts || []);
            if (!isDevUser) {
              addToast('Using offline data. Some features may be limited.', 'warning');
            }
          } catch (e) {
            console.error('Error parsing localStorage posts:', e);
            setScheduledPosts([]);
            if (!isDevUser) {
              addToast('Failed to load scheduled posts', 'error');
            }
          }
        } else {
          setScheduledPosts([]);
          if (!isDevUser && result.error) {
            console.error('Supabase error:', result.error);
            // Don't show error toast for dev users
            if (!result.error.includes('JWT') && !result.error.includes('auth')) {
              addToast('Failed to load scheduled posts. Using offline mode.', 'warning');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      // Try localStorage fallback
      const localPosts = localStorage.getItem('scheduledPosts');
      if (localPosts) {
        try {
          const posts = JSON.parse(localPosts);
          setScheduledPosts(posts || []);
          if (!isDevUser) {
            addToast('Using offline data. Some features may be limited.', 'warning');
          }
        } catch (e) {
          setScheduledPosts([]);
        }
      } else {
        setScheduledPosts([]);
      }
      if (!isDevUser) {
        addToast('Error loading scheduled posts', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Migrate existing localStorage data to Supabase (one-time)
  const migrateLocalStorageData = async () => {
    if (skipAuth) return;
    if (!user?.id) return;

    const migrationKey = `migrated_posts_${user.id}`;
    if (localStorage.getItem(migrationKey)) return; // Already migrated

    const localPosts = localStorage.getItem('scheduledPosts');
    if (!localPosts) {
      localStorage.setItem(migrationKey, 'true');
      return;
    }

    try {
      const posts = JSON.parse(localPosts);
      if (posts.length === 0) {
        localStorage.setItem(migrationKey, 'true');
        return;
      }

      setSyncing(true);
      addToast(`Migrating ${posts.length} posts to cloud...`, 'info');

      let migratedCount = 0;
      for (const post of posts) {
        const result = await createScheduledPost(user.id, post);
        if (result.success) migratedCount++;
      }

      localStorage.setItem(migrationKey, 'true');
      localStorage.removeItem('scheduledPosts'); // Clear old data
      
      addToast(`Successfully migrated ${migratedCount} posts!`, 'success');
      await loadScheduledPosts(); // Reload from Supabase
    } catch (error) {
      console.error('Migration error:', error);
      addToast('Some posts failed to migrate. Please try again.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Schedule a post with optimistic update
  const schedulePost = async (postData) => {
    if (skipAuth) {
      const tempId = `dev_${Date.now()}`;
      const newPost = {
        id: tempId,
        ...postData,
        scheduledDate: postData.scheduledDate || new Date().toISOString().split('T')[0],
        scheduledTime: postData.scheduledTime || '09:00',
        createdAt: new Date().toISOString(),
        status: 'scheduled',
        timezone: userTimezone,
      };
      setScheduledPosts(prev => [newPost, ...prev]);
      addToast('Post scheduled (dev mode)', 'success');
      return tempId;
    }

    if (!user?.id) {
      addToast('Please log in to schedule posts', 'error');
      return null;
    }

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticPost = {
      id: tempId,
      ...postData,
      createdAt: new Date().toISOString(),
      status: 'scheduled',
      timezone: userTimezone,
    };

    setScheduledPosts(prev => [optimisticPost, ...prev]);

    try {
      setSyncing(true);
      const result = await createScheduledPost(user.id, {
        ...postData,
        timezone: userTimezone,
      });

      if (result.success) {
        // Replace temp post with real one
        setScheduledPosts(prev =>
          prev.map(p => p.id === tempId ? transformPost(result.data) : p)
        );
        return result.data.id;
      } else {
        // Remove optimistic post on failure
        setScheduledPosts(prev => prev.filter(p => p.id !== tempId));
        addToast('Failed to schedule post', 'error');
        return null;
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      setScheduledPosts(prev => prev.filter(p => p.id !== tempId));
      addToast('Error scheduling post', 'error');
      return null;
    } finally {
      setSyncing(false);
    }
  };

  // Update scheduled post with optimistic update
  const updateScheduledPost = async (id, updates) => {
    if (skipAuth) {
      setScheduledPosts(prev =>
        prev.map(post =>
          post.id === id ? { ...post, ...updates, updatedAt: new Date().toISOString() } : post
        )
      );
      addToast('Post updated (dev mode)', 'success');
      return;
    }

    if (!user?.id) return;

    // Optimistic update
    setScheduledPosts(prev =>
      prev.map(post =>
        post.id === id ? { ...post, ...updates, updatedAt: new Date().toISOString() } : post
      )
    );

    try {
      setSyncing(true);
      const result = await updateScheduledPostDB(id, updates, user.id);

      if (!result.success) {
        // Revert on failure
        await loadScheduledPosts();
        addToast('Failed to update post', 'error');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      await loadScheduledPosts();
      addToast('Error updating post', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Delete scheduled post with optimistic update
  const deleteScheduledPost = async (id) => {
    if (skipAuth) {
      setScheduledPosts(prev => prev.filter(post => post.id !== id));
      addToast('Post deleted (dev mode)', 'success');
      return;
    }

    if (!user?.id) return;

    // Store for potential rollback
    const deletedPost = scheduledPosts.find(p => p.id === id);

    // Optimistic delete
    setScheduledPosts(prev => prev.filter(post => post.id !== id));

    try {
      setSyncing(true);
      const result = await deleteScheduledPostDB(id, user.id);

      if (!result.success) {
        // Restore on failure
        setScheduledPosts(prev => [deletedPost, ...prev]);
        addToast('Failed to delete post', 'error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setScheduledPosts(prev => [deletedPost, ...prev]);
      addToast('Error deleting post', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Helper to transform DB post to app format
  const transformPost = (post) => ({
    id: post.id,
    title: post.title,
    caption: post.caption,
    hashtags: post.hashtags,
    keywords: post.keywords,
    platforms: post.platforms || [],
    contentType: post.content_type,
    imagePrompt: post.image_prompt,
    videoPrompt: post.video_prompt,
    media: post.media_urls || [],
    scheduledDate: post.scheduled_for ? post.scheduled_for.split('T')[0] : '',
    scheduledTime: post.scheduled_for ? post.scheduled_for.split('T')[1].substring(0, 5) : '',
    status: post.status,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    timezone: post.timezone,
  });

  // Save generated content for later use (keep in localStorage for now)
  const saveGeneratedContent = (content) => {
    const newContent = {
      id: Date.now(),
      ...content,
      savedAt: new Date().toISOString(),
    };
    setSavedContent((prev) => [newContent, ...prev]);
    localStorage.setItem('savedContent', JSON.stringify([newContent, ...savedContent]));
    return newContent.id;
  };

  // Load saved content from localStorage
  const loadSavedContent = () => {
    const saved = localStorage.getItem('savedContent');
    if (saved) {
      setSavedContent(JSON.parse(saved));
    }
  };

  // Set draft content for cross-page editing
  const setDraft = (content) => {
    setDraftContent(content);
    sessionStorage.setItem('draftContent', JSON.stringify(content));
  };

  // Get draft content
  const getDraft = () => {
    if (draftContent) return draftContent;
    const sessionDraft = sessionStorage.getItem('draftContent');
    return sessionDraft ? JSON.parse(sessionDraft) : null;
  };

  // Clear draft
  const clearDraft = () => {
    setDraftContent(null);
    sessionStorage.removeItem('draftContent');
  };

  // Delete saved content
  const deleteSavedContent = (id) => {
    const updated = savedContent.filter((content) => content.id !== id);
    setSavedContent(updated);
    localStorage.setItem('savedContent', JSON.stringify(updated));
  };

  // Get content by ID
  const getContentById = (id) => {
    return savedContent.find((content) => content.id === id);
  };

  // Append to existing content (e.g., add hashtags to a caption)
  const appendToContent = (contentId, appendData) => {
    const updated = savedContent.map((content) =>
      content.id === contentId
        ? { ...content, ...appendData, updatedAt: new Date().toISOString() }
        : content
    );
    setSavedContent(updated);
    localStorage.setItem('savedContent', JSON.stringify(updated));
  };

  return (
    <ContentContext.Provider
      value={{
        savedContent,
        scheduledPosts,
        loading,
        syncing,
        userTimezone,
        saveGeneratedContent,
        loadSavedContent,
        deleteSavedContent,
        getContentById,
        appendToContent,
        setDraft,
        getDraft,
        clearDraft,
        draftContent,
        schedulePost,
        updateScheduledPost,
        deleteScheduledPost,
        loadScheduledPosts,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

// Custom hook for easy access
export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}

