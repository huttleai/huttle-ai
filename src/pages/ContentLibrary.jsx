import { useState, useContext, useEffect, useMemo } from 'react';
import { FolderOpen, Upload, Search, Grid, List, Image, Video, FileText, Plus, Check, HardDrive, Download, Edit, X, Folder, Edit2, Trash2, FolderPlus, Play, Sparkles, ArrowUpRight, CloudUpload } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradeModal from '../components/UpgradeModal';
import CreateProjectModal from '../components/CreateProjectModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { getContentLibraryItems, getStorageUsage, checkStorageLimit, uploadFileToStorage, saveContentLibraryItem, updateContentLibraryItem, deleteContentLibraryItem, getSignedUrl, getProjects, createProject, updateProject, deleteProject, TIERS } from '../config/supabase';
import { compressImage, formatFileSize } from '../utils/imageCompression';
import { Link } from 'react-router-dom';

export default function ContentLibrary() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const { userTier, getStorageLimit, getTierDisplayName } = useSubscription();
  const skipAuth =
    import.meta.env.VITE_SKIP_AUTH === 'true' ||
    import.meta.env.VITE_SKIP_AUTH === 'true';

  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [activeProject, setActiveProject] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddToProjectModal, setShowAddToProjectModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [uploadType, setUploadType] = useState('image');
  const [uploadProject, setUploadProject] = useState('all');
  
  // Data state
  const [contentItems, setContentItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [signedUrlCache, setSignedUrlCache] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);

  // Calculate storage values
  const storageLimit = getStorageLimit();
  const storageLimitMB = storageLimit / (1024 * 1024);
  const storageLimitDisplay = storageLimitMB >= 1024 
    ? `${(storageLimitMB / 1024).toFixed(storageLimitMB >= 10240 ? 0 : 1)} GB`
    : `${storageLimitMB.toFixed(0)} MB`;
  const storageUsedDisplay = storageUsed >= 1024 
    ? `${(storageUsed / 1024).toFixed(2)} GB`
    : `${storageUsed.toFixed(1)} MB`;
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimitMB) * 100 : 0;

  // Content type counts for sidebar
  const contentCounts = useMemo(() => {
    const counts = { images: 0, videos: 0, text: 0 };
    contentItems.forEach(item => {
      if (item.type === 'image') counts.images++;
      else if (item.type === 'video') counts.videos++;
      else if (item.type === 'text') counts.text++;
    });
    return counts;
  }, [contentItems]);

  // Tier storage info for upgrade CTA - Always suggest Pro for best value
  const tierStorageInfo = {
    [TIERS.FREE]: { limit: '250 MB', next: 'Pro', nextLimit: '25 GB' },
    [TIERS.ESSENTIALS]: { limit: '5 GB', next: 'Pro', nextLimit: '25 GB' },
    [TIERS.PRO]: { limit: '25 GB', next: null, nextLimit: null },
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (skipAuth) {
      seedDevModeData();
      return;
    }

    if (user?.id) {
      loadProjects();
      loadContent();
      loadStorageUsage();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Load projects from Supabase
  const loadProjects = async () => {
    if (skipAuth) return;
    if (!user?.id) {
      setProjects([{ id: 'all', name: 'All Content', count: 0, color: '#6366f1' }]);
      return;
    }

    const isDevUser = user.id === 'dev-user-123' || user.email === 'dev@huttle.ai';

    try {
      const result = await getProjects(user.id);
      
      if (result.success) {
        const allProjects = [
          { id: 'all', name: 'All Content', count: 0, color: '#6366f1' },
          ...result.data
        ];
        setProjects(allProjects);
      } else {
        console.warn('Failed to load projects:', result.error);
        setProjects([{ id: 'all', name: 'All Content', count: 0, color: '#6366f1' }]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([{ id: 'all', name: 'All Content', count: 0, color: '#6366f1' }]);
    }
  };

  // Load content from Supabase
  const loadContent = async () => {
    if (skipAuth) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const isDevUser = user.id === 'dev-user-123' || user.email === 'dev@huttle.ai';

    try {
      setLoading(true);
      const result = await getContentLibraryItems(user.id);

      if (result.success) {
        const transformedItems = result.data.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          url: item.url,
          storage_path: item.storage_path,
          content: item.content,
          date: new Date(item.created_at).toISOString().split('T')[0],
          size: item.size_bytes > 0 ? formatFileSize(item.size_bytes) : null,
          sizeBytes: item.size_bytes || 0,
          project: item.project_id,
          description: item.description,
        }));

        setContentItems(transformedItems);

        transformedItems.forEach(item => {
          if (item.type !== 'text' && item.storage_path) {
            getFileUrl(item).catch(err => {
              console.error('Error pre-generating signed URL:', err);
            });
          }
        });

        updateProjectCounts(transformedItems);
      } else {
        console.warn('Supabase query failed for content library:', result.error);
        setContentItems([]);
        if (!isDevUser && !result.error?.includes('JWT') && !result.error?.includes('auth')) {
          handleSupabaseError(result.error, 'load content');
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setContentItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Load storage usage from Supabase
  const loadStorageUsage = async () => {
    if (skipAuth) return;
    if (!user?.id) return;

    try {
      const result = await getStorageUsage(user.id);
      if (result.success) {
        setStorageUsed(result.usageBytes / (1024 * 1024));
      }
    } catch (error) {
      console.error('Error loading storage usage:', error);
    }
  };

  // Update project counts
  const updateProjectCounts = (items) => {
    const projectCounts = { all: items.length };
    items.forEach(item => {
      if (item.project) {
        projectCounts[item.project] = (projectCounts[item.project] || 0) + 1;
      }
    });
    setProjects(prev => prev.map(project => ({
      ...project,
      count: projectCounts[project.id] || 0
    })));
  };

  // Get signed URL for private bucket files
  const getFileUrl = async (item) => {
    if (item.type === 'text' || !item.storage_path) {
      return item.url || null;
    }

    const cached = signedUrlCache[item.storage_path];
    if (cached && cached.expiresAt > new Date()) {
      return cached.url;
    }

    try {
      const result = await getSignedUrl(item.storage_path, 3600);
      if (result.success) {
        setSignedUrlCache(prev => ({
          ...prev,
          [item.storage_path]: {
            url: result.signedUrl,
            expiresAt: result.expiresAt
          }
        }));
        return result.signedUrl;
      }
    } catch (error) {
      console.error('Error generating signed URL:', error);
    }
    return null;
  };

  // Get display URL for an item
  const getDisplayUrl = (item) => {
    if (item.type === 'text') return null;
    if (item.url) return item.url;

    if (item.storage_path) {
      const cached = signedUrlCache[item.storage_path];
      if (cached && cached.expiresAt > new Date()) {
        return cached.url;
      }
      getFileUrl(item);
    }
    return null;
  };

  // Handle Supabase errors
  const handleSupabaseError = (error, action) => {
    console.error(`Supabase error during ${action}:`, error);
    let message = `Failed to ${action}. Please try again.`;

    if (typeof error === 'string') {
      if (error.includes('JWT') || error.includes('auth')) {
        message = 'Authentication error. Please log in again.';
      } else if (error.includes('storage') || error.includes('quota')) {
        message = 'Storage limit exceeded. Consider upgrading your plan.';
      }
    }
    addToast(message, 'error');
  };

  // Seed dev mode data
  const seedDevModeData = () => {
    const demoProjects = [
      { id: 'all', name: 'All Content', count: 5, color: '#6366f1' },
      { id: 'proj-1', name: 'Spring Campaign', count: 2, color: '#EC4899' },
      { id: 'proj-2', name: 'Evergreen Tips', count: 3, color: '#10B981' },
    ];

    const demoItems = [
      {
        id: 'demo-1',
        type: 'image',
        name: 'Glow Serum Carousel',
        url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=300&fit=crop',
        storage_path: '',
        content: 'Swipe-through carousel covering the top 5 benefits of our Glow Serum with CTA on the last slide.',
        date: '2024-02-05',
        size: '2.4 MB',
        sizeBytes: 2516582,
        project: 'proj-1',
        description: 'High-performing content for IG carousel slots.',
      },
      {
        id: 'demo-2',
        type: 'video',
        name: 'Behind the Scenes Reel',
        url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop',
        storage_path: '',
        content: 'Vertical clip showing a 10-sec BTS shot in the studio.',
        date: '2024-02-04',
        size: '18.1 MB',
        sizeBytes: 18979635,
        project: 'proj-1',
        description: 'Use for TikTok and IG Reels.',
      },
      {
        id: 'demo-3',
        type: 'text',
        name: 'Newsletter Hook Ideas',
        url: null,
        storage_path: '',
        content: 'Three newsletter openers about skincare myths vs facts:\n\n1. "Think you know everything about SPF? Think again..."\n2. "The 5-minute morning routine that changed my skin"\n3. "Why your expensive serum might be doing nothing"',
        date: '2024-02-01',
        size: null,
        sizeBytes: 0,
        project: 'proj-2',
        description: 'Copy snippets for the February campaign.',
      },
      {
        id: 'demo-4',
        type: 'image',
        name: 'UGC Testimonial Graphic',
        url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300&fit=crop',
        storage_path: '',
        content: 'Template PSD with editable testimonial quote and CTA button.',
        date: '2024-01-28',
        size: '4.7 MB',
        sizeBytes: 4927693,
        project: 'proj-2',
        description: 'Use as template for testimonials.',
      },
      {
        id: 'demo-5',
        type: 'text',
        name: 'Instagram Caption Templates',
        url: null,
        storage_path: '',
        content: 'Caption template for product launches:\n\nIntroducing [PRODUCT NAME] ✨\n\nWe spent [X months] perfecting this formula because you deserve nothing but the best.\n\n🌟 Key benefits:\n• Benefit 1\n• Benefit 2\n• Benefit 3\n\nTap the link in bio to shop now! 🛒',
        date: '2024-01-25',
        size: null,
        sizeBytes: 0,
        project: 'proj-2',
        description: 'Reusable caption templates.',
      },
    ];

    setProjects(demoProjects);
    setContentItems(demoItems);
    setStorageUsed(32);
    setLoading(false);
  };

  // Filter items based on search, tab, and project
  const filteredItems = useMemo(() => {
    return contentItems.filter(item => {
      const matchesTab = activeTab === 'all' || item.type === activeTab;
      const matchesProject = activeProject === 'all' || item.project === activeProject;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesProject && matchesSearch;
    });
  }, [contentItems, activeTab, activeProject, searchQuery]);

  const handleItemClick = async (item) => {
    setSelectedItem(item);
    setEditContent(item.content || '');
    setShowDetailModal(true);
    setEditMode(false);
    
    if (item.type !== 'text' && item.storage_path) {
      await getFileUrl(item);
    }
  };

  const handleSelectItem = (id, e) => {
    e.stopPropagation();
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDownload = async () => {
    if (!selectedItem) return;

    try {
      if (selectedItem.type === 'text') {
        const blob = new Blob([selectedItem.content || ''], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedItem.name}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('Download started!', 'success');
        return;
      }

      const fileUrl = await getFileUrl(selectedItem);
      if (!fileUrl) {
        addToast('Failed to generate download link', 'error');
        return;
      }

      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = selectedItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('Download started!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      addToast('Download failed', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!user?.id || !selectedItem) {
      addToast('Please log in to save changes', 'error');
      return;
    }

    try {
      const updates = {
        content: editContent,
        updated_at: new Date().toISOString(),
      };

      const result = await updateContentLibraryItem(selectedItem.id, updates, user.id);

      if (result.success) {
        setContentItems(prev => prev.map(item =>
          item.id === selectedItem.id ? { ...item, content: editContent } : item
        ));
        addToast('Content saved successfully!', 'success');
        setEditMode(false);
      } else {
        handleSupabaseError(result.error, 'save content changes');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      handleSupabaseError(error, 'save content changes');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!user?.id) {
      addToast('Please log in to upload content', 'error');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData(e.target);
      const name = formData.get('name');
      const textContent = formData.get('content');
      const fileInput = formData.get('file');

      const contentName = name || `New ${uploadType}`;
    
      if (uploadType === 'text') {
        await handleTextUpload(contentName, textContent);
      } else {
        if (!fileInput || fileInput.size === 0) {
          addToast('Please select a file to upload', 'error');
          setUploading(false);
          return;
        }
        await handleFileUpload(fileInput, contentName);
      }

      await loadContent();
      await loadStorageUsage();
    
      addToast('Content uploaded successfully!', 'success');
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload failed:', error);
      handleSupabaseError(error, 'upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleTextUpload = async (name, content) => {
    const itemData = {
      name,
      type: 'text',
      content: content || '',
      size_bytes: 0,
      project_id: uploadProject === 'all' ? null : uploadProject,
    };

    const result = await saveContentLibraryItem(user.id, itemData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleFileUpload = async (file, name) => {
    let processedFile = file;
    let compressionResult = null;

    if (uploadType === 'image') {
      addToast('Compressing image...', 'info');
      const compression = await compressImage(file, userTier);
      processedFile = compression.compressedFile;
      compressionResult = compression;

      if (compression.savingsMB > 0) {
        addToast(`Compressed: saved ${compression.savingsMB.toFixed(1)}MB (${compression.savingsPercent}% smaller)!`, 'success');
      }
    }

    const storageCheck = await checkStorageLimit(user.id, processedFile.size, userTier);
    if (!storageCheck.allowed) {
      setShowUpgradeModal(true);
      return;
    }

    addToast('Uploading file...', 'info');

    const uploadResult = await uploadFileToStorage(user.id, processedFile, uploadType);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    const itemData = {
      name,
      type: uploadType,
      storage_path: uploadResult.storagePath,
      url: null,
      size_bytes: uploadResult.sizeBytes,
      project_id: uploadProject === 'all' ? null : uploadProject,
      description: `Uploaded ${uploadType}`,
      metadata: compressionResult ? {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        savingsMB: compressionResult.savingsMB,
        savingsPercent: compressionResult.savingsPercent,
      } : null,
    };

    const saveResult = await saveContentLibraryItem(user.id, itemData);
    if (!saveResult.success) {
      throw new Error(saveResult.error);
    }
  };

  const handleDeleteContent = async () => {
    if (!user?.id || !deleteTarget) {
      addToast('Please log in to delete content', 'error');
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteContentLibraryItem(deleteTarget.id, user.id);

      if (result.success) {
        await loadContent();
        await loadStorageUsage();
        addToast('Content deleted successfully', 'success');
        setShowDetailModal(false);
        setShowDeleteConfirmation(false);
        setDeleteTarget(null);
      } else {
        handleSupabaseError(result.error, 'delete content');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      handleSupabaseError(error, 'delete content');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!user?.id || !deleteTarget || deleteTarget.type !== 'project') return;
    if (deleteTarget.id === 'all') return;

    setIsDeleting(true);

    try {
      const result = await deleteProject(deleteTarget.id, user.id);

      if (result.success) {
        await loadProjects();
        await loadContent();

        if (activeProject === deleteTarget.id) {
          setActiveProject('all');
        }

        addToast('Project deleted successfully', 'success');
        setShowDeleteConfirmation(false);
        setDeleteTarget(null);
      } else {
        handleSupabaseError(result.error, 'delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      handleSupabaseError(error, 'delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddToProject = async (projectId) => {
    if (!user?.id || !selectedItem) {
      addToast('Please log in to update project assignment', 'error');
      return;
    }

    try {
      const updates = {
        project_id: projectId === 'remove' ? null : projectId,
        updated_at: new Date().toISOString(),
      };

      const result = await updateContentLibraryItem(selectedItem.id, updates, user.id);

      if (result.success) {
        setContentItems(prev => prev.map(item =>
          item.id === selectedItem.id ? { ...item, project: projectId === 'remove' ? null : projectId } : item
        ));

        updateProjectCounts(contentItems.map(item =>
          item.id === selectedItem.id ? { ...item, project: projectId === 'remove' ? null : projectId } : item
        ));

        const projectName = projectId === 'remove'
          ? 'no project'
          : projects.find(p => p.id === projectId)?.name || 'project';

        addToast(`Added to ${projectName}`, 'success');
        setShowAddToProjectModal(false);
      } else {
        handleSupabaseError(result.error, 'update project assignment');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      handleSupabaseError(error, 'update project assignment');
    }
  };

  const handleRemoveFromProject = async () => {
    if (!user?.id || !selectedItem) {
      addToast('Please log in to update project assignment', 'error');
      return;
    }

    try {
      const updates = {
        project_id: null,
        updated_at: new Date().toISOString(),
      };

      const result = await updateContentLibraryItem(selectedItem.id, updates, user.id);

      if (result.success) {
        setContentItems(prev => prev.map(item =>
          item.id === selectedItem.id ? { ...item, project: null } : item
        ));
        await loadContent();
        addToast('Removed from project', 'success');
      } else {
        handleSupabaseError(result.error, 'remove from project');
      }
    } catch (error) {
      console.error('Error removing from project:', error);
      handleSupabaseError(error, 'remove from project');
    }
  };

  const handleCreateOrUpdateProject = async (projectData) => {
    if (!user?.id) {
      addToast('Please log in to manage projects', 'error');
      return;
    }

    try {
      if (editingProject) {
        const result = await updateProject(editingProject.id, projectData, user.id);
        
        if (result.success) {
          await loadProjects();
          addToast('Project updated successfully', 'success');
          setEditingProject(null);
        } else {
          handleSupabaseError(result.error, 'update project');
        }
      } else {
        const result = await createProject(user.id, projectData);
        
        if (result.success) {
          await loadProjects();
          addToast('Project created successfully', 'success');
          
          if (showUploadModal && result.data?.id) {
            setUploadProject(result.data.id);
          }
        } else {
          handleSupabaseError(result.error, 'create project');
        }
      }
    } catch (error) {
      console.error('Error saving project:', error);
      handleSupabaseError(error, 'save project');
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowCreateProjectModal(true);
  };

  const handleCloseProjectModal = () => {
    setShowCreateProjectModal(false);
    setEditingProject(null);
  };

  const confirmDeleteContent = (item) => {
    setDeleteTarget({ type: 'content', id: item.id, name: item.name });
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteProject = (project) => {
    setDeleteTarget({ type: 'project', id: project.id, name: project.name });
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget?.type === 'content') {
      handleDeleteContent();
    } else if (deleteTarget?.type === 'project') {
      handleDeleteProject();
    }
  };

  // Render thumbnail based on content type
  const renderThumbnail = (item, size = 'normal') => {
    const heightClass = size === 'large' ? 'h-44' : 'h-36';
    
    if (item.type === 'text') {
      return (
        <div className={`${heightClass} bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-3 rounded-t-xl overflow-hidden relative`}>
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-200/80 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-5 font-mono">
            {item.content?.slice(0, 150) || 'No content preview available'}
            {item.content?.length > 150 && '...'}
          </p>
        </div>
      );
    }

    if (item.type === 'video') {
      const videoUrl = getDisplayUrl(item);
      return (
        <div className={`${heightClass} relative bg-gray-900 rounded-t-xl overflow-hidden`}>
          {videoUrl ? (
            <img 
              src={videoUrl} 
              alt={item.name}
              className="w-full h-full object-cover opacity-90"
              onError={(e) => {
                if (item.storage_path) {
                  getFileUrl(item).then(url => {
                    if (url) e.target.src = url;
                  });
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <Video className="w-10 h-10 text-gray-600" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-gray-900 ml-0.5" />
            </div>
          </div>
          {item.size && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded font-medium">
              {item.size}
            </div>
          )}
        </div>
      );
    }

    // Image type
    const imageUrl = getDisplayUrl(item);
    return (
      <div className={`${heightClass} relative bg-gray-100 rounded-t-xl overflow-hidden`}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              if (item.storage_path) {
                getFileUrl(item).then(url => {
                  if (url) e.target.src = url;
                });
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Image className="w-10 h-10 text-gray-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-2 sm:px-4 md:px-8 pb-20 lg:pb-8 overflow-x-hidden w-full max-w-full">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <FolderOpen className="w-6 h-6 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Content Library
              </h1>
              <p className="text-gray-500">
                Your centralized hub for all content assets
              </p>
            </div>
          </div>
        </div>

        {/* Main Layout: Content + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full max-w-full">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 w-full max-w-full">
            {/* Search Bar */}
            <div className="mb-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-huttle-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search your content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-huttle-primary/50 focus:border-huttle-primary transition-all shadow-sm hover:shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

            {/* Projects Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap text-sm bg-white border border-dashed border-gray-300 text-gray-600 hover:border-huttle-primary hover:text-huttle-primary hover:bg-huttle-primary/5"
              >
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-white transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                New Project
              </button>

              {projects.map((project) => (
                <div key={project.id} className="relative group">
                  <button
                    onClick={() => setActiveProject(project.id)}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap text-sm border ${
                      activeProject === project.id
                        ? 'bg-white border-huttle-primary text-huttle-primary shadow-sm ring-1 ring-huttle-primary/20'
                        : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm"
                      style={{ 
                        backgroundColor: activeProject === project.id ? project.color : '#f3f4f6',
                        color: activeProject === project.id ? '#fff' : '#6b7280'
                      }}
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </div>
                    <span>{project.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeProject === project.id ? 'bg-huttle-primary/10 text-huttle-primary' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {project.count}
                    </span>
                  </button>
                  {project.id !== 'all' && (
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 scale-90">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                        className="w-6 h-6 bg-white text-gray-500 border border-gray-200 rounded-full flex items-center justify-center hover:text-huttle-primary hover:border-huttle-primary shadow-sm"
                        title="Edit project"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); confirmDeleteProject(project); }}
                        className="w-6 h-6 bg-white text-gray-500 border border-gray-200 rounded-full flex items-center justify-center hover:text-red-500 hover:border-red-500 shadow-sm"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 mb-6">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { key: 'all', label: 'All', icon: FolderOpen },
                  { key: 'image', label: 'Images', icon: Image },
                  { key: 'video', label: 'Videos', icon: Video },
                  { key: 'text', label: 'Text', icon: FileText }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${
                      activeTab === tab.key
                        ? 'bg-huttle-primary text-white shadow-md shadow-huttle-primary/20'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-huttle-primary' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 text-huttle-primary' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  disabled={storagePercent >= 100}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl transition-all shadow-md text-sm font-medium ${
                    storagePercent >= 100
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-huttle-gradient text-white hover:shadow-lg hover:shadow-huttle-primary/20'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  {storagePercent >= 100 ? 'Storage Full' : 'Upload Content'}
                </button>
              </div>
            </div>

          {/* Selected Items Actions */}
          {selectedItems.length > 0 && (
            <div className="bg-huttle-gradient text-white rounded-xl p-3 mb-4 flex items-center justify-between text-sm">
              <span className="font-medium">{selectedItems.length} item(s) selected</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    addToast('Media added to post! Open Create Post modal to see them.', 'success');
                    setSelectedItems([]);
                  }}
                  className="px-3 py-1.5 bg-white text-huttle-primary rounded-lg hover:bg-gray-100 transition-all font-medium text-sm"
                >
                  Add to Post
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm(`Delete ${selectedItems.length} item(s)?`)) {
                      setContentItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
                      addToast(`${selectedItems.length} item(s) deleted`, 'success');
                      setSelectedItems([]);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium text-sm"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setSelectedItems([])}
                  className="px-3 py-1.5 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all font-medium text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Content Loading State */}
          {loading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-huttle-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading your content...</h3>
              <p className="text-gray-600">Please wait while we fetch your content library</p>
            </div>
          )}

          {/* Content Grid/List */}
          {!loading && (
            <>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4' 
                : 'space-y-3'
              }>

                {filteredItems.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`card group relative transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer overflow-hidden ${
                      selectedItems.includes(item.id) ? 'ring-2 ring-huttle-primary ring-offset-2' : ''
                    }`}
                  >
                    {viewMode === 'grid' ? (
                      <>
                        {/* Thumbnail */}
                        <div className="relative">
                          {renderThumbnail(item)}
                          
                          {/* Selection checkbox */}
                          <button
                            onClick={(e) => handleSelectItem(item.id, e)}
                            className={`absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              selectedItems.includes(item.id)
                                ? 'bg-huttle-primary text-white scale-100 opacity-100 shadow-md'
                                : 'bg-white/90 text-gray-400 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 hover:bg-white hover:text-huttle-primary shadow-sm'
                            }`}
                          >
                            {selectedItems.includes(item.id) ? <Check className="w-5 h-5" /> : <div className="w-4 h-4 rounded border-2 border-gray-300" />}
                          </button>
                          
                          {/* Type badge */}
                          <div className={`absolute top-2 left-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-sm backdrop-blur-md ${
                            item.type === 'image' ? 'bg-pink-500/90 text-white' :
                            item.type === 'video' ? 'bg-purple-500/90 text-white' :
                            'bg-huttle-primary/90 text-white'
                          }`}>
                            {item.type === 'image' && <Image className="w-3 h-3" />}
                            {item.type === 'video' && <Video className="w-3 h-3" />}
                            {item.type === 'text' && <FileText className="w-3 h-3" />}
                            <span>{item.type}</span>
                          </div>
                        </div>
                        
                        {/* Info */}
                        <div className="p-4 bg-white">
                          <h3 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-huttle-primary transition-colors">{item.name}</h3>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                item.type === 'image' ? 'bg-pink-400' :
                                item.type === 'video' ? 'bg-purple-400' :
                                'bg-huttle-primary'
                              }`} />
                              {item.date}
                            </span>
                            {item.size && <span>{item.size}</span>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                        {/* List view thumbnail */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 shadow-inner border border-gray-100">
                          {item.type === 'text' ? (
                            <div className="w-full h-full bg-gradient-to-br from-huttle-50 to-cyan-50 flex items-center justify-center p-2">
                              <FileText className="w-6 h-6 text-huttle-primary" />
                            </div>
                          ) : item.type === 'video' ? (
                            <div className="w-full h-full relative group/thumb">
                              <img 
                                src={getDisplayUrl(item) || ''} 
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm backdrop-blur-sm">
                                  <Play className="w-4 h-4 text-gray-900 ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img 
                              src={getDisplayUrl(item) || ''} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-huttle-primary transition-colors">{item.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span>{item.date}</span>
                            {item.size && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <span>{item.size}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                              item.type === 'image' ? 'bg-pink-50 text-pink-600 border border-pink-100' :
                              item.type === 'video' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                              'bg-huttle-50 text-huttle-primary border border-huttle-100'
                            }`}>
                              {item.type}
                            </span>
                            {item.project && (
                              <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-medium rounded-md border border-gray-100 flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                {projects.find(p => p.id === item.project)?.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleSelectItem(item.id, e)}
                          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            selectedItems.includes(item.id)
                              ? 'bg-huttle-primary border-huttle-primary text-white shadow-md'
                              : 'border-gray-100 text-gray-300 hover:border-huttle-primary hover:text-huttle-primary hover:bg-white'
                          }`}
                        >
                          {selectedItems.includes(item.id) ? <Check className="w-5 h-5" /> : <div className="w-4 h-4 rounded border-2 border-current" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {filteredItems.length === 0 && !loading && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  {contentItems.length === 0 ? (
                    <>
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-huttle-primary/10 to-indigo-100 flex items-center justify-center">
                        <CloudUpload className="w-10 h-10 text-huttle-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Start building your library</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Upload images, videos, and text content to keep all your creative assets organized in one place.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button 
                          onClick={() => setShowUploadModal(true)}
                          disabled={storagePercent >= 100}
                          className="px-6 py-3 bg-huttle-gradient text-white rounded-xl font-medium hover:bg-huttle-primary-dark transition-all shadow-md inline-flex items-center justify-center gap-2"
                        >
                          <Upload className="w-5 h-5" />
                          Upload Your First Asset
                        </button>
                        <button 
                          onClick={() => setShowCreateProjectModal(true)}
                          className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all inline-flex items-center justify-center gap-2"
                        >
                          <FolderPlus className="w-5 h-5" />
                          Create a Project
                        </button>
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500 mb-3">What you can store:</p>
                        <div className="flex justify-center gap-6 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Image className="w-4 h-4 text-pink-500" />
                            <span>Images</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Video className="w-4 h-4 text-purple-500" />
                            <span>Videos</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <FileText className="w-4 h-4 text-huttle-primary" />
                            <span>Text & Captions</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery 
                          ? `No results for "${searchQuery}"`
                          : 'Try adjusting your filters'
                        }
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-huttle-primary font-medium hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Storage Sidebar - Desktop only, appears on right */}
        <div className="hidden lg:block lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-24">
            {/* Storage Header - Compact */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                storagePercent >= 90 ? 'bg-red-100' : storagePercent >= 70 ? 'bg-amber-100' : 'bg-huttle-primary/10'
              }`}>
                <HardDrive className={`w-4 h-4 ${
                  storagePercent >= 90 ? 'text-red-600' : storagePercent >= 70 ? 'text-amber-600' : 'text-huttle-primary'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-gray-900">{storageUsedDisplay}</span>
                  <span className="text-xs text-gray-500">/ {storageLimitDisplay}</span>
                </div>
              </div>
            </div>

            {/* Progress Bar - Compact */}
            <div className="mb-3">
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    storagePercent >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    storagePercent >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    'bg-gradient-to-r from-huttle-primary to-indigo-500'
                  }`}
                  style={{ width: `${Math.min(storagePercent, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1 ${
                storagePercent >= 90 ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}>
                {storagePercent >= 100 
                  ? 'Storage full'
                  : `${(100 - storagePercent).toFixed(0)}% available`
                }
              </p>
            </div>

            {/* Content Breakdown */}
            <div className="flex flex-col gap-1.5 mb-3 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-xs text-gray-600">{contentCounts.images} img</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs text-gray-600">{contentCounts.videos} vid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-huttle-primary" />
                <span className="text-xs text-gray-600">{contentCounts.text} txt</span>
              </div>
            </div>

            {/* Upgrade CTA - Compact */}
            {tierStorageInfo[userTier]?.next && (
              <Link
                to="/subscription"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-huttle-gradient text-white text-sm font-medium rounded-lg hover:shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade to Pro
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Pro badge for Pro users - Compact */}
            {userTier === TIERS.PRO && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-900">Pro Storage Unlocked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Storage Bar - Fixed at bottom, ultra compact */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-2 z-40 shadow-lg">
        <div className="flex items-center gap-2">
          {/* Storage icon */}
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            storagePercent >= 90 ? 'bg-red-100' : storagePercent >= 70 ? 'bg-amber-100' : 'bg-huttle-primary/10'
          }`}>
            <HardDrive className={`w-3.5 h-3.5 ${
              storagePercent >= 90 ? 'text-red-600' : storagePercent >= 70 ? 'text-amber-600' : 'text-huttle-primary'
            }`} />
          </div>
          
          {/* Storage text and progress bar combined */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-gray-900">{storageUsedDisplay} / {storageLimitDisplay}</span>
              <span className="text-xs text-gray-500">{contentCounts.images + contentCounts.videos + contentCounts.text} items</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
              <div 
                className={`h-1 rounded-full transition-all duration-500 ${
                  storagePercent >= 90 ? 'bg-red-500' :
                  storagePercent >= 70 ? 'bg-amber-500' :
                  'bg-huttle-primary'
                }`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Upgrade button */}
          {tierStorageInfo[userTier]?.next && (
            <Link
              to="/subscription"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-huttle-gradient text-white text-xs font-medium rounded-lg flex-shrink-0 hover:shadow-md transition-shadow"
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Pro</span>
            </Link>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">Content Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Preview */}
              {selectedItem.type === 'text' ? (
                <div className="mb-6">
                  {editMode ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows="10"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 whitespace-pre-wrap font-mono text-sm">
                      {selectedItem.content || 'No content'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 rounded-xl overflow-hidden bg-gray-100">
                  {selectedItem.type === 'video' ? (
                    <div className="relative">
                      <img 
                        src={getDisplayUrl(selectedItem) || ''} 
                        alt={selectedItem.name}
                        className="w-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-7 h-7 text-gray-900 ml-1" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={getDisplayUrl(selectedItem) || ''} 
                      alt={selectedItem.name}
                      className="w-full"
                    />
                  )}
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
                  <p className="text-gray-900 font-medium mt-1">{selectedItem.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                  <p className="text-gray-900 capitalize mt-1">{selectedItem.type}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date Added</label>
                  <p className="text-gray-900 mt-1">{selectedItem.date}</p>
                </div>
                {selectedItem.size && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">File Size</label>
                    <p className="text-gray-900 mt-1">{selectedItem.size}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {selectedItem.type === 'text' ? (
                    editMode ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 px-6 py-3 bg-huttle-gradient text-white rounded-xl hover:bg-huttle-primary-dark transition-colors font-medium shadow-md"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => { setEditMode(false); setEditContent(selectedItem.content || ''); }}
                          className="flex-1 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditMode(true)}
                          className="flex-1 px-6 py-3 border-2 border-huttle-primary text-huttle-primary rounded-xl hover:bg-huttle-primary hover:text-white transition-all font-medium flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex-1 px-6 py-3 bg-huttle-gradient text-white rounded-xl hover:bg-huttle-primary-dark transition-colors font-medium shadow-md flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </>
                    )
                  ) : (
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-6 py-3 bg-huttle-gradient text-white rounded-xl hover:bg-huttle-primary-dark transition-colors font-medium shadow-md flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddToProjectModal(true)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Folder className="w-4 h-4" />
                    {selectedItem.project ? 'Change Project' : 'Add to Project'}
                  </button>
                  {selectedItem.project && (
                    <button
                      onClick={handleRemoveFromProject}
                      className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Remove from Project
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => confirmDeleteContent(selectedItem)}
                  className="w-full px-6 py-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Upload Content</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-5">
              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Content Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'image', label: 'Image', icon: Image, color: 'pink' },
                    { key: 'video', label: 'Video', icon: Video, color: 'purple' },
                    { key: 'text', label: 'Text', icon: FileText, color: 'blue' }
                  ].map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setUploadType(type.key)}
                      className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                        uploadType === type.key
                          ? 'border-huttle-primary bg-huttle-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className={`w-6 h-6 ${uploadType === type.key ? 'text-huttle-primary' : 'text-gray-400'}`} />
                      <span className={`font-medium text-sm ${uploadType === type.key ? 'text-huttle-primary' : 'text-gray-600'}`}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload or Text Input */}
              {uploadType === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
                  <textarea
                    name="content"
                    rows="6"
                    placeholder="Enter captions, titles, descriptions, or any text ideas..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload {uploadType === 'image' ? 'Image' : 'Video'} File
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-huttle-primary hover:bg-huttle-primary/5 transition-all bg-gray-50/50 group cursor-pointer">
                    <input
                      type="file"
                      name="file"
                      accept={uploadType === 'image' ? 'image/*' : 'video/*'}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer w-full h-full block">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-8 h-8 text-huttle-primary" />
                      </div>
                      <p className="text-gray-900 font-semibold mb-1 text-lg group-hover:text-huttle-primary transition-colors">
                        {uploading ? 'Uploading...' : 'Click or Drag to Upload'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {uploadType === 'image' ? 'PNG, JPG, GIF up to 10MB' : 'MP4, MOV up to 500MB'}
                      </p>
                    </label>
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Give this content a memorable name..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Project <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={uploadProject}
                    onChange={(e) => setUploadProject(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none bg-white"
                  >
                    <option value="all">No Project</option>
                    {projects.filter(p => p.id !== 'all').map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateProjectModal(true)}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 font-medium"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium shadow-md flex items-center justify-center gap-2 ${
                    uploading
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-huttle-gradient text-white hover:bg-huttle-primary-dark'
                  } transition-colors`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Project Modal */}
      {showAddToProjectModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add to Project</h2>
              <button onClick={() => setShowAddToProjectModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select a project for "{selectedItem.name}":
              </p>
              <div className="space-y-2">
                {projects.filter(p => p.id !== 'all').map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleAddToProject(project.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      selectedItem.project === project.id
                        ? 'border-huttle-primary bg-huttle-primary/5'
                        : 'border-gray-200 hover:border-huttle-primary hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: project.color + '20' }}>
                        <Folder className="w-4 h-4" style={{ color: project.color }} />
                      </div>
                      <span className="font-medium">{project.name}</span>
                    </div>
                    {selectedItem.project === project.id && (
                      <Check className="w-5 h-5 text-huttle-primary" />
                    )}
                  </button>
                ))}
              </div>
              {projects.filter(p => p.id !== 'all').length === 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-3">No projects yet</p>
                  <button
                    onClick={() => {
                      setShowAddToProjectModal(false);
                      setShowCreateProjectModal(true);
                    }}
                    className="text-huttle-primary font-medium hover:underline"
                  >
                    Create your first project
                  </button>
                </div>
              )}
              {selectedItem.project && (
                <button
                  onClick={() => handleAddToProject('remove')}
                  className="w-full mt-3 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Remove from all projects
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={handleCloseProjectModal}
        onSave={handleCreateOrUpdateProject}
        initialData={editingProject}
        isEditing={!!editingProject}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => { setShowDeleteConfirmation(false); setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.type === 'project' ? 'Delete Project' : 'Delete Content'}
        message={
          deleteTarget?.type === 'project'
            ? 'Are you sure you want to delete this project? Content will be moved to "All Content".'
            : 'This will permanently delete this content from your library.'
        }
        itemName={deleteTarget?.name}
        type={deleteTarget?.type}
        isDeleting={isDeleting}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="storage"
        featureName="Increased Storage"
      />
      </div>
    </div>
  );
}
