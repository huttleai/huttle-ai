import { useState, useContext, useEffect } from 'react';
import { FolderOpen, Upload, Search, Filter, Grid, List, Image, Video, FileText, Plus, Check, HardDrive, Download, Edit, X, Folder, Edit2, Trash2, FolderPlus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradeModal from '../components/UpgradeModal';
import CreateProjectModal from '../components/CreateProjectModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { getContentLibraryItems, getStorageUsage, checkStorageLimit, uploadFileToStorage, saveContentLibraryItem, updateContentLibraryItem, deleteContentLibraryItem, getSignedUrl, getProjects, createProject, updateProject, deleteProject, getProjectContentCounts } from '../config/supabase';
import { compressImage, formatFileSize } from '../utils/imageCompression';

export default function ContentLibrary() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const { userTier, getStorageLimit } = useSubscription();

  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [activeProject, setActiveProject] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddToProjectModal, setShowAddToProjectModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'content'|'project', id, name }
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
  const [signedUrlCache, setSignedUrlCache] = useState({}); // Cache signed URLs: { storagePath: { url, expiresAt } }

  // Calculate storage values
  const storageLimit = getStorageLimit();
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  // Load data on mount and when user changes
  useEffect(() => {
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
    if (!user?.id) return;

    try {
      const result = await getProjects(user.id);
      
      if (result.success) {
        // Always include "All Content" project
        const allProjects = [
          { id: 'all', name: 'All Content', count: 0, color: '#6366f1' },
          ...result.data
        ];
        setProjects(allProjects);
      } else {
        console.error('Failed to load projects:', result.error);
        // Still set "All Content" as fallback
        setProjects([{ id: 'all', name: 'All Content', count: 0, color: '#6366f1' }]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([{ id: 'all', name: 'All Content', count: 0, color: '#6366f1' }]);
    }
  };

  // Load content from Supabase
  const loadContent = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await getContentLibraryItems(user.id);

      if (result.success) {
        // Transform data for component compatibility
        const transformedItems = result.data.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          url: item.url, // May be null for private bucket files
          storage_path: item.storage_path, // Needed for signed URL generation
          content: item.content,
          date: new Date(item.created_at).toISOString().split('T')[0],
          size: item.size_bytes > 0 ? formatFileSize(item.size_bytes) : null,
          project: item.project_id,
          description: item.description,
        }));

        setContentItems(transformedItems);

        // Pre-generate signed URLs for images/videos (async, non-blocking)
        // URLs will be cached and images will load once URLs are ready
        transformedItems.forEach(item => {
          if (item.type !== 'text' && item.storage_path) {
            getFileUrl(item).catch(err => {
              console.error('Error pre-generating signed URL:', err);
            });
          }
        });

        // Update projects count
        updateProjectCounts(transformedItems);
      } else {
        console.error('Failed to load content:', result.error);
        handleSupabaseError(result.error, 'load content');
      }
    } catch (error) {
      console.error('Error loading content:', error);
      handleSupabaseError(error, 'load content');
    } finally {
      setLoading(false);
    }
  };

  // Load storage usage from Supabase
  const loadStorageUsage = async () => {
    if (!user?.id) return;

    try {
      const result = await getStorageUsage(user.id);
      if (result.success) {
        setStorageUsed(result.usageBytes / (1024 * 1024)); // Convert to MB for display
      } else {
        handleSupabaseError(result.error, 'load storage usage');
      }
    } catch (error) {
      console.error('Error loading storage usage:', error);
      handleSupabaseError(error, 'load storage usage');
    }
  };

  // Update project counts based on content
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
    // Text content doesn't need URLs
    if (item.type === 'text' || !item.storage_path) {
      return item.url || null;
    }

    // Check cache first
    const cached = signedUrlCache[item.storage_path];
    if (cached && cached.expiresAt > new Date()) {
      return cached.url;
    }

    // Generate new signed URL (expires in 1 hour)
    try {
      const result = await getSignedUrl(item.storage_path, 3600);
      if (result.success) {
        // Cache the signed URL
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

  // Get display URL for an item (sync - uses cache)
  const getDisplayUrl = (item) => {
    // Text content doesn't need URLs
    if (item.type === 'text') {
      return null;
    }

    // If there's a stored URL (legacy), use it
    if (item.url) {
      return item.url;
    }

    // Otherwise, check cache for signed URL
    if (item.storage_path) {
      const cached = signedUrlCache[item.storage_path];
      if (cached && cached.expiresAt > new Date()) {
        return cached.url;
      }
      // If not in cache, trigger async generation (for next render)
      getFileUrl(item);
    }

    return null; // Return null while generating
  };

  // Handle Supabase errors with user-friendly messages
  const handleSupabaseError = (error, action) => {
    console.error(`Supabase error during ${action}:`, error);

    let message = `Failed to ${action}. Please try again.`;

    if (typeof error === 'string') {
      // Handle specific error messages
      if (error.includes('JWT') || error.includes('auth')) {
        message = 'Authentication error. Please log in again.';
      } else if (error.includes('RLS') || error.includes('policy')) {
        message = 'Permission denied. You may not have access to this feature.';
      } else if (error.includes('network') || error.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      } else if (error.includes('storage') || error.includes('quota')) {
        message = 'Storage limit exceeded. Consider upgrading your plan.';
      } else if (error.includes('duplicate') || error.includes('unique')) {
        message = 'This item already exists.';
      } else if (error.includes('not found') || error.includes('does not exist')) {
        message = 'The requested item was not found.';
      }
    } else if (error?.message) {
      // Handle error objects
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('jwt') || errorMsg.includes('auth')) {
        message = 'Authentication error. Please log in again.';
      } else if (errorMsg.includes('rls') || errorMsg.includes('policy')) {
        message = 'Permission denied. You may not have access to this feature.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      } else if (errorMsg.includes('storage') || errorMsg.includes('quota')) {
        message = 'Storage limit exceeded. Consider upgrading your plan.';
      }
    }

    addToast(message, 'error');
  };

  const [selectedItems, setSelectedItems] = useState([]);

  const filteredItems = contentItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesProject = activeProject === 'all' || item.project === activeProject;
    return matchesTab && matchesProject;
  });

  const handleItemClick = async (item) => {
    setSelectedItem(item);
    setEditContent(item.content || '');
    setShowDetailModal(true);
    setEditMode(false);
    
    // Generate signed URL if needed (for images/videos)
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
      // For text content, download as text file
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

      // For images/videos, get signed URL and download
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
        // Update local state
        setContentItems(prev => prev.map(item =>
          item.id === selectedItem.id
            ? { ...item, content: editContent }
            : item
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
    // Get form data
    const formData = new FormData(e.target);
    const name = formData.get('name');
      const textContent = formData.get('content');
      const fileInput = formData.get('file'); // For file uploads

      const contentName = name || `New ${uploadType}`;
    
    if (uploadType === 'text') {
        // Handle text content upload
        await handleTextUpload(contentName, textContent);
    } else {
        // Handle file upload (images/videos)
        if (!fileInput) {
          addToast('Please select a file to upload', 'error');
          return;
        }
        await handleFileUpload(fileInput, contentName);
      }

      // Reload content and storage usage
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
      size_bytes: 0, // Text doesn't count toward storage
      project_id: uploadProject === 'all' ? null : uploadProject,
    };

    const result = await saveContentLibraryItem(user.id, itemData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleFileUpload = async (file, name) => {
    // Step 1: Compress image if needed
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

    // Step 2: Check storage limit
    const storageCheck = await checkStorageLimit(user.id, processedFile.size, userTier);
    if (!storageCheck.allowed) {
      // Show upgrade modal instead of throwing error
      setShowUpgradeModal(true);
      return; // Exit upload process
    }

    // Step 3: Upload file to Supabase Storage
    addToast('Uploading file...', 'info');

    const uploadResult = await uploadFileToStorage(user.id, processedFile, uploadType);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    // Step 4: Save metadata to database
    // Note: url is null for private bucket - signed URLs generated on-demand
    const itemData = {
      name,
      type: uploadType,
      storage_path: uploadResult.storagePath,
      url: null, // Private bucket - URLs generated via signed URLs
      size_bytes: uploadResult.sizeBytes,
      project_id: uploadProject === 'all' ? null : uploadProject,
      description: `Uploaded ${uploadType}`,
      metadata: compressionResult ? {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        savingsMB: compressionResult.savingsMB,
        savingsPercent: compressionResult.savingsPercent,
        compressionSettings: compressionResult.settings,
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
        // Reload content and storage usage
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
    if (!user?.id || !deleteTarget || deleteTarget.type !== 'project') {
      return;
    }

    if (deleteTarget.id === 'all') return;

    setIsDeleting(true);

    try {
      const result = await deleteProject(deleteTarget.id, user.id);

      if (result.success) {
        // Reload projects and content
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
        // Update local state
      setContentItems(prev => prev.map(item =>
          item.id === selectedItem.id ? { ...item, project: projectId === 'remove' ? null : projectId } : item
      ));

        // Update project counts
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
        // Update local state
        setContentItems(prev => prev.map(item =>
          item.id === selectedItem.id ? { ...item, project: null } : item
        ));

        // Reload to update counts
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
        // Update existing project
        const result = await updateProject(editingProject.id, projectData, user.id);
        
        if (result.success) {
          await loadProjects();
          addToast('Project updated successfully', 'success');
          setEditingProject(null);
        } else {
          handleSupabaseError(result.error, 'update project');
        }
      } else {
        // Create new project
        const result = await createProject(user.id, projectData);
        
        if (result.success) {
          await loadProjects();
          addToast('Project created successfully', 'success');
          
          // If we're in upload modal, auto-select the new project
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
    setDeleteTarget({
      type: 'content',
      id: item.id,
      name: item.name
    });
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteProject = (project) => {
    setDeleteTarget({
      type: 'project',
      id: project.id,
      name: project.name
    });
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget?.type === 'content') {
      handleDeleteContent();
    } else if (deleteTarget?.type === 'project') {
      handleDeleteProject();
    }
  };

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Content Library
        </h1>
        <p className="text-gray-600">
          Your centralized hub for all content assets
        </p>
      </div>

      {/* Header with Storage Meter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          {/* Storage moved to top right - see below */}
        </div>
        
        {/* Compact Storage Meter - Top Right */}
        <div className={`bg-white rounded-lg shadow-sm border p-2 flex items-center gap-2 w-48 ${
          storagePercent >= 100 ? 'border-red-300 bg-red-50' :
          storagePercent >= 90 ? 'border-yellow-300 bg-yellow-50' :
          'border-gray-200'
        }`}>
          <HardDrive className={`w-3 h-3 flex-shrink-0 ${
            storagePercent >= 100 ? 'text-red-600' :
            storagePercent >= 90 ? 'text-yellow-600' :
            'text-gray-600'
          }`} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-medium text-gray-700">Storage</span>
              <span className={`text-[10px] font-semibold ${
                storagePercent >= 100 ? 'text-red-600' :
                storagePercent >= 90 ? 'text-yellow-600' :
                'text-huttle-primary'
              }`}>
                {storageUsed.toFixed(0)}/{storageLimit} MB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
              <div 
                className={`h-1 rounded-full transition-all ${
                  storagePercent >= 100 ? 'bg-red-500' :
                  storagePercent >= 90 ? 'bg-yellow-500' :
                  'bg-huttle-primary'
                }`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              ></div>
            </div>
            {storagePercent >= 90 && (
              <div className="text-[9px] mt-0.5 text-center">
                {storagePercent >= 100 ? (
                  <span className="text-red-600 font-medium">Storage limit reached</span>
                ) : (
                  <span className="text-yellow-600 font-medium">
                    {storageLimit - storageUsed.toFixed(0)} MB remaining
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects Filter with Create Button */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {/* Create Project Button */}
        <button
          onClick={() => setShowCreateProjectModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap text-sm bg-gradient-to-r from-huttle-primary to-indigo-700 text-white hover:shadow-md"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New Project
        </button>

        {/* Project Filter Buttons */}
        {projects.map((project) => (
          <div key={project.id} className="relative group">
            <button
              onClick={() => setActiveProject(project.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap text-sm ${
                activeProject === project.id
                  ? 'text-white shadow-md'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              style={{
                backgroundColor: activeProject === project.id ? project.color : undefined
              }}
            >
              <Folder className="w-3.5 h-3.5" />
              {project.name}
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                activeProject === project.id ? 'bg-white bg-opacity-20' : 'bg-gray-100'
              }`}>
                {project.count}
              </span>
            </button>
            {project.id !== 'all' && (
              <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProject(project);
                  }}
                  className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 shadow-lg"
                  title="Edit project"
                >
                  <Edit2 className="w-2.5 h-2.5" />
              </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteProject(project);
                  }}
                  className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                  title="Delete project"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'all', label: 'All', icon: FolderOpen },
            { key: 'image', label: 'Images', icon: Image },
            { key: 'video', label: 'Videos', icon: Video },
            { key: 'text', label: 'Text', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap text-sm ${
                activeTab === tab.key
                  ? 'bg-huttle-primary text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2 ml-auto">
          <div className="flex gap-1 bg-white border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-huttle-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-huttle-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={() => setShowUploadModal(true)}
            disabled={storagePercent >= 100}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shadow-sm text-sm ${
              storagePercent >= 100
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-huttle-primary text-white hover:bg-huttle-primary-dark'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            {storagePercent >= 100 ? 'Storage Full' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Selected Items Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-huttle-primary text-white rounded-lg p-3 mb-4 flex items-center justify-between text-sm">
          <span className="font-medium">{selectedItems.length} item(s) selected</span>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                // Future enhancement: Integrate with CreatePostModal to add selected media
                // This will allow users to directly add library items to new posts
                addToast('Media added to post! Open Create Post modal to see them.', 'success');
                setSelectedItems([]);
              }}
              className="px-3 py-1.5 bg-white text-huttle-primary rounded-lg hover:bg-gray-100 transition-all font-medium text-sm"
            >
              Add to Post
            </button>
            <button 
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
                  setContentItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
                  addToast(`${selectedItems.length} item(s) deleted successfully`, 'success');
                  setSelectedItems([]);
                }
              }}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-medium text-sm"
            >
              Delete
            </button>
            <button 
              onClick={() => setSelectedItems([])}
              className="px-3 py-1.5 bg-huttle-primary-dark text-white rounded-lg hover:bg-opacity-80 transition-all font-medium text-sm"
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

      {/* Compact Content Grid/List */}
      {!loading && (
        <>
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-5 lg:grid-cols-8 gap-2' : 'space-y-2'}>
        {filteredItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md cursor-pointer relative ${
              selectedItems.includes(item.id) ? 'border-huttle-primary' : 'border-gray-200'
            }`}
          >
            {viewMode === 'grid' ? (
              <>
                <div className="relative">
                  {item.type === 'text' ? (
                    <div className="h-20 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center rounded-t-lg">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                  ) : (
                    <img 
                      src={getDisplayUrl(item) || '/placeholder-image.png'} 
                      alt={item.name}
                      className="w-full h-20 object-cover rounded-t-lg"
                      onError={(e) => {
                        // If signed URL fails, try to regenerate
                        if (item.storage_path) {
                          getFileUrl(item).then(url => {
                            if (url) e.target.src = url;
                          });
                        }
                      }}
                    />
                  )}
                  <button
                    onClick={(e) => handleSelectItem(item.id, e)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded bg-white shadow-md flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    {selectedItems.includes(item.id) && <Check className="w-2.5 h-2.5 text-huttle-primary" />}
                  </button>
                  <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-black bg-opacity-60 text-white text-[10px] rounded flex items-center gap-0.5">
                    {item.type === 'image' && <Image className="w-2 h-2" />}
                    {item.type === 'video' && <Video className="w-2 h-2" />}
                    {item.type === 'text' && <FileText className="w-2 h-2" />}
                  </div>
                </div>
                <div className="p-1">
                  <h3 className="font-semibold text-[10px] text-gray-900 truncate leading-tight">{item.name}</h3>
                  <p className="text-[9px] text-gray-400">{item.date}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 p-2">
                {item.type === 'text' ? (
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                ) : (
                  <img 
                    src={getDisplayUrl(item) || '/placeholder-image.png'} 
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded flex-shrink-0"
                    onError={(e) => {
                      if (item.storage_path) {
                        getFileUrl(item).then(url => {
                          if (url) e.target.src = url;
                        });
                      }
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.date} • {item.size || 'Text Content'}</p>
                </div>
                <button
                  onClick={(e) => handleSelectItem(item.id, e)}
                  className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center flex-shrink-0 hover:border-huttle-primary transition-colors"
                >
                  {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-huttle-primary" />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

          {filteredItems.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {contentItems.length === 0 ? 'No content yet' : 'No content found'}
              </h3>
          <p className="text-gray-600 mb-6">
                {contentItems.length === 0
                  ? 'Upload your first content to get started with your content library'
                  : 'Try adjusting your filters or upload new content'
                }
          </p>
          <button 
            onClick={() => setShowUploadModal(true)}
            disabled={storagePercent >= 100}
            className={`px-6 py-3 rounded-lg transition-all shadow-md ${
              storagePercent >= 100
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-huttle-primary text-white hover:bg-huttle-primary-dark'
            }`}
          >
            {storagePercent >= 100 ? 'Storage Full' : (contentItems.length === 0 ? 'Upload Your First Asset' : 'Upload New Content')}
          </button>
        </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">Content Details</h2>
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 whitespace-pre-wrap">
                      {selectedItem.content}
                    </div>
                  )}
                </div>
              ) : (
                <img 
                  src={getDisplayUrl(selectedItem) || '/placeholder-image.png'} 
                  alt={selectedItem.name}
                  className="w-full rounded-lg mb-6"
                  onError={(e) => {
                    if (selectedItem.storage_path) {
                      getFileUrl(selectedItem).then(url => {
                        if (url) e.target.src = url;
                      });
                    }
                  }}
                />
              )}

              {/* Details */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Name</label>
                  <p className="text-gray-900">{selectedItem.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Type</label>
                  <p className="text-gray-900 capitalize">{selectedItem.type}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Date Added</label>
                  <p className="text-gray-900">{selectedItem.date}</p>
                </div>
                {selectedItem.size && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">File Size</label>
                    <p className="text-gray-900">{selectedItem.size}</p>
                  </div>
                )}
                {selectedItem.description && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <p className="text-gray-900">{selectedItem.description}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {selectedItem.type === 'text' && (
                    <>
                      {editMode ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors font-medium shadow-md"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => {
                              setEditMode(false);
                              setEditContent(selectedItem.content || '');
                            }}
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditMode(true)}
                            className="flex-1 px-6 py-3 bg-white border-2 border-huttle-primary text-huttle-primary rounded-lg hover:bg-huttle-primary hover:text-white transition-all font-medium flex items-center justify-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={handleDownload}
                            className="flex-1 px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors font-medium shadow-md flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {!selectedItem.type === 'text' && (
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors font-medium shadow-md flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                </div>
                {/* Project and Delete Actions */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Project Actions Row */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddToProjectModal(true);
                    }}
                    className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Folder className="w-4 h-4" />
                      {selectedItem.project ? 'Change Project' : 'Add to Project'}
                  </button>
                    {selectedItem.project && (
                  <button
                        onClick={handleRemoveFromProject}
                        className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                        Remove from Project
                  </button>
                    )}
                  </div>
                  
                  {/* Delete Button Row */}
                  <button
                    onClick={() => confirmDeleteContent(selectedItem)}
                    className="w-full px-6 py-3 bg-red-50 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition-all font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Upload Content</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Content Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'image', label: 'Image', icon: Image },
                    { key: 'video', label: 'Video', icon: Video },
                    { key: 'text', label: 'Text Idea', icon: FileText }
                  ].map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setUploadType(type.key)}
                      className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition-all ${
                        uploadType === type.key
                          ? 'border-huttle-primary bg-huttle-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className="w-6 h-6" />
                      <span className="font-medium text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Assign to Project</label>
                <select
                  value={uploadProject}
                  onChange={(e) => setUploadProject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                >
                  <option value="all">General Content (No Project)</option>
                  {projects.filter(p => p.id !== 'all').map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {uploadType === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
                  <textarea
                    name="content"
                    rows="6"
                    placeholder="Enter captions, titles, descriptions, or any text ideas..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload {uploadType === 'image' ? 'Image' : 'Video'} File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-huttle-primary transition-all">
                    <input
                      type="file"
                      name="file"
                      accept={uploadType === 'image' ? 'image/*' : 'video/*'}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                        {uploading ? 'Uploading...' : 'Click to select or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {uploadType === 'image' ? 'PNG, JPG, GIF up to 10MB' : 'MP4, MOV up to 500MB'}
                    </p>
                      {uploading && (
                        <div className="mt-2">
                          <div className="animate-spin w-6 h-6 border-2 border-huttle-primary border-t-transparent rounded-full mx-auto"></div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Give this content a memorable name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none bg-white"
                  >
                    <option value="all">No Project</option>
                    {projects.filter(p => p.id !== 'all').map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateProjectModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-huttle-primary to-indigo-700 text-white rounded-lg hover:shadow-md transition-all flex items-center gap-2 font-medium"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium shadow-md flex items-center justify-center gap-2 ${
                    uploading
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-huttle-primary text-white hover:bg-huttle-primary-dark'
                  } transition-colors`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="storage"
        featureName="Increased Storage"
      />

      {/* Add to Project Modal */}
      {showAddToProjectModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add to Project</h2>
              <button onClick={() => setShowAddToProjectModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Select a project to add "{selectedItem.name}" to:
              </p>
              <div className="space-y-2">
                {projects.filter(p => p.id !== 'all').map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleAddToProject(project.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedItem.project === project.id
                        ? 'border-huttle-primary bg-huttle-primary/10'
                        : 'border-gray-200 hover:border-huttle-primary hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-huttle-primary" />
                      <span className="font-medium">{project.name}</span>
                    </div>
                    {selectedItem.project === project.id && (
                      <Check className="w-5 h-5 text-huttle-primary" />
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleAddToProject('remove')}
                className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Remove from all projects
              </button>
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
        onClose={() => {
          setShowDeleteConfirmation(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.type === 'project' ? 'Delete Project' : 'Delete Content'}
        message={
          deleteTarget?.type === 'project'
            ? 'Are you sure you want to delete this project?'
            : 'This will permanently delete this content from your library.'
        }
        itemName={deleteTarget?.name}
        type={deleteTarget?.type}
        isDeleting={isDeleting}
      />

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="storage"
        />
      )}
    </div>
  );
}
