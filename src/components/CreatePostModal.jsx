import { useState, useContext, useEffect } from 'react';
import { X, Sparkles, Calendar, Clock, Image, Video, Type, Upload, Mic, MicOff, Loader2 } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { BrandContext } from '../context/BrandContext';
import { generate12HourTimeOptions } from '../utils/timeFormatter';
import { generateCaption, generateHashtags, generateVisualIdeas, generateCaptionVariations } from '../services/grokAPI';
import EngagementPredictor from './EngagementPredictor';
import VoiceInput from './VoiceInput';
import SmartTimeSuggestion from './SmartTimeSuggestion';
import { usePreferredPlatforms } from '../hooks/usePreferredPlatforms';

export default function CreatePostModal({ isOpen, onClose, preselectedDate = null, postToEdit = null }) {
  const { schedulePost, updateScheduledPost } = useContent();
  const { showToast } = useToast();
  const { brandData } = useContext(BrandContext);
  const { platforms } = usePreferredPlatforms();
  const [useAI, setUseAI] = useState(false);
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
      // Reset form when creating new post
      setPostData({
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
    }
  }, [postToEdit, isOpen, preselectedDate]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingVideoPrompt, setIsGeneratingVideoPrompt] = useState(false);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [captionVariations, setCaptionVariations] = useState([]);
  const [showVariations, setShowVariations] = useState(false);

  if (!isOpen) return null;

  const contentTypes = [
    { name: 'Text Post', icon: Type },
    { name: 'Image Post', icon: Image },
    { name: 'Video', icon: Video },
    { name: 'Story', icon: Image },
    { name: 'Reel', icon: Video },
    { name: 'Carousel', icon: Image }
  ];

  const optimalTimes = [
    { time: '09:00', label: 'Best Time', optimal: true },
    { time: '12:00', label: 'Optimized', optimal: true },
    { time: '18:00', label: 'Best Time', optimal: true },
    { time: '20:00', label: 'Optimized', optimal: true }
  ];
  
  const timeOptions = generate12HourTimeOptions();

  const handlePlatformToggle = (platform) => {
    setPostData(prev => ({
      ...prev,
      platforms: [platform] // Only allow one platform selection
    }));
  };

  const handleAIGenerate = async () => {
    if (!postData.title) {
      showToast('Please enter a post title first', 'error');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate caption with brand context
      const platform = postData.platforms.length > 0 ? postData.platforms[0] : 'social media';
      const captionResult = await generateCaption(
        { topic: postData.title, platform },
        brandData
      );

      // Generate hashtags with brand context
      const hashtagResult = await generateHashtags(postData.title, brandData);

      // Generate visual ideas with brand context
      const visualResult = await generateVisualIdeas(postData.title, brandData);

      // Parse visual ideas for image and video prompts
      let imagePrompt = '';
      let videoPrompt = '';
      
      if (visualResult.success && visualResult.ideas) {
        const ideas = visualResult.ideas;
        // Extract first idea for image, second for video (if available)
        const ideaSections = ideas.split(/\d+\./);
        if (ideaSections.length > 1) {
          imagePrompt = ideaSections[1]?.trim().substring(0, 500) || '';
        }
        if (ideaSections.length > 2) {
          videoPrompt = ideaSections[2]?.trim().substring(0, 500) || '';
        }
      }

      // Update post data with AI-generated content
      setPostData(prev => ({
        ...prev,
        caption: captionResult.success ? captionResult.caption : `Check out this amazing ${prev.title}! 🚀\n\nDiscover how you can elevate your experience. What are your thoughts? Drop a comment below! 👇`,
        hashtags: hashtagResult.success ? hashtagResult.hashtags.split('\n')[0] : '#content #socialmedia #engagement',
        keywords: postData.title.split(' ').slice(0, 5).join(', '),
        imagePrompt: imagePrompt || `Create a vibrant, eye-catching image featuring ${prev.title}. Modern design, professional quality.`,
        videoPrompt: videoPrompt || `Short-form video showcasing ${prev.title}. 15-30 seconds, dynamic transitions, upbeat music.`
      }));

      showToast('AI content generated with your brand voice!', 'success');
    } catch (error) {
      console.error('AI generation error:', error);
      showToast('Failed to generate AI content. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestImagePrompt = async () => {
    if (!postData.title) {
      showToast('Please enter a post title first', 'error');
      return;
    }
    
    setIsGeneratingImagePrompt(true);
    
    try {
      const result = await generateVisualIdeas(
        `Image concept for: ${postData.title}. ${postData.caption ? `Context: ${postData.caption.substring(0, 200)}` : ''}`,
        brandData
      );

      if (result.success && result.ideas) {
        // Extract the first idea
        const ideas = result.ideas.split(/\d+\./);
        const firstIdea = ideas[1]?.trim().substring(0, 500) || result.ideas.substring(0, 500);
        
        setPostData(prev => ({
          ...prev,
          imagePrompt: firstIdea
        }));
        showToast('Image concept generated with your brand style!', 'success');
      } else {
        // Fallback
        setPostData(prev => ({
          ...prev,
          imagePrompt: `Create a vibrant, eye-catching image featuring ${prev.title || 'your content'}. Modern design, professional quality, engaging composition that aligns with your brand identity.`
        }));
        showToast('Image concept generated!', 'success');
      }
    } catch (error) {
      console.error('Image prompt generation error:', error);
      showToast('Failed to generate image concept', 'error');
    } finally {
      setIsGeneratingImagePrompt(false);
    }
  };

  const handleSuggestVideoPrompt = async () => {
    if (!postData.title) {
      showToast('Please enter a post title first', 'error');
      return;
    }
    
    setIsGeneratingVideoPrompt(true);
    
    try {
      const result = await generateVisualIdeas(
        `Video concept for: ${postData.title}. Target platforms: ${postData.platforms.length > 0 ? postData.platforms.join(', ') : 'social media'}. ${postData.caption ? `Context: ${postData.caption.substring(0, 200)}` : ''}`,
        brandData
      );

      if (result.success && result.ideas) {
        // Extract the second idea (or first if only one)
        const ideas = result.ideas.split(/\d+\./);
        const videoIdea = ideas[2]?.trim().substring(0, 500) || ideas[1]?.trim().substring(0, 500) || result.ideas.substring(0, 500);
        
        setPostData(prev => ({
          ...prev,
          videoPrompt: videoIdea
        }));
        showToast('Video concept generated with your brand style!', 'success');
      } else {
        // Fallback
        setPostData(prev => ({
          ...prev,
          videoPrompt: `Short-form video showcasing ${prev.title || 'your content'}. 15-30 seconds duration, dynamic transitions, upbeat music. Perfect for ${prev.platforms && prev.platforms.length > 0 ? prev.platforms.join(', ') : 'social media'} platforms.`
        }));
        showToast('Video concept generated!', 'success');
      }
    } catch (error) {
      console.error('Video prompt generation error:', error);
      showToast('Failed to generate video concept', 'error');
    } finally {
      setIsGeneratingVideoPrompt(false);
    }
  };

  // Handle voice input content
  const handleVoiceContent = (content) => {
    setPostData(prev => ({
      ...prev,
      caption: content.caption || prev.caption,
      hashtags: content.hashtags || prev.hashtags
    }));
  };

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
    setUseAI(false);
    setIsGenerating(false);
    setIsGeneratingImagePrompt(false);
    setIsGeneratingVideoPrompt(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{postToEdit ? 'Edit Post' : 'Create Custom Post'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Assist Toggle */}
          <div className="bg-gradient-to-r from-huttle-primary/10 to-huttle-primary-light/10 rounded-xl border border-huttle-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-huttle-primary" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    <span className="mr-1">AI</span>
                    <span>Assist</span>
                  </h3>
                  <p className="text-sm text-gray-600">Auto-fill with your brand voice</p>
                </div>
              </div>
              <button
                onClick={() => setUseAI(!useAI)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  useAI ? 'bg-huttle-primary text-white' : 'bg-white border border-gray-300 text-gray-700'
                }`}
              >
                {useAI ? 'AI Enabled' : 'Enable AI'}
              </button>
            </div>
            {useAI && (
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Generating with Brand Voice...' : 'Generate with AI'}
              </button>
            )}
          </div>

          {/* Post Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Post Title</label>
            <input
              type="text"
              value={postData.title}
              onChange={(e) => setPostData({ ...postData, title: e.target.value })}
              placeholder="Enter post title..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
            />
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Platform</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handlePlatformToggle(platform.name)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                    postData.platforms[0] === platform.name
                      ? 'border-huttle-primary bg-huttle-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${platform.color} text-white`}>
                    <platform.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-sm">{platform.name}</span>
                </button>
              ))}
            </div>
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
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <type.icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-sm">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Time Suggestions */}
          {postData.platforms.length > 0 && (
            <SmartTimeSuggestion
              platforms={postData.platforms}
              contentType={postData.contentType}
              currentTime={postData.scheduledTime}
              currentDate={postData.scheduledDate}
              onSelectTime={(time) => setPostData(prev => ({ ...prev, scheduledTime: time }))}
              onSelectDate={(date) => setPostData(prev => ({ ...prev, scheduledDate: date }))}
            />
          )}

          {/* Scheduling */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Scheduled Date
              </label>
              <input
                type="date"
                value={postData.scheduledDate}
                onChange={(e) => setPostData({ ...postData, scheduledDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Scheduled Time
                {postData.scheduledTime && postData.scheduledTime.trim() !== '' && (
                  <span className="ml-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded animate-fadeIn">
                    ✓ Auto-filled from suggestion
                  </span>
                )}
              </label>
              <select
                value={postData.scheduledTime}
                onChange={(e) => setPostData({ ...postData, scheduledTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              >
                <option value="">Select time...</option>
                {optimalTimes.map((time) => {
                  const option = timeOptions.find(t => t.value === time.time);
                  return (
                    <option key={time.time} value={time.time}>
                      {option?.label} {time.optimal && `⭐ ${time.label}`}
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
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Upload className="w-4 h-4 inline mr-2" />
              Upload Media (Images/Videos)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-huttle-primary transition-all cursor-pointer bg-gray-50">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                id="media-upload"
              />
              <label htmlFor="media-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-1">
                  Drag and drop or <span className="text-huttle-primary font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-500">
                  Upload images or videos for your post
                </p>
              </label>
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
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                      {item.type === 'image' ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content & Keywords */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Content & Keywords</h3>
            
            {/* Voice Input */}
            <VoiceInput
              onPolishedContent={handleVoiceContent}
              platform={postData.platforms.length > 0 ? postData.platforms[0] : 'social media'}
              autoPolish={true}
            />
            
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
                placeholder="Write your caption or use voice input above..."
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
              <input
                type="text"
                value={postData.keywords}
                onChange={(e) => setPostData({ ...postData, keywords: e.target.value })}
                placeholder="keyword1, keyword2, keyword3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Engagement Predictor */}
          {(postData.caption || postData.title) && (
            <EngagementPredictor
              caption={postData.caption}
              hashtags={postData.hashtags}
              title={postData.title}
              platforms={postData.platforms}
              autoAnalyze={false}
            />
          )}

          {/* Media Concepts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Media Concepts</h3>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <Image className="w-4 h-4 inline mr-2" />
                  Image Prompt/Suggestions
                </label>
                <button
                  type="button"
                  onClick={handleSuggestImagePrompt}
                  disabled={isGeneratingImagePrompt || !postData.title}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  {isGeneratingImagePrompt ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                value={postData.imagePrompt}
                onChange={(e) => setPostData({ ...postData, imagePrompt: e.target.value })}
                placeholder="Describe the image concept or let AI suggest..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <Video className="w-4 h-4 inline mr-2" />
                  Video Prompt/Suggestions
                </label>
                <button
                  type="button"
                  onClick={handleSuggestVideoPrompt}
                  disabled={isGeneratingVideoPrompt || !postData.title}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  {isGeneratingVideoPrompt ? 'Generating...' : 'AI Suggest'}
                </button>
              </div>
              <textarea
                value={postData.videoPrompt}
                onChange={(e) => setPostData({ ...postData, videoPrompt: e.target.value })}
                placeholder="Describe the video concept or let AI suggest..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreatePost}
            disabled={isGenerating}
            className="px-6 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {postToEdit ? 'Update Post' : 'Schedule Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
