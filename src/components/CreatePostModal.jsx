import { useState, useContext, useEffect } from 'react';
import { X, Sparkles, Calendar, Clock, Image, Video, Type, Upload, Loader2, AlertTriangle, ArrowRight, FolderOpen, Search, Check } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { generate12HourTimeOptions } from '../utils/timeFormatter';
import { generateCaptionVariations } from '../services/grokAPI';
import { getContentLibraryItems, getSignedUrl } from '../config/supabase';
import SmartTimeSuggestion from './SmartTimeSuggestion';
import { usePreferredPlatforms } from '../hooks/usePreferredPlatforms';
import { useNavigate } from 'react-router-dom';

// Helper to check if a date/time is in the past
const isPastDateTime = (dateStr, timeStr) => {
  if (!dateStr) return false;
  const scheduledDateTime = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
  const now = new Date();
  return scheduledDateTime < now;
};

export default function CreatePostModal({ isOpen, onClose, preselectedDate = null, postToEdit = null, draftContent = null }) {
  const { schedulePost, updateScheduledPost } = useContent();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const { brandData } = useContext(BrandContext);
  const { platforms, hasPlatformsConfigured } = usePreferredPlatforms();
  const navigate = useNavigate();
  const [postData, setPostData] = useState({
    title: '',
    platforms: [],
    contentType: '',
    scheduledDate: preselectedDate || '',
    scheduledTime: '',
    caption: '',
    hashtags: '',
    keywords: '',
    imagePrompt: '',
    videoPrompt: '',
    media: []
  });

  // Update scheduledDate when preselectedDate changes
  useEffect(() => {
    if (preselectedDate && isOpen) {
      setPostData(prev => ({ ...prev, scheduledDate: preselectedDate }));
    }
  }, [preselectedDate, isOpen]);

  // Populate form when editing a post
  useEffect(() => {
    if (postToEdit && isOpen) {
      // Use originalPost if available (from calendar transformation), otherwise use postToEdit directly
      const sourcePost = postToEdit.originalPost || postToEdit;
      
      // Derive contentType from type if contentType is not available
      let contentType = sourcePost.contentType || '';
      if (!contentType && postToEdit.type) {
        const typeMap = {
          'image': 'Image Post',
          'video': 'Video',
          'text': 'Text Post'
        };
        contentType = typeMap[postToEdit.type] || '';
      }
      
      setPostData({
        title: postToEdit.title || sourcePost.title || '',
        platforms: postToEdit.platforms || sourcePost.platforms || [],
        contentType: contentType,
        scheduledDate: postToEdit.date || sourcePost.scheduledDate || preselectedDate || '',
        scheduledTime: postToEdit.time || sourcePost.scheduledTime || '',
        caption: postToEdit.caption || sourcePost.caption || '',
        hashtags: postToEdit.hashtags || sourcePost.hashtags || '',
        keywords: postToEdit.keywords || sourcePost.keywords || '',
        imagePrompt: postToEdit.imagePrompt || sourcePost.imagePrompt || '',
        videoPrompt: postToEdit.videoPrompt || sourcePost.videoPrompt || '',
        media: postToEdit.media || sourcePost.media || []
      });
    } else if (!postToEdit && isOpen) {
      const normalizedDraftPlatforms = Array.isArray(draftContent?.platforms) ? draftContent.platforms : [];
      const normalizedDraftMedia = Array.isArray(draftContent?.media) ? draftContent.media : [];
      setPostData({
        title: draftContent?.title || '',
        platforms: normalizedDraftPlatforms,
        contentType: '',
        scheduledDate: preselectedDate || '',
        scheduledTime: '',
        caption: draftContent?.caption || '',
        hashtags: '',
        keywords: '',
        imagePrompt: '',
        videoPrompt: '',
        media: normalizedDraftMedia,
      });
    }
  }, [postToEdit, isOpen, preselectedDate, draftContent]);
  const { user } = useContext(AuthContext);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [captionVariations, setCaptionVariations] = useState([]);
  const [showVariations, setShowVariations] = useState(false);
  const [pastDateError, setPastDateError] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  // Check for past date whenever date or time changes
  useEffect(() => {
    if (postData.scheduledDate && postData.scheduledTime) {
      setPastDateError(isPastDateTime(postData.scheduledDate, postData.scheduledTime));
    } else {
      setPastDateError(false);
    }
  }, [postData.scheduledDate, postData.scheduledTime]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen, postToEdit]);

  if (!isOpen) return null;

  const contentTypes = [
    { name: 'Text Post', icon: Type },
    { name: 'Image Post', icon: Image },
    { name: 'Video', icon: Video },
    { name: 'Story', icon: Image },
    { name: 'Reel', icon: Video },
    { name: 'Carousel', icon: Image }
  ];

  const selectedSmartSuggestion = smartSuggestions.find(
    (suggestion) => suggestion.time === postData.scheduledTime && suggestion.date === postData.scheduledDate
  );

  const timeOptions = generate12HourTimeOptions();
  const smartSuggestionsForDate = postData.scheduledDate
    ? smartSuggestions.filter((suggestion) => suggestion.date === postData.scheduledDate)
    : [];

  const handleScheduledDateChange = (dateValue) => {
    setPostData((prev) => ({
      ...prev,
      scheduledDate: dateValue,
      scheduledTime: prev.scheduledDate === dateValue ? prev.scheduledTime : '',
    }));
  };

  const handlePlatformToggle = (platform) => {
    setPostData(prev => ({
      ...prev,
      platforms: [platform] // Only allow one platform selection
    }));
  };

  // Voice to Post handler removed (Issue 8) — kept for future re-enable
  // const handleVoiceContent = (content) => { ... };

  // Generate A/B caption variations
  const handleGenerateVariations = async () => {
    if (!postData.caption || postData.caption.length < 10) {
      showToast('Please write a caption first (at least 10 characters)', 'error');
      return;
    }

    setIsGeneratingVariations(true);
    setCaptionVariations([]);
    setShowVariations(true);

    try {
      const result = await generateCaptionVariations(postData.caption, brandData, 3);
      
      if (result.success && result.variations.length > 0) {
        setCaptionVariations(result.variations);
        showToast('Generated 3 caption variations!', 'success');
      } else {
        showToast('Failed to generate variations', 'error');
        setShowVariations(false);
      }
    } catch (error) {
      console.error('Variation generation error:', error);
      showToast('Failed to generate variations', 'error');
      setShowVariations(false);
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  // Select a variation
  const handleSelectVariation = (variation) => {
    setPostData(prev => ({
      ...prev,
      caption: variation.caption
    }));
    setShowVariations(false);
    setCaptionVariations([]);
    showToast('Caption updated!', 'success');
  };
  
  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map(file => ({
      file,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      url: URL.createObjectURL(file)
    }));
    
    setPostData(prev => ({
      ...prev,
      media: [...prev.media, ...newMedia]
    }));
    
    showToast(`${files.length} file(s) uploaded`, 'success');
  };
  
  const handleRemoveMedia = (index) => {
    setPostData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const handleOpenLibraryPicker = async () => {
    setShowLibraryPicker(true);
    setLibrarySearch('');
    if (libraryItems.length > 0) return;
    setLibraryLoading(true);
    try {
      const result = await getContentLibraryItems(user?.id, { limit: 50 });
      if (result.success) {
        const items = await Promise.all(
          (result.data || [])
            .filter(item => item.type === 'image' || item.type === 'video')
            .map(async (item) => {
              let displayUrl = item.url;
              if (!displayUrl && item.storage_path) {
                const signedResult = await getSignedUrl(item.storage_path);
                if (signedResult.success) displayUrl = signedResult.signedUrl;
              }
              return {
                id: item.id,
                name: item.name,
                type: item.type,
                url: displayUrl || '',
                date: new Date(item.created_at).toLocaleDateString(),
              };
            })
        );
        setLibraryItems(items);
      }
    } catch (err) {
      console.error('Failed to load library items:', err);
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleSelectLibraryItem = (item) => {
    const alreadyAdded = postData.media.some(m => m.libraryItemId === item.id);
    if (alreadyAdded) {
      showToast('This item is already attached', 'info');
      return;
    }
    setPostData(prev => ({
      ...prev,
      media: [...prev.media, {
        name: item.name,
        type: item.type,
        url: item.url,
        libraryItemId: item.id,
      }],
    }));
    setShowLibraryPicker(false);
    showToast('Media added from library', 'success');
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!postData.title.trim()) {
        showToast('Add a post title to continue', 'error');
        return;
      }
      if (postData.platforms.length === 0) {
        showToast('Choose a platform to continue', 'error');
        return;
      }
    }

    if (currentStep === 2 && !postData.caption.trim()) {
      showToast('Add a caption before scheduling', 'warning');
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCreatePost = async () => {
    // Validate required fields
    if (!postData.title) {
      showToast('Please enter a post title', 'error');
      return;
    }
    if (postData.platforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }
    if (!postData.scheduledDate || !postData.scheduledTime) {
      showToast('Please select a date and time', 'error');
      return;
    }
    
    // Validate that the date/time is not in the past
    if (isPastDateTime(postData.scheduledDate, postData.scheduledTime)) {
      showToast('Cannot schedule posts for past dates. Please select a future date and time.', 'error');
      return;
    }

    if (postToEdit && (postToEdit.id || postToEdit.originalPost?.id)) {
      // Update existing post - use originalPost.id if available, otherwise use postToEdit.id
      const postId = postToEdit.originalPost?.id || postToEdit.id;
      await updateScheduledPost(postId, {
        title: postData.title,
        platforms: postData.platforms,
        contentType: postData.contentType,
        scheduledDate: postData.scheduledDate,
        scheduledTime: postData.scheduledTime,
        caption: postData.caption,
        hashtags: postData.hashtags,
        keywords: postData.keywords,
        imagePrompt: postData.imagePrompt,
        videoPrompt: postData.videoPrompt,
        media: postData.media
      });
      showToast('Post updated successfully!', 'success');
    } else {
      // Create new post
      const postId = await schedulePost(postData);
      if (postId) {
        showToast('Post scheduled successfully!', 'success');
        // Fire a notification for the scheduled post confirmation
        const platformList = postData.platforms?.join(', ') || 'your platforms';
        const dateStr = postData.scheduledDate || 'today';
        const timeStr = postData.scheduledTime || '';
        addNotification({
          type: 'success',
          title: 'Post scheduled',
          message: `"${postData.title || 'Untitled'}" scheduled for ${platformList} on ${dateStr}${timeStr ? ' at ' + timeStr : ''}.`,
          actionUrl: '/dashboard/calendar',
          actionLabel: 'View Calendar',
          persistent: true,
        });
      } else {
        // Error toast is already shown by schedulePost
        showToast('Failed to schedule post', 'error');
      }
    }
    
    // Reset form and close modal
    setPostData({
      title: '',
      platforms: [],
      contentType: '',
      scheduledDate: '',
      scheduledTime: '',
      caption: '',
      hashtags: '',
      keywords: '',
      imagePrompt: '',
      videoPrompt: '',
      media: []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[90dvh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-huttle-primary">{postToEdit ? 'Edit Post' : 'Create Custom Post'}</h2>
          <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            {[
              { id: 1, label: 'Goal & Format' },
              { id: 2, label: 'Caption & Media' },
              { id: 3, label: 'Schedule' },
            ].map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => index < currentStep - 1 && setCurrentStep(step.id)}
                  className={`flex items-center gap-2 text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    currentStep >= step.id ? 'bg-huttle-primary text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.id}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < 2 && (
                  <div className={`mx-2 h-0.5 flex-1 ${currentStep > step.id ? 'bg-huttle-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* AI Power Tools Hint */}
          {currentStep === 2 && (
            <div className="rounded-xl border border-huttle-primary/20 bg-huttle-primary/5 p-3 text-center">
              <p className="text-xs text-gray-600">
                Need a stronger draft?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/dashboard/ai-tools');
                  }}
                  className="font-semibold text-huttle-primary hover:text-huttle-primary-dark"
                >
                  Try our AI Power Tools
                </button>
                .
              </p>
            </div>
          )}

          {/* SECTION 1: Basic Info */}
          {currentStep === 1 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center">
                <Type className="w-4 h-4 text-huttle-primary" />
              </div>
              <h3 className="font-semibold text-gray-900">Basic Info</h3>
            </div>
            
            {/* Post Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Post Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={postData.title}
                onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                placeholder="e.g., Morning workout motivation, New protein shake recipe..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none bg-white"
              />
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Platform <span className="text-red-500">*</span></label>
              {!hasPlatformsConfigured || platforms.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">You haven't selected your platforms yet.</p>
                    <p className="text-xs text-amber-600 mt-0.5">Set up your Brand Voice to choose which platforms you create content for.</p>
                  </div>
                  <button
                    onClick={() => { onClose(); navigate('/dashboard/brand-voice'); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Set up Brand Voice <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.name}
                      onClick={() => handlePlatformToggle(platform.name)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                        postData.platforms[0] === platform.name
                          ? 'border-huttle-primary bg-huttle-primary/10'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="w-8 h-8 rounded flex items-center justify-center bg-white border border-gray-100">
                        <platform.icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-sm">{platform.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Content Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {contentTypes.map((type) => (
                  <button
                    key={type.name}
                    onClick={() => setPostData({ ...postData, contentType: type.name })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      postData.contentType === type.name
                        ? 'border-huttle-primary bg-huttle-primary/10'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <type.icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-sm">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Scheduling */}
          {currentStep === 3 && (
          <div className="space-y-3" data-section="scheduling">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-huttle-primary" />
              </div>
              <h3 className="font-semibold text-gray-900">Schedule</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={postData.scheduledDate}
                  onChange={(e) => handleScheduledDateChange(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none ${
                    pastDateError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* Smart Time Suggestions (shown only after date is selected) */}
            {postData.platforms.length > 0 && (
              <SmartTimeSuggestion
                platforms={postData.platforms}
                contentType={postData.contentType}
                currentTime={postData.scheduledTime}
                currentDate={postData.scheduledDate}
                onSelectTime={(time) => {
                  if (time) {
                    setPostData((prev) => ({ ...prev, scheduledTime: time }));
                  }
                }}
                onSuggestionsChange={setSmartSuggestions}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Scheduled Time
                  {selectedSmartSuggestion && !pastDateError && (
                    <span className="ml-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded animate-fadeIn">
                      ✓ Auto-filled from suggestion
                    </span>
                  )}
                </label>
                <select
                  value={postData.scheduledTime}
                  onChange={(e) => setPostData({ ...postData, scheduledTime: e.target.value })}
                  disabled={!postData.scheduledDate}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none ${
                    pastDateError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  } ${!postData.scheduledDate ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                >
                  <option value="">{postData.scheduledDate ? 'Select time...' : 'Select a date first'}</option>
                  {smartSuggestionsForDate.map((suggestion) => {
                    const option = timeOptions.find(t => t.value === suggestion.time);
                    return (
                      <option key={suggestion.id} value={suggestion.time}>
                        {option?.label || suggestion.time} ⭐ {suggestion.label} ({suggestion.dayName})
                      </option>
                    );
                  })}
                  <option disabled>──────────</option>
                  {timeOptions.map((time) => (
                    <option key={time.value} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
                {!postData.scheduledDate && (
                  <p className="mt-1 text-xs text-gray-500">
                    Pick a date to unlock smart suggestions and time selection.
                  </p>
                )}
                {postData.scheduledDate && smartSuggestionsForDate.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No smart recommendations for this date yet. You can still choose any custom time.
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
            
            {/* Past Date Warning */}
            {pastDateError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Cannot schedule posts for past dates. Please select a future date and time.
                </span>
              </div>
            )}
          </div>
          )}

          {/* Media Upload + Library */}
          {currentStep === 2 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Upload className="w-4 h-4 inline mr-2" />
              Add Media (Images/Videos)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-huttle-primary transition-all cursor-pointer bg-gray-50">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                  id="media-upload"
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Upload File</p>
                  <p className="text-xs text-gray-400 mt-1">Images or videos</p>
                </label>
              </div>
              <button
                type="button"
                onClick={handleOpenLibraryPicker}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-huttle-primary transition-all cursor-pointer bg-gray-50"
              >
                <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">From Library</p>
                <p className="text-xs text-gray-400 mt-1">Your saved content</p>
              </button>
            </div>
            {postData.media.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {postData.media.map((item, index) => (
                  <div key={index} className="relative group">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={item.url}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                      {item.type === 'image' ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* SECTION 2: Content & Keywords */}
          {currentStep === 2 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Type className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Content & Keywords</h3>
            </div>
            
            {/* Voice Input removed (Issue 8) — feature-flagged for future re-enable */}
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Caption</label>
                <button
                  type="button"
                  onClick={handleGenerateVariations}
                  disabled={isGeneratingVariations || !postData.caption || postData.caption.length < 10}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  {isGeneratingVariations ? 'Generating...' : 'A/B Variations'}
                </button>
              </div>
              <textarea
                value={postData.caption}
                onChange={(e) => setPostData({ ...postData, caption: e.target.value })}
                placeholder="Write your caption here..."
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none bg-white"
              />
            </div>

            {/* A/B Variations Display */}
            {showVariations && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Caption Variations
                  </h4>
                  <button
                    onClick={() => setShowVariations(false)}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    Close
                  </button>
                </div>
                
                {isGeneratingVariations ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-sm text-purple-700">Generating variations...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {captionVariations.map((variation) => (
                      <div
                        key={variation.id}
                        className="bg-white p-3 rounded-lg border border-purple-200 hover:border-purple-400 transition-colors cursor-pointer group"
                        onClick={() => handleSelectVariation(variation)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            {variation.hookType}
                          </span>
                          <span className="text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to use
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-3">{variation.caption}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
              <input
                type="text"
                value={postData.hashtags}
                onChange={(e) => setPostData({ ...postData, hashtags: e.target.value })}
                placeholder="#hashtag1 #hashtag2 #hashtag3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
              <input
                type="text"
                value={postData.keywords}
                onChange={(e) => setPostData({ ...postData, keywords: e.target.value })}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none bg-white"
              />
            </div>
          </div>
          )}

          {/* Engagement Predictor removed (Issue 9) — feature-flagged for future re-enable */}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          {currentStep > 1 && (
            <button
              onClick={handlePreviousStep}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Back
            </button>
          )}
          {currentStep < 3 ? (
            <button
              onClick={handleNextStep}
              className="px-6 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors font-medium shadow-md"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreatePost}
              className="px-6 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors font-medium shadow-md"
            >
              {postToEdit ? 'Update Post' : 'Schedule Post'}
            </button>
          )}
        </div>
      </div>

      {/* Library Picker Modal */}
      {showLibraryPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Choose from Library</h3>
              <button onClick={() => setShowLibraryPicker(false)} className="p-3 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your library..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-huttle-primary" />
                  <span className="ml-2 text-gray-500 text-sm">Loading library...</span>
                </div>
              ) : libraryItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No media items in your library yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {libraryItems
                    .filter(item => !librarySearch || item.name?.toLowerCase().includes(librarySearch.toLowerCase()))
                    .map((item) => {
                      const isAttached = postData.media.some(m => m.libraryItemId === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => !isAttached && handleSelectLibraryItem(item)}
                          className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                            isAttached
                              ? 'border-huttle-primary ring-2 ring-huttle-primary/20 opacity-60 cursor-default'
                              : 'border-transparent hover:border-huttle-primary hover:shadow-md cursor-pointer'
                          }`}
                        >
                          {item.type === 'image' ? (
                            <img src={item.url} alt={item.name} className="w-full h-24 object-cover" />
                          ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                              <Video className="w-6 h-6 text-purple-500" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                            <p className="text-white text-xs truncate font-medium">{item.name}</p>
                          </div>
                          {isAttached && (
                            <div className="absolute top-1 right-1 bg-huttle-primary text-white rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
