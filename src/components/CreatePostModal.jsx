import { useState } from 'react';
import { X, Sparkles, Calendar, Clock, Image, Video, Type, Upload } from 'lucide-react';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, LinkedInIcon, YouTubeIcon } from './SocialIcons';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { generate12HourTimeOptions } from '../utils/timeFormatter';

export default function CreatePostModal({ isOpen, onClose }) {
  const { schedulePost } = useContent();
  const { showToast } = useToast();
  const [useAI, setUseAI] = useState(false);
  const [postData, setPostData] = useState({
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false);
  const [isGeneratingVideoPrompt, setIsGeneratingVideoPrompt] = useState(false);

  if (!isOpen) return null;

  const platforms = [
    { name: 'Instagram', icon: InstagramIcon, color: 'bg-pink-500' },
    { name: 'Facebook', icon: FacebookIcon, color: 'bg-blue-600' },
    { name: 'TikTok', icon: TikTokIcon, color: 'bg-black' },
    { name: 'YouTube', icon: YouTubeIcon, color: 'bg-red-600' },
    { name: 'X', icon: TwitterXIcon, color: 'bg-black' },
    { name: 'LinkedIn', icon: LinkedInIcon, color: 'bg-blue-700' }
  ];

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
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleAIGenerate = async () => {
    if (!postData.title) {
      showToast('Please enter a post title first', 'error');
      return;
    }
    
    setIsGenerating(true);
    
    // Note: Currently using simulated AI generation for demo purposes
    // In production, this should call grokAPI.generateCaption() with proper context
    setTimeout(() => {
      setPostData(prev => ({
        ...prev,
        caption: `Check out this amazing ${prev.title}! 🚀\n\nDiscover how you can elevate your experience with our latest updates. Tap the link in bio to learn more!\n\nWhat are your thoughts? Drop a comment below! 👇`,
        hashtags: '#innovation #trending #socialmedia #contentcreator #digitalmarketing',
        keywords: 'trending, viral, engagement, community',
        imagePrompt: `Create a vibrant, eye-catching image featuring ${prev.title}. Modern design, professional quality.`,
        videoPrompt: `Short-form video showcasing ${prev.title}. 15-30 seconds, dynamic transitions, upbeat music.`
      }));
      setIsGenerating(false);
      showToast('AI content generated successfully!', 'success');
    }, 1500);
  };

  const handleSuggestImagePrompt = async () => {
    if (!postData.title) {
      showToast('Please enter a post title first', 'error');
      return;
    }
    
    setIsGeneratingImagePrompt(true);
    
    // Note: Currently using simulated AI generation for demo purposes
    // In production, this should call grokAPI.generateImagePrompt() with proper context
    setTimeout(() => {
      setPostData(prev => ({
        ...prev,
        imagePrompt: `Create a vibrant, eye-catching image featuring ${prev.title || 'your content'}. Modern design, professional quality, engaging composition. Consider using bold colors, dynamic layouts, and clear focal points that align with ${prev.caption ? 'the caption theme' : 'your brand identity'}.`
      }));
      setIsGeneratingImagePrompt(false);
      showToast('Image concept generated successfully!', 'success');
    }, 1200);
  };

  const handleSuggestVideoPrompt = async () => {
    if (!postData.title) {
      showToast('Please enter a post title first', 'error');
      return;
    }
    
    setIsGeneratingVideoPrompt(true);
    
    // Note: Currently using simulated AI generation for demo purposes
    // In production, this should call grokAPI.generateVideoPrompt() with proper context
    setTimeout(() => {
      setPostData(prev => ({
        ...prev,
        videoPrompt: `Short-form video showcasing ${prev.title || 'your content'}. 15-30 seconds duration, dynamic transitions, upbeat music. Focus on visual storytelling that captures attention quickly, includes engaging motion graphics, and delivers key message within first 3 seconds. Perfect for ${prev.platforms && prev.platforms.length > 0 ? prev.platforms.join(', ') : 'social media'} platforms.`
      }));
      setIsGeneratingVideoPrompt(false);
      showToast('Video concept generated successfully!', 'success');
    }, 1200);
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

    // Schedule the post and wait for result
    const postId = await schedulePost(postData);
    if (postId) {
      showToast('Post scheduled successfully!', 'success');
    } else {
      // Error toast is already shown by schedulePost
      showToast('Failed to schedule post', 'error');
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
          <h2 className="text-2xl font-bold text-gray-900">Create Custom Post</h2>
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
                  <h3 className="font-semibold text-gray-900">AI Assist</h3>
                  <p className="text-sm text-gray-600">Auto-fill everything with AI</p>
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
                {isGenerating ? 'Generating...' : 'Generate with AI'}
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
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Platforms</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handlePlatformToggle(platform.name)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                    postData.platforms.includes(platform.name)
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
              <textarea
                value={postData.caption}
                onChange={(e) => setPostData({ ...postData, caption: e.target.value })}
                placeholder="Write your caption..."
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none resize-none"
              />
            </div>

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
            Schedule Post
          </button>
        </div>
      </div>
    </div>
  );
}

