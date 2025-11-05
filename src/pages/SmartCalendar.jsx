import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, Clock, TrendingUp, ChevronLeft, ChevronRight, Image, Video, ArrowLeft, Download, Copy, FileDown, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { usePostReminders } from '../hooks/usePostReminders';
import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { updatePostStatus } from '../config/supabase';
import { AuthContext } from '../context/AuthContext';
import PostToSocialButton from '../components/PostToSocialButton';
import PostValidationAlert from '../components/PostValidationAlert';
import Tooltip from '../components/Tooltip';
import CreatePostModal from '../components/CreatePostModal';
import HoverPreview from '../components/HoverPreview';
import { downloadPostAsText, downloadPostAsJSON, copyPostToClipboard, downloadForPlatform } from '../utils/downloadHelpers';
import { formatTo12Hour } from '../utils/timeFormatter';
import { formatRelativeTime } from '../utils/timezoneHelpers';
import { useContext } from 'react';

export default function SmartCalendar() {
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [, setSelectedDay] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Check if navigating from Dashboard with a specific date
  useEffect(() => {
    if (location.state?.date) {
      // Parse the date string properly to avoid timezone issues
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
  const isOnline = useOfflineDetection();

  // Enable post reminders
  usePostReminders();

  // Mock published posts with analytics
  const mockPublishedPosts = [
    { id: 1, date: '2024-10-28', time: '09:00', title: 'Morning Motivation Post', platforms: ['Instagram'], type: 'image', views: 1250, likes: 87, comments: 12, shares: 5, caption: 'Start your day with positivity!', hashtags: '#motivation #morning', optimal: true, editable: true },
    { id: 2, date: '2024-10-29', time: '14:00', title: 'Product Showcase Video', platforms: ['TikTok'], type: 'video', views: 3420, likes: 245, comments: 34, shares: 28, caption: 'Check out our amazing new product!', hashtags: '#product #showcase', optimal: true, editable: true },
    { id: 3, date: '2024-10-30', time: '19:00', title: 'Evening Tips & Tricks', platforms: ['LinkedIn'], type: 'text', views: 892, likes: 45, comments: 8, shares: 12, caption: 'Pro tips for better productivity', hashtags: '#productivity #tips', optimal: true, editable: true },
    { id: 4, date: '2024-11-01', time: '12:00', title: 'Lunch Hour Engagement', platforms: ['Facebook'], type: 'image', views: 1876, likes: 132, comments: 23, shares: 15, caption: 'Join us for lunch!', hashtags: '#lunch #community', editable: true },
    { id: 5, date: '2024-10-29', time: '10:30', title: 'Story Update', platforms: ['Instagram'], type: 'image', views: 2100, likes: 156, comments: 19, shares: 9, caption: 'Behind the scenes', hashtags: '#bts #story', editable: true },
    { id: 6, date: '2024-10-29', time: '16:00', title: 'Afternoon Post', platforms: ['X'], type: 'text', views: 1420, likes: 89, comments: 15, shares: 22, caption: 'Quick update for our followers', hashtags: '#update #news', editable: true },
  ];

  // Transform scheduledPosts to match calendar format and combine with published posts
  const allPosts = useMemo(() => {
    // Transform scheduled posts to calendar format
    const transformedScheduledPosts = scheduledPosts.map(post => {
      // Parse scheduledDate and scheduledTime
      const dateStr = post.scheduledDate || '';
      const timeStr = post.scheduledTime || '09:00';
      
      // Determine content type from contentType field
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
        optimal: false, // Could be calculated based on time
        editable: true,
        createdAt: post.createdAt,
        status: post.status,
        // Keep original post data for reference
        originalPost: post
      };
    });

    // Combine with mock published posts
    return [...mockPublishedPosts, ...transformedScheduledPosts];
  }, [scheduledPosts]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const navigate = (direction) => {
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

  const handleDayClick = (day) => {
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

  const handlePostClick = (post) => {
    if (post.date) {
      // Parse the date string properly to avoid timezone issues
      const [year, month, day] = post.date.split('-').map(Number);
      const postDate = new Date(year, month - 1, day);
      if (!isNaN(postDate.getTime())) {
        setCurrentDate(postDate);
        setView('day');
      }
    }
  };

  const handleEditPost = (post) => {
    // Future enhancement: Open edit modal with post data
    // This will allow users to modify scheduled posts before they're published
    addToast('Edit functionality coming soon!', 'info');
  };

  const handleDeletePost = (post) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      // Delete from scheduledPosts if it exists there
      if (post.id && typeof post.id === 'number') {
        // Check if it's a scheduled post (has createdAt or status fields)
        if (post.createdAt || post.status) {
          deleteScheduledPost(post.id);
        }
      }
      addToast('Post deleted successfully!', 'success');
      setShowPostDetail(false);
      // Force re-render by updating state
      setCurrentDate(new Date(currentDate));
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
        // Update local state
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

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
      ready: 'bg-green-100 text-green-800 border-green-300',
      posting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      posted: 'bg-gray-100 text-gray-600 border-gray-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
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
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.scheduled}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-20 px-4 md:px-8 pb-8">
      <div className="mb-8">
        <Tooltip content="Your calendar shows all scheduled posts. Click any post to edit, download, or post directly to social media. You'll receive notifications 30, 15, and 5 minutes before scheduled posts.">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Smart Calendar
          </h1>
        </Tooltip>
        <p className="text-gray-600">
          Track your published content performance across platforms
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-1 text-sm">Peak Time</h4>
          <p className="text-xs text-blue-700">Your audience is most active on Tuesdays at 7 PM</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-1 text-sm">This Week</h4>
          <p className="text-xs text-green-700">{allPosts.length} posts scheduled • 85% optimal times</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-1 text-sm">AI Suggestion</h4>
          <p className="text-xs text-purple-700">Add 2 more posts this week for best results</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tooltip content="Create a new post and schedule it for optimal engagement times">
          <button 
            onClick={() => setIsCreatePostOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Post
          </button>
        </Tooltip>
        <Tooltip content="View analytics to find the best posting times for your audience">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
            <TrendingUp className="w-4 h-4" />
            Optimize Times
          </button>
        </Tooltip>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {view === 'day' && (
                <button
                  onClick={() => setView('month')}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-2xl font-bold">{getTitleText()}</h2>
              {syncing && (
                <div className="flex items-center gap-2 text-sm bg-white bg-opacity-20 px-3 py-1 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <button 
              onClick={() => setView('month')}
              className={`px-3 py-1 rounded ${view === 'month' ? 'bg-white bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'}`}
            >
              Month
            </button>
            <button 
              onClick={() => setView('week')}
              className={`px-3 py-1 rounded ${view === 'week' ? 'bg-white bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'}`}
            >
              Week
            </button>
            <button 
              onClick={() => {
                setCurrentDate(new Date());
                setView('day');
              }}
              className={`px-3 py-1 rounded ${view === 'day' ? 'bg-white bg-opacity-30' : 'hover:bg-white hover:bg-opacity-20'}`}
            >
              Day
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 hover:bg-white hover:bg-opacity-20 rounded"
            >
              Today
            </button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
        {/* Month View */}
        {view === 'month' && (
          <>
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {dayNames.map(day => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 min-h-24 bg-gray-50 border border-gray-100"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const posts = getPostsForDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`p-2 min-h-24 border border-gray-100 hover:bg-huttle-primary hover:bg-opacity-5 transition-all cursor-pointer ${
                      isToday ? 'bg-huttle-primary bg-opacity-5' : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-huttle-primary', 'bg-opacity-10');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-huttle-primary', 'bg-opacity-10');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-huttle-primary', 'bg-opacity-10');
                      
                      try {
                        const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                        const droppedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        
                        // Find the post in allPosts
                        const postToUpdate = allPosts.find(p => p.id === dragData.postId);
                        
                        if (postToUpdate) {
                          // Check if it's a scheduled post (has createdAt or status)
                          if (postToUpdate.createdAt || postToUpdate.status) {
                            // Update scheduled post
                            updateScheduledPost(dragData.postId, {
                              scheduledDate: droppedDate,
                              scheduledTime: dragData.originalTime // Keep same time for now
                            });
                            addToast('Post moved successfully!', 'success');
                          } else {
                            // Mock post - just show a message (in real app, you'd handle this differently)
                            addToast('Mock posts cannot be moved. Create a new post to schedule.', 'info');
                          }
                        }
                      } catch (error) {
                        console.error('Error handling drop:', error);
                        addToast('Error moving post. Please try again.', 'error');
                      }
                    }}
                  >
                    <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-huttle-primary' : 'text-gray-700'}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {posts.slice(0, 2).map(post => {
                        const previewContent = (
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-bold text-lg text-gray-900">{post.title}</h4>
                              {post.optimal && (
                                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-semibold">
                                  ⭐ Optimal
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{formatTo12Hour(post.time)}</span>
                            </div>
                            {post.platforms && post.platforms.length > 0 && (
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">Platforms: </span>
                                <span className="text-gray-600">{post.platforms.join(', ')}</span>
                              </div>
                            )}
                            {post.caption && (
                              <div className="text-sm text-gray-700 line-clamp-3">
                                {post.caption.length > 100 ? `${post.caption.substring(0, 100)}...` : post.caption}
                              </div>
                            )}
                            {post.hashtags && (
                              <div className="text-xs text-gray-600">
                                {post.hashtags}
                              </div>
                            )}
                          </div>
                        );

                        return (
                          <HoverPreview key={post.id} preview={previewContent}>
                            <div
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  postId: post.id,
                                  originalDate: post.date,
                                  originalTime: post.time
                                }));
                                e.dataTransfer.effectAllowed = 'move';
                                e.currentTarget.style.opacity = '0.5';
                              }}
                              onDragEnd={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePostClick(post);
                              }}
                              className={`text-xs p-1 rounded truncate cursor-pointer ${
                                post.optimal 
                                  ? 'bg-green-100 text-green-800 border border-green-300' 
                                  : 'bg-blue-100 text-blue-800 border border-blue-300'
                              }`}
                              title={post.title}
                            >
                              <div className="flex items-center gap-1">
                                {post.type === 'image' && <Image className="w-3 h-3" />}
                                {post.type === 'video' && <Video className="w-3 h-3" />}
                                {post.optimal && '⭐'}
                                <span className="truncate">{formatTo12Hour(post.time)}</span>
                              </div>
                            </div>
                          </HoverPreview>
                        );
                      })}
                      {posts.length > 2 && (
                        <div className="text-xs text-gray-600 font-semibold">+{posts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Week View */}
        {view === 'week' && (
          <>
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {getWeekDays().map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${isToday ? 'bg-huttle-primary bg-opacity-10' : ''}`}
                  >
                    <div className="text-xs font-semibold text-gray-600">{dayNames[date.getDay()]}</div>
                    <div className={`text-lg font-bold ${isToday ? 'text-huttle-primary' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-7">
              {getWeekDays().map((date, i) => {
                const posts = getPostsForDate(date);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                
                return (
                  <div
                    key={i}
                    onClick={() => handleWeekDayClick(date)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-huttle-primary', 'bg-opacity-10');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-huttle-primary', 'bg-opacity-10');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('bg-huttle-primary', 'bg-opacity-10');
                      
                      try {
                        const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                        
                        // Find the post in allPosts
                        const postToUpdate = allPosts.find(p => p.id === dragData.postId);
                        
                        if (postToUpdate) {
                          // Check if it's a scheduled post (has createdAt or status)
                          if (postToUpdate.createdAt || postToUpdate.status) {
                            // Update scheduled post
                            updateScheduledPost(dragData.postId, {
                              scheduledDate: dateStr,
                              scheduledTime: dragData.originalTime // Keep same time for now
                            });
                            addToast('Post moved successfully!', 'success');
                          } else {
                            // Mock post - just show a message
                            addToast('Mock posts cannot be moved. Create a new post to schedule.', 'info');
                          }
                        }
                      } catch (error) {
                        console.error('Error handling drop:', error);
                        addToast('Error moving post. Please try again.', 'error');
                      }
                    }}
                    className="p-2 min-h-96 border-r border-gray-100 last:border-r-0 hover:bg-huttle-primary hover:bg-opacity-5 cursor-pointer overflow-y-auto"
                  >
                    <div className="space-y-2">
                      {posts.map(post => (
                        <div
                          key={post.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              postId: post.id,
                              originalDate: post.date,
                              originalTime: post.time
                            }));
                            e.dataTransfer.effectAllowed = 'move';
                            e.currentTarget.style.opacity = '0.5';
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePostClick(post);
                          }}
                          className={`p-2 rounded text-xs cursor-move ${
                            post.optimal 
                              ? 'bg-green-100 border border-green-300 hover:bg-green-200' 
                              : 'bg-blue-100 border border-blue-300 hover:bg-blue-200'
                          } transition-all`}
                        >
                          <div className="font-semibold mb-1 flex items-center gap-1">
                            {post.optimal && '⭐'}
                            {formatTo12Hour(post.time)}
                          </div>
                          <div className="text-gray-800 font-medium">{post.title}</div>
                          <div className="text-gray-600 mt-1">{post.platforms?.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Day View */}
        {view === 'day' && (
          <div className="p-6">
            <div className="space-y-3 max-w-3xl mx-auto">
              {getPostsForDate(currentDate).length > 0 ? (
                getPostsForDate(currentDate).map(post => (
                  <div
                    key={post.id}
                    className={`p-6 rounded-xl border-2 shadow-sm hover:shadow-md transition-all ${
                      post.optimal 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-blue-50 border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          post.optimal ? 'bg-green-200' : 'bg-blue-200'
                        }`}>
                          {post.type === 'image' && <Image className="w-6 h-6" />}
                          {post.type === 'video' && <Video className="w-6 h-6" />}
                          {post.type === 'text' && <CalendarIcon className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="font-bold text-lg">{formatTo12Hour(post.time)}</div>
                          <div className="text-sm text-gray-600">{post.platforms?.join(', ')}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {post.status && <StatusBadge status={post.status} />}
                        {post.optimal && (
                          <span className="px-3 py-1 bg-green-500 text-white text-xs rounded-full font-semibold flex items-center gap-1">
                            ⭐ Optimal Time
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-xl mb-2">{post.title}</h3>
                    {post.caption && <p className="text-gray-700 mb-2">{post.caption}</p>}
                    {post.hashtags && <p className="text-sm text-gray-600 mb-4">{post.hashtags}</p>}

                    {/* Validation Alert */}
                    <PostValidationAlert post={post} />

                    <div className="flex flex-wrap gap-2 mt-4">
                      {/* Mark as Posted button (only show if not posted) */}
                      {post.status && post.status !== 'posted' && post.status !== 'cancelled' && (
                        <button
                          onClick={() => handleMarkAsPosted(post.id)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-medium flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark as Posted
                        </button>
                      )}
                      
                      {/* Edit button */}
                      {post.editable && (
                        <button 
                          onClick={() => handleEditPost(post)}
                          className="px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all text-sm font-medium flex items-center gap-2"
                        >
                          Edit Post
                        </button>
                      )}
                      
                      {/* Post Now button */}
                      <PostToSocialButton post={post} />
                      
                      <button 
                        onClick={() => handleDownload(post, 'text')}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button 
                        onClick={() => handleCopy(post)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                      <button 
                        onClick={() => handleDownload(post, 'json')}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <FileDown className="w-4 h-4" />
                        Export JSON
                      </button>
                      
                      {/* Platform-specific downloads */}
                      {post.platforms && post.platforms.length > 0 && (
                        <div className="relative group">
                          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium">
                            Download for Platform ▼
                          </button>
                          <div className="absolute hidden group-hover:block top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                            {post.platforms.map(platform => (
                              <button
                                key={platform}
                                onClick={() => handlePlatformDownload(post, platform)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm first:rounded-t-lg last:rounded-b-lg"
                              >
                                {platform}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Delete button */}
                      <button 
                        onClick={() => handleDeletePost(post)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-medium flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts scheduled</h3>
                  <p className="text-gray-600 mb-6">
                    You don't have any posts scheduled for this day
                  </p>
                  <button className="px-6 py-3 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-md">
                    <Plus className="w-4 h-4 inline mr-2" />
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

      {/* Upcoming Posts (visible in month and week view) */}
      {view !== 'day' && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter to only show upcoming posts (today or future) and sort by date
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
              // If same date, sort by time
              return a.time.localeCompare(b.time);
            }
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);
        
        return (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Posts</h3>
            {upcomingPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No upcoming posts scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingPosts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => {
                      // Parse the date string properly to avoid timezone issues
                      const [year, month, day] = post.date.split('-').map(Number);
                      const postDate = new Date(year, month - 1, day);
                      setCurrentDate(postDate);
                      setView('day');
                    }}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-huttle-primary flex-shrink-0"></div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-gray-900">{post.title}</h4>
                      <p className="text-xs text-gray-600">{post.date} at {formatTo12Hour(post.time)} • {post.platforms?.join(', ')}</p>
                    </div>
                    {post.optimal && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                        ⭐ Optimal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Create Post Modal */}
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
    </div>
  );
}
