import { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import {
  getUserPreferences,
  saveContentLibraryItem,
  uploadFileToStorage,
  getSignedUrl,
} from '../config/supabase';
import { safeReadJson, safeWriteJson } from '../utils/storageHelpers';

export const ContentContext = createContext();

export function ContentProvider({ children }) {
  const authContext = useContext(AuthContext);
  const { addToast } = useToast();
  const skipAuth = import.meta.env.DEV === true && import.meta.env.VITE_SKIP_AUTH === 'true';
  
  // Safety check for AuthContext
  const user = authContext?.user || null;
  const authLoading = authContext?.loading ?? true;
  
  const [savedContent, setSavedContent] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [draftContent, setDraftContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    if (skipAuth) {
      setUserTimezone('America/New_York');
      loadSavedContent();
      setLoading(false);
      setSyncing(false);
      return;
    }

    if (authLoading) return;

    if (user?.id) {
      loadUserPreferences();
    } else {
      setLoading(false);
    }
    loadSavedContent();
  }, [user, skipAuth, authLoading]);

  // Load user preferences (timezone, etc.)
  const loadUserPreferences = async () => {
    if (skipAuth) return;
    if (!user?.id) return;

    const result = await getUserPreferences(user.id);
    if (result.success && result.data) {
      setUserTimezone(result.data.timezone);
    }
  };

  // Scheduling stubs — retained for API compatibility with consumers
  const loadScheduledPosts = async () => {};

  /**
   * Auto-save an uploaded media file to the Content Library (background, non-blocking).
   * Deduplicates by checking if the same storage_path already exists.
   * @param {string} storagePath - Supabase Storage path
   * @param {string} fileType - 'image' or 'video'
   * @param {string} fileName - Original file name
   * @param {number} sizeBytes - File size in bytes
   * @param {Object} metadata - Additional metadata (e.g., post_id, platform)
   */
  const autoSaveToLibrary = (storagePath, fileType, fileName, sizeBytes, metadata = {}) => {
    if (!user?.id || !storagePath) return;
    
    // Fire-and-forget — don't block post creation
    saveContentLibraryItem(user.id, {
      name: fileName || 'Uploaded Media',
      type: fileType === 'video' ? 'video' : 'image',
      storage_path: storagePath,
      url: null,
      size_bytes: sizeBytes || 0,
      description: 'Auto-saved from post upload',
      source: 'post_upload',
      metadata: {
        ...metadata,
        originalName: fileName,
        sizeBytes,
        autoSaved: true,
      },
    }).then(result => {
      if (!result.success && !result.error?.includes('duplicate') && !result.error?.includes('unique')) {
        console.warn('[ContentContext] Failed to auto-save media to library:', result.error);
      }
    }).catch(err => {
      console.warn('[ContentContext] Auto-save to library error:', err.message);
    });
  };

  /**
   * Upload media files to Supabase Storage and return storage paths.
   * Also auto-saves each uploaded file to the Content Library.
   * @param {Array} mediaItems - Array of { file, name, type, url } objects
   * @returns {Array} Array of { storagePath, type, name } objects
   */
  const uploadMediaFiles = async (mediaItems) => {
    if (!mediaItems || mediaItems.length === 0) return [];
    if (!user?.id) return [];

    const uploaded = [];
    for (const item of mediaItems) {
      // Skip items that are already storage paths (not blob URLs)
      if (typeof item === 'string' || !item.file) {
        uploaded.push(item);
        continue;
      }

      try {
        const result = await uploadFileToStorage(user.id, item.file, item.type || 'image');
        if (result.success) {
          const mediaInfo = {
            storagePath: result.storagePath,
            type: item.type || 'image',
            name: item.name || item.file.name,
            sizeBytes: result.sizeBytes || item.file.size,
          };
          uploaded.push(mediaInfo);

          // Auto-save to Content Library in the background (non-blocking)
          autoSaveToLibrary(
            result.storagePath,
            mediaInfo.type,
            mediaInfo.name,
            mediaInfo.sizeBytes,
            { source: 'post_creation' }
          );
        } else {
          console.error('Failed to upload media:', result.error);
          addToast(`Failed to upload ${item.name}: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Error uploading media file:', error);
      }
    }
    return uploaded;
  };

  const schedulePost = async () => null;
  const updateScheduledPost = async () => {};
  const deleteScheduledPost = async () => {};

  /**
   * Get a signed URL for a media item stored in Supabase Storage.
   * Caches signed URLs to avoid repeated calls within the same session.
   * @param {string} storagePath - The storage path of the file
   * @returns {string|null} The signed URL or null on error
   */
  const signedUrlCache = {};
  const getMediaUrl = async (storagePath) => {
    if (!storagePath) return null;
    
    // If it's already a full URL (legacy data or external URL), return as-is
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('blob:')) {
      return storagePath;
    }
    
    // Check cache first
    const cached = signedUrlCache[storagePath];
    if (cached && cached.expiresAt > new Date()) {
      return cached.url;
    }
    
    try {
      const result = await getSignedUrl(storagePath, 3600); // 1 hour
      if (result.success) {
        signedUrlCache[storagePath] = {
          url: result.signedUrl,
          expiresAt: result.expiresAt,
        };
        return result.signedUrl;
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
    }
    return null;
  };

  // Save content to Supabase Content Library
  const saveToLibrary = async (itemData) => {
    if (!user?.id) {
      addToast('Please log in to save content', 'error');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const result = await saveContentLibraryItem(user.id, {
        name: itemData.name || `Content - ${new Date().toLocaleDateString()}`,
        type: itemData.type || 'text',
        content: typeof itemData.content === 'string' ? itemData.content : JSON.stringify(itemData.content),
        size_bytes: itemData.size_bytes || 0,
        description: itemData.description || '',
        project_id: itemData.project_id || null,
      });

      if (result.success) {
        addToast('Saved to Content Library!', 'success');
        return result;
      } else {
        addToast('Failed to save to library: ' + (result.error || 'Unknown error'), 'error');
        return result;
      }
    } catch (error) {
      console.error('Error saving to library:', error);
      addToast('Error saving to library', 'error');
      return { success: false, error: error.message };
    }
  };

  // Save generated content for later use (keep in localStorage for now)
  const saveGeneratedContent = (content) => {
    const newContent = {
      id: Date.now(),
      ...content,
      savedAt: new Date().toISOString(),
    };
    setSavedContent((prev) => {
      const updated = [newContent, ...prev].slice(0, 300);
      safeWriteJson(localStorage, 'savedContent', updated, { maxBytes: 2_500_000 });
      return updated;
    });
    return newContent.id;
  };

  // Load saved content from localStorage
  const loadSavedContent = () => {
    const saved = safeReadJson(localStorage, 'savedContent', []);
    setSavedContent(Array.isArray(saved) ? saved : []);
  };

  // Set draft content for cross-page editing
  const setDraft = (content) => {
    setDraftContent(content);
    safeWriteJson(sessionStorage, 'draftContent', content, { maxBytes: 500_000 });
  };

  // Get draft content
  const getDraft = () => {
    if (draftContent) return draftContent;
    return safeReadJson(sessionStorage, 'draftContent', null);
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
    safeWriteJson(localStorage, 'savedContent', updated, { maxBytes: 2_500_000 });
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
    safeWriteJson(localStorage, 'savedContent', updated, { maxBytes: 2_500_000 });
  };

  const value = useMemo(() => ({
    savedContent,
    scheduledPosts,
    loading,
    syncing,
    userTimezone,
    saveGeneratedContent,
    saveToLibrary,
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
    getMediaUrl,
  }), [savedContent, scheduledPosts, loading, syncing, userTimezone, draftContent]);

  return (
    <ContentContext.Provider value={value}>
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

