import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Image, 
  Video, 
  ArrowLeft, 
  Download, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Upload,
  Sparkles,
  Eye,
  Zap,
  Target
} from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { useSubscription } from '../context/SubscriptionContext';
import { usePostReminders } from '../hooks/usePostReminders';
import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { updatePostStatus } from '../config/supabase';
import { AuthContext } from '../context/AuthContext';
import PostValidationAlert from '../components/PostValidationAlert';
import CreatePostModal from '../components/CreatePostModal';
import PublishModal from '../components/PublishModal';
import CalendarTemplates, { CalendarTemplateButton } from '../components/CalendarTemplates';
import UpgradeModal from '../components/UpgradeModal';
import { downloadPostAsText, downloadPostAsJSON, copyPostToClipboard, downloadForPlatform } from '../utils/downloadHelpers';
import { formatTo12Hour } from '../utils/timeFormatter';
import { useContext } from 'react';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon, getPlatformColor } from '../components/SocialIcons';

// Platform icon mapping
const getPlatformIconComponent = (platform) => {
  const p = platform?.toLowerCase();
  if (p?.includes('instagram')) return InstagramIcon;
  if (p?.includes('facebook')) return FacebookIcon;
  if (p?.includes('tiktok')) return TikTokIcon;
  if (p?.includes('twitter') || p?.includes('x')) return TwitterXIcon;
  if (p?.includes('youtube')) return YouTubeIcon;
  return null;
};

export default function SmartCalendar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [postToPublish, setPostToPublish] = useState(null);
  const [draggedPost, setDraggedPost] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [quickAddDate, setQuickAddDate] = useState(null);
  const [hoveredPost, setHoveredPost] = useState(null);
  const [showPostActions, setShowPostActions] = useState(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const calendarRef = useRef(null);

  // Check if navigating from Dashboard with a specific date
  useEffect(() => {
    if (location.state?.date) {
      const [year, month, day] = location.state.date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      if (!isNaN(targetDate.getTime())) {
        setCurrentDate(targetDate);
        if (location.state.view === 'day') {
          setView('day');
        }
      }
    }
  }, [location.state]);

  const { user } = useContext(AuthContext);
  const { scheduledPosts, deleteScheduledPost, updateScheduledPost, loading, syncing } = useContent();
  const { addToast } = useToast();
  const { addInfo } = useNotifications();
  const { userTier, TIERS } = useSubscription();
  const isOnline = useOfflineDetection();

  // Enable post reminders
  usePostReminders();

  // Transform scheduledPosts to match calendar format
  const allPosts = useMemo(() => {
    return scheduledPosts.map(post => {
      const dateStr = post.scheduledDate || '';
      const timeStr = post.scheduledTime || '09:00';
      
      let type = 'text';
      if (post.contentType) {
        const contentType = post.contentType.toLowerCase();
        if (contentType.includes('image') || contentType.includes('story') || contentType.includes('carousel')) {
          type = 'image';
        } else if (contentType.includes('video') || contentType.includes('reel')) {
          type = 'video';
        }
      }

      return {
        id: post.id,
        date: dateStr,
        time: timeStr,
        title: post.title || 'Untitled Post',
        platforms: post.platforms || [],
        type: type,
        caption: post.caption || '',
        hashtags: post.hashtags || '',
        keywords: post.keywords || '',
        imagePrompt: post.imagePrompt || '',
        videoPrompt: post.videoPrompt || '',
        optimal: false,
        editable: true,
        createdAt: post.createdAt,
        status: post.status,
        originalPost: post
      };
    });
  }, [scheduledPosts]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year: y, month: m };
  };

  const getWeekDays = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const navigate_calendar = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(month + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (view === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const getPostsForDate = (date) => {
    const dateStr = typeof date === 'string' ? date : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return allPosts.filter(post => post.date === dateStr);
  };

  const handleDayClick = (day, e) => {
    if (e?.target?.closest('.post-item')) return;
    
    if (view === 'month') {
      const clickedDate = new Date(year, month, day);
      setCurrentDate(clickedDate);
      setSelectedDay(day);
      setView('day');
    }
  };

  const handleWeekDayClick = (date) => {
    setCurrentDate(date);
    setView('day');
  };

  const getTitleText = () => {
    if (view === 'day') {
      return `${dayNames[currentDate.getDay()]}, ${monthNames[month]} ${currentDate.getDate()}, ${year}`;
    } else if (view === 'week') {
      const weekDays = getWeekDays();
      const start = weekDays[0];
      const end = weekDays[6];
      return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${year}`;
    }
    return `${monthNames[month]} ${year}`;
  };

  // Drag and Drop Handlers
  const handleDragStart = useCallback((e, post) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      postId: post.id,
      originalDate: post.date,
      originalTime: post.time
    }));
    
    setTimeout(() => {
      e.target.classList.add('opacity-50', 'scale-95');
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e) => {
    setDraggedPost(null);
    setDragOverDate(null);
    e.target.classList.remove('opacity-50', 'scale-95');
  }, []);

  const handleDragOver = useCallback((e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverDate(null);
    }
  }, []);

  const handleDrop = useCallback(async (e, targetDateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    
    if (!draggedPost) return;
    
    try {
      const postToUpdate = allPosts.find(p => p.id === draggedPost.id);
      
      if (postToUpdate && (postToUpdate.createdAt || postToUpdate.status)) {
        await updateScheduledPost(draggedPost.id, {
          scheduledDate: targetDateStr,
          scheduledTime: draggedPost.time
        });
        addToast('Post rescheduled successfully!', 'success');
      } else {
        addToast('This post cannot be moved', 'info');
      }
    } catch (error) {
      console.error('Error moving post:', error);
      addToast('Failed to reschedule post', 'error');
    }
    
    setDraggedPost(null);
  }, [draggedPost, allPosts, updateScheduledPost, addToast]);

  // Quick Add Handler
  const handleQuickAdd = (dateStr) => {
    setQuickAddDate(dateStr);
    setIsCreatePostOpen(true);
  };

  const handleDownload = (post, format = 'text') => {
    if (format === 'json') {
      downloadPostAsJSON(post);
    } else {
      downloadPostAsText(post);
    }
    addToast('Post downloaded successfully!', 'success');
  };

  const handleCopy = async (post) => {
    const result = await copyPostToClipboard(post);
    addToast(result.message, result.success ? 'success' : 'error');
  };

  const handlePlatformDownload = (post, platform) => {
    downloadForPlatform(post, platform);
    addToast(`Downloaded for ${platform}!`, 'success');
  };

  const handlePostClick = (post, e) => {
    e?.stopPropagation();
    if (post.date) {
      const [year, month, day] = post.date.split('-').map(Number);
      const postDate = new Date(year, month - 1, day);
      if (!isNaN(postDate.getTime())) {
        setCurrentDate(postDate);
        setView('day');
      }
    }
  };

  const handleEditPost = (post) => {
    addToast('Edit functionality coming soon!', 'info');
  };

  const handleDeletePost = (post) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      if (post.id && (post.createdAt || post.status)) {
        deleteScheduledPost(post.id);
      }
      addToast('Post deleted successfully!', 'success');
      setSelectedPost(null);
    }
  };

  const handleMarkAsPosted = async (postId) => {
    if (!user?.id) {
      addToast('Please log in to update post status', 'error');
      return;
    }

    try {
      const result = await updatePostStatus(postId, 'posted', user.id);
      
      if (result.success) {
        await updateScheduledPost(postId, { status: 'posted' });
        addToast('Post marked as posted!', 'success');
      } else {
        addToast('Failed to update post status', 'error');
      }
    } catch (error) {
      console.error('Error marking post as posted:', error);
      addToast('Error updating post status', 'error');
    }
  };

  const handleOpenPublishModal = (post) => {
    setPostToPublish(post);
    setIsPublishModalOpen(true);
  };

  // Get stats for the current view
  const getStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    
    const thisMonthPosts = allPosts.filter(post => {
      if (!post.date) return false;
      const postDate = new Date(post.date);
      return postDate.getMonth() === month && postDate.getFullYear() === year;
    });
    
    const thisWeekPosts = allPosts.filter(post => {
      if (!post.date) return false;
      const postDate = new Date(post.date);
      return postDate >= thisWeekStart && postDate <= thisWeekEnd;
    });
    
    const upcomingPosts = allPosts.filter(post => {
      if (!post.date) return false;
      const postDate = new Date(post.date);
      return postDate >= today;
    });
    
    return {
      thisMonth: thisMonthPosts.length,
      thisWeek: thisWeekPosts.length,
      upcoming: upcomingPosts.length,
      total: allPosts.length
    };
  }, [allPosts, month, year]);

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700 border-gray-200',
      scheduled: 'bg-huttle-cyan-light text-huttle-blue border-huttle-cyan/20',
      ready: 'bg-green-50 text-green-700 border-green-200',
      posting: 'bg-amber-50 text-amber-700 border-amber-200',
      posted: 'bg-gray-100 text-gray-500 border-gray-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
    };

    const labels = {
      draft: 'Draft',
      scheduled: 'Scheduled',
      ready: 'Ready',
      posting: 'Posting...',
      posted: 'Posted',
      failed: 'Failed',
      cancelled: 'Cancelled',
    };

    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.scheduled}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Post Card Component for Calendar
  const PostCard = ({ post, compact = false }) => {
    const isBeingDragged = draggedPost?.id === post.id;
    
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, post)}
        onDragEnd={handleDragEnd}
        onClick={(e) => handlePostClick(post, e)}
        onMouseEnter={() => setHoveredPost(post.id)}
        onMouseLeave={() => setHoveredPost(null)}
        className={`post-item group relative cursor-grab active:cursor-grabbing transition-all duration-200 ${
          isBeingDragged ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'
        } ${compact ? 'p-1.5' : 'p-2'}`}
      >
        <div className={`
          relative overflow-hidden rounded-lg border transition-all duration-200
          ${post.status === 'posted' 
            ? 'bg-gray-50 border-gray-200' 
            : 'bg-white border-gray-200 hover:border-huttle-primary hover:shadow-soft'
          }
        `}>
          {/* Drag Handle Indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-huttle-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-l" />
          
          <div className={`${compact ? 'p-2' : 'p-3'}`}>
            {/* Time & Type */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-huttle-primary`} />
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-700`}>
                  {formatTo12Hour(post.time)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {post.type === 'image' && <Image className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-pink-500`} />}
                {post.type === 'video' && <Video className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-purple-500`} />}
                {post.optimal && <Sparkles className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-500`} />}
              </div>
            </div>
            
            {/* Title */}
            <h4 className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-800 truncate mb-1.5`}>
              {post.title}
            </h4>
            
            {/* Platforms */}
            {post.platforms && post.platforms.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {post.platforms.slice(0, compact ? 2 : 3).map((platform, idx) => {
                  const IconComponent = getPlatformIconComponent(platform);
                  const colors = getPlatformColor(platform);
                  return IconComponent ? (
                    <div 
                      key={idx} 
                      className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded flex items-center justify-center ${colors.bg} text-white`}
                    >
                      <IconComponent className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                    </div>
                  ) : null;
                })}
                {post.platforms.length > (compact ? 2 : 3) && (
                  <span className="text-[10px] text-gray-500 font-medium">
                    +{post.platforms.length - (compact ? 2 : 3)}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Quick Actions on Hover */}
          {!compact && hoveredPost === post.id && (
            <div className="absolute top-1 right-1 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md p-1 shadow-sm border border-gray-100 animate-fadeIn">
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenPublishModal(post); }}
                className="p-1 hover:bg-huttle-cyan-light rounded transition-colors"
                title="Publish"
              >
                <Upload className="w-3.5 h-3.5 text-huttle-primary" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(post); }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Copy"
              >
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePost(post); }}
                className="p-1 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calendar Day Cell Component
  const DayCell = ({ day, isToday, posts, dateStr }) => {
    const isDragOver = dragOverDate === dateStr;
    const hasMultiplePosts = posts.length > 2;
    
    return (
      <div
        onClick={(e) => handleDayClick(day, e)}
        onDragOver={(e) => handleDragOver(e, dateStr)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, dateStr)}
        className={`
          relative min-h-[100px] md:min-h-[120px] border-r border-b border-gray-100 
          transition-all duration-200 cursor-pointer group
          ${isToday ? 'bg-huttle-cyan-light/30' : 'bg-white hover:bg-gray-50/50'}
          ${isDragOver ? 'bg-huttle-cyan-light ring-2 ring-huttle-primary ring-inset' : ''}
        `}
      >
        {/* Day Number */}
        <div className="flex items-center justify-between p-2">
          <span className={`
            inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-all
            ${isToday 
              ? 'bg-huttle-primary text-white' 
              : 'text-gray-700 group-hover:bg-gray-100'
            }
          `}>
            {day}
          </span>
          
          {/* Quick Add Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleQuickAdd(dateStr); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-huttle-primary text-white hover:bg-huttle-primary-dark hover:scale-110 transition-all duration-200"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        
        {/* Posts */}
        <div className="px-1 pb-1 space-y-1">
          {posts.slice(0, 2).map(post => (
            <PostCard key={post.id} post={post} compact />
          ))}
          {hasMultiplePosts && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDayClick(day, e); }}
              className="w-full text-center text-[10px] font-semibold text-huttle-primary hover:text-huttle-primary-dark py-1 bg-huttle-cyan-light rounded-md hover:bg-huttle-cyan-light/80 transition-colors"
            >
              +{posts.length - 2} more
            </button>
          )}
        </div>
        
        {/* Drop Indicator */}
        {isDragOver && (
          <div className="absolute inset-2 border-2 border-dashed border-huttle-primary rounded-lg flex items-center justify-center bg-huttle-cyan-light/50 pointer-events-none">
            <span className="text-xs font-semibold text-huttle-primary">Drop here</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {/* Header - Matching Dashboard/AITools pattern */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-huttle-gradient flex items-center justify-center shadow-lg shadow-huttle-blue/20">
              <CalendarIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                Smart Calendar
              </h1>
              <p className="text-sm md:text-base text-gray-500">
                Drag and drop to reschedule • Click any day to add posts
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-soft">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs md:text-sm font-medium text-gray-600">
                <span className="text-gray-900 font-bold">{getStats.upcoming}</span> upcoming
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-soft">
              <Target className="w-4 h-4 text-huttle-primary" />
              <span className="text-sm font-medium text-gray-600">
                <span className="text-gray-900 font-bold">{getStats.thisWeek}</span> this week
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsCreatePostOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
          <CalendarTemplateButton 
            onClick={() => {
              if (userTier === TIERS.FREE) {
                setShowUpgradeModal(true);
                addToast('Content Calendar Templates are available for Essentials and Pro plans', 'warning');
              } else {
                setIsTemplatesOpen(true);
              }
            }} 
          />
          <button className="btn-secondary hidden sm:flex">
            <Sparkles className="w-4 h-4" />
            <span>Optimize Times</span>
          </button>
        </div>
        
        {syncing && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Syncing...</span>
          </div>
        )}
      </div>

      {/* Calendar Container */}
      <div ref={calendarRef} className="card overflow-hidden mb-6">
        {/* Calendar Header */}
        <div className="bg-white border-b border-gray-100 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {view === 'day' && (
                <button
                  onClick={() => setView('month')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">{getTitleText()}</h2>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {['month', 'week', 'day'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all duration-200 ${
                      view === v 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate_calendar(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    setCurrentDate(new Date());
                    if (view === 'day') setView('month');
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-huttle-primary hover:bg-huttle-cyan-light rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigate_calendar(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-8">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-24 md:h-28 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Month View */}
            {view === 'month' && (
              <>
                {/* Day Names Header */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                  {dayNames.map((day, i) => (
                    <div key={day} className="p-2 md:p-3 text-center">
                      <span className="hidden md:inline text-sm font-semibold text-gray-600">{day}</span>
                      <span className="md:hidden text-xs font-semibold text-gray-600">{dayNamesShort[i]}</span>
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[100px] md:min-h-[120px] bg-gray-50/50 border-r border-b border-gray-100" />
                  ))}
                  
                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const posts = getPostsForDate(dateStr);
                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                    
                    return (
                      <DayCell
                        key={day}
                        day={day}
                        isToday={isToday}
                        posts={posts}
                        dateStr={dateStr}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* Week View */}
            {view === 'week' && (
              <>
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                  {getWeekDays().map((date, i) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={i}
                        className={`p-2 md:p-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-huttle-cyan-light/30' : ''}`}
                      >
                        <div className="text-xs font-semibold text-gray-500">{dayNames[date.getDay()]}</div>
                        <div className={`text-lg font-bold mt-1 ${isToday ? 'text-huttle-primary' : 'text-gray-900'}`}>
                          {date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-7 min-h-[400px] md:min-h-[500px]">
                  {getWeekDays().map((date, i) => {
                    const posts = getPostsForDate(date);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const isDragOver = dragOverDate === dateStr;
                    
                    return (
                      <div
                        key={i}
                        onClick={() => handleWeekDayClick(date)}
                        onDragOver={(e) => handleDragOver(e, dateStr)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dateStr)}
                        className={`
                          p-2 border-r border-gray-100 last:border-r-0 cursor-pointer transition-all duration-200
                          hover:bg-gray-50 overflow-y-auto
                          ${isDragOver ? 'bg-huttle-cyan-light ring-2 ring-huttle-primary ring-inset' : ''}
                        `}
                      >
                        <div className="space-y-2">
                          {posts.map(post => (
                            <PostCard key={post.id} post={post} />
                          ))}
                          {posts.length === 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleQuickAdd(dateStr); }}
                              className="w-full py-6 md:py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-huttle-primary hover:text-huttle-primary hover:bg-huttle-cyan-light/30 transition-all duration-200 flex flex-col items-center gap-2"
                            >
                              <Plus className="w-5 h-5" />
                              <span className="text-xs font-medium">Add Post</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Day View */}
            {view === 'day' && (
              <div className="p-4 md:p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                  {getPostsForDate(currentDate).length > 0 ? (
                    <div className="space-y-4">
                      {getPostsForDate(currentDate).map(post => (
                        <div
                          key={post.id}
                          className="card p-0 overflow-hidden hover:shadow-medium transition-all duration-300"
                        >
                          {/* Post Header */}
                          <div className="bg-gray-50 p-4 md:p-5 border-b border-gray-100">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${
                                  post.type === 'video' ? 'bg-purple-100' :
                                  post.type === 'image' ? 'bg-pink-100' :
                                  'bg-huttle-cyan-light'
                                }`}>
                                  {post.type === 'image' && <Image className="w-6 h-6 text-pink-500" />}
                                  {post.type === 'video' && <Video className="w-6 h-6 text-purple-500" />}
                                  {post.type === 'text' && <CalendarIcon className="w-6 h-6 text-huttle-primary" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-4 h-4 text-huttle-primary" />
                                    <span className="text-base md:text-lg font-bold text-gray-900">{formatTo12Hour(post.time)}</span>
                                    {post.optimal && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                                        <Sparkles className="w-3 h-3" /> Optimal
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {post.platforms?.map((platform, idx) => {
                                      const IconComponent = getPlatformIconComponent(platform);
                                      const colors = getPlatformColor(platform);
                                      return IconComponent ? (
                                        <div key={idx} className={`w-6 h-6 rounded flex items-center justify-center ${colors.bg} text-white`}>
                                          <IconComponent className="w-3.5 h-3.5" />
                                        </div>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {post.status && <StatusBadge status={post.status} />}
                              </div>
                            </div>
                          </div>
                          
                          {/* Post Content */}
                          <div className="p-4 md:p-5">
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3">{post.title}</h3>
                            {post.caption && (
                              <p className="text-gray-600 mb-3 leading-relaxed text-sm md:text-base">{post.caption}</p>
                            )}
                            {post.hashtags && (
                              <p className="text-sm text-huttle-primary font-medium mb-4">{post.hashtags}</p>
                            )}
                            
                            <PostValidationAlert post={post} />
                          </div>
                          
                          {/* Post Actions */}
                          <div className="bg-gray-50 px-4 md:px-5 py-3 md:py-4 border-t border-gray-100">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleOpenPublishModal(post)}
                                className="btn-primary text-sm"
                              >
                                <Upload className="w-4 h-4" />
                                Publish
                              </button>
                              
                              {post.status && post.status !== 'posted' && post.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleMarkAsPosted(post.id)}
                                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="hidden sm:inline">Mark Posted</span>
                                </button>
                              )}
                              
                              <button 
                                onClick={() => handleCopy(post)}
                                className="btn-secondary text-sm"
                              >
                                <Copy className="w-4 h-4" />
                                <span className="hidden sm:inline">Copy</span>
                              </button>
                              
                              <button 
                                onClick={() => handleDownload(post, 'text')}
                                className="btn-secondary text-sm"
                              >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">Download</span>
                              </button>
                              
                              <button 
                                onClick={() => handleDeletePost(post)}
                                className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg font-medium text-sm text-red-600 hover:bg-red-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 md:py-16">
                      <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <CalendarIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">No posts scheduled</h3>
                      <p className="text-gray-500 mb-6 text-sm md:text-base">
                        You don't have any posts scheduled for this day
                      </p>
                      <button 
                        onClick={() => handleQuickAdd(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`)}
                        className="btn-primary"
                      >
                        <Plus className="w-5 h-5" />
                        Schedule a Post
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upcoming Posts Sidebar (visible in month and week view) */}
      {view !== 'day' && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingPosts = allPosts
          .filter(post => {
            if (!post.date) return false;
            const postDate = new Date(post.date);
            postDate.setHours(0, 0, 0, 0);
            return postDate >= today;
          })
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() === dateB.getTime()) {
              return a.time.localeCompare(b.time);
            }
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);
        
        return (
          <div className="card overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-4 md:px-5 py-3 md:py-4">
              <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                Upcoming Posts
              </h3>
            </div>
            
            {upcomingPosts.length === 0 ? (
              <div className="p-6 md:p-8 text-center">
                <CalendarIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No upcoming posts scheduled</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingPosts.map(post => (
                  <div 
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="w-2 h-2 rounded-full bg-huttle-primary flex-shrink-0 group-hover:scale-125 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-gray-900 truncate group-hover:text-huttle-primary transition-colors">
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {post.date} at {formatTo12Hour(post.time)} • {post.platforms?.join(', ')}
                      </p>
                    </div>
                    {post.optimal && (
                      <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Create Post Modal */}
      <CreatePostModal 
        isOpen={isCreatePostOpen} 
        onClose={() => {
          setIsCreatePostOpen(false);
          setQuickAddDate(null);
        }}
        preselectedDate={quickAddDate}
      />

      {/* Publish Modal */}
      {postToPublish && (
        <PublishModal
          isOpen={isPublishModalOpen}
          onClose={() => {
            setIsPublishModalOpen(false);
            setPostToPublish(null);
          }}
          post={postToPublish}
          userId={user?.id}
        />
      )}

      {/* Calendar Templates Modal */}
      <CalendarTemplates
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onApplyTemplate={(plan) => {
          addToast(`Applied ${plan.template.name} template!`, 'success');
        }}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="calendarTemplates"
      />
    </div>
  );
}
