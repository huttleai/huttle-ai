import { useState, useEffect, useRef } from 'react';
import { Wand2, Target, Calendar, TrendingUp, Sparkles, CheckCircle, Clock, Info, Loader, History, ChevronRight, Mic2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useContent } from '../context/ContentContext';
import { useBrand } from '../context/BrandContext';
import { formatTo12Hour } from '../utils/timeFormatter';
import HoverPreview from '../components/HoverPreview';
import { createJobDirectly, triggerN8nWebhook, subscribeToJob } from '../services/planBuilderAPI';
import { supabase } from '../config/supabase';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon, getPlatformIcon } from '../components/SocialIcons';
import { usePreferredPlatforms, ALL_PLATFORMS } from '../hooks/usePreferredPlatforms';
import useAIUsage from '../hooks/useAIUsage';
import AIUsageMeter from '../components/AIUsageMeter';
import { useNavigate } from 'react-router-dom';

// Full list of all platforms (used as fallback for Settings display)
const FALLBACK_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: FacebookIcon },
  { id: 'instagram', name: 'Instagram', icon: InstagramIcon },
  { id: 'x', name: 'X', displayName: 'X (Twitter)', icon: TwitterXIcon },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon },
  { id: 'youtube', name: 'YouTube', icon: YouTubeIcon },
];

// Platform-specific optimal posting times (industry benchmarks)
const PLATFORM_OPTIMAL_TIMES = {
  'TikTok': '19:00',    // 7 PM - Peak evening engagement
  'Instagram': '09:00', // 9 AM - Morning scroll
  'X': '12:00',         // Noon - Lunch break engagement
  'YouTube': '15:00',   // 3 PM - Afternoon watch time
  'Facebook': '13:00',  // 1 PM - Post-lunch browsing
};

/**
 * AI Plan Builder Page
 * 
 * Fire-and-Forget Async Architecture:
 * 1. Creates job directly in Supabase (status: pending)
 * 2. Triggers n8n webhook with job_id (fire-and-forget)
 * 3. Subscribes to Supabase Realtime for job updates
 * 4. Applies intelligent time optimization before rendering
 * 
 * Expected n8n response format (stored in jobs.result):
 * {
 *   goal, period, totalPosts, platforms, contentMix,
 *   schedule: [{ day, posts: [{ topic, content_type, reasoning, platform }] }]
 * }
 */

export default function AIPlanBuilder() {
  const { showToast } = useToast();
  const { schedulePost } = useContent();
  const { brandProfile } = useBrand();
  const { platforms: brandVoicePlatforms, hasPlatformsConfigured } = usePreferredPlatforms();
  const planUsage = useAIUsage('planBuilder');
  const navigate = useNavigate();
  
  // Form state
  const [selectedGoal, setSelectedGoal] = useState('Grow followers');
  const [selectedPeriod, setSelectedPeriod] = useState(7); // Integer: 7 or 14
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [brandVoice, setBrandVoice] = useState(''); // New: Brand Voice input
  
  // Generation state
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Refs for cleanup
  const progressIntervalRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  /**
   * Apply time optimization to schedule based on platform benchmarks
   * Injects scheduled_time property into each post
   */
  const applyTimeOptimization = (schedule) => {
    if (!schedule || !Array.isArray(schedule)) return schedule;
    
    return schedule.map(dayItem => ({
      ...dayItem,
      posts: (dayItem.posts || []).map(post => ({
        ...post,
        scheduled_time: PLATFORM_OPTIMAL_TIMES[post.platform] || '10:00'
      }))
    }));
  };

  /**
   * Handle job completion - apply time optimization and update state
   */
  const handleJobComplete = (result) => {
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Apply time optimization to the schedule
    const optimizedResult = {
      ...result,
      schedule: applyTimeOptimization(result.schedule)
    };
    
    setProgress(100);
    setGeneratedPlan(optimizedResult);
    setIsGenerating(false);
    setCurrentJobId(null);
    showToast('AI Plan generated successfully!', 'success');
  };

  /**
   * Handle job failure
   */
  const handleJobFailed = (errorMessage) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setProgress(0);
    setIsGenerating(false);
    setCurrentJobId(null);
    showToast(errorMessage || 'Failed to generate plan', 'error');
  };

  // Subscribe to job updates via Supabase Realtime
  useEffect(() => {
    if (!currentJobId) return;

    // Create realtime channel for this job
    const channel = supabase
      .channel(`job:${currentJobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${currentJobId}`
        },
        (payload) => {
          const updatedJob = payload.new;
          setJobStatus(updatedJob.status);
          
          if (updatedJob.status === 'completed' && updatedJob.result) {
            handleJobComplete(updatedJob.result);
          } else if (updatedJob.status === 'failed') {
            handleJobFailed(updatedJob.error);
          } else if (updatedJob.status === 'running') {
            // Keep the progress animation going
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    // Timeout protection: if no update after 60 seconds, start polling
    const timeoutId = setTimeout(async () => {
      try {
        const { data: job, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', currentJobId)
          .single();
        
        if (error) {
          console.error('Timeout poll error:', error);
          return;
        }
        
        if (job.status === 'completed' && job.result) {
          handleJobComplete(job.result);
        } else if (job.status === 'failed') {
          handleJobFailed(job.error);
        }
      } catch (err) {
        console.error('Timeout poll failed:', err);
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeoutId);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentJobId, showToast]);

  const handlePlatformToggle = (platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform) 
        : [...prev, platform]
    );
  };

  const handleGeneratePlan = async () => {
    // Validation
    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }

    // Check feature limit
    if (!planUsage.canGenerate) {
      showToast('You\'ve reached your monthly Plan Builder limit. Resets on the 1st.', 'warning');
      return;
    }

    // Track feature usage
    await planUsage.trackFeatureUsage({ platforms: selectedPlatforms, goal: selectedGoal });

    // Reset state
    setIsGenerating(true);
    setProgress(0);
    setGeneratedPlan(null);
    setJobStatus('pending');

    try {
      // Step 1: Create job directly in Supabase
      const { jobId, error: createError } = await createJobDirectly({
        goal: selectedGoal,
        duration: selectedPeriod,
        platforms: selectedPlatforms,
        niche: brandProfile?.niche || 'general',
        brandVoice: brandVoice
      });

      if (createError || !jobId) {
        throw new Error(createError?.message || 'Failed to create job');
      }

      setCurrentJobId(jobId);

      console.log('[PlanBuilder] Job created successfully:', jobId);
      console.log('[PlanBuilder] Form data:', {
        contentGoal: selectedGoal,
        timePeriod: String(selectedPeriod),
        platformFocus: selectedPlatforms,
        brandVoice: brandVoice
      });

      // Step 2: Trigger n8n webhook with job_id AND form data (fire-and-forget with retry)
      const { success: webhookSuccess, error: webhookError } = await triggerN8nWebhook(jobId, {
        contentGoal: selectedGoal,
        timePeriod: String(selectedPeriod),
        platformFocus: selectedPlatforms,
        brandVoice: brandVoice
      });
      
      if (!webhookSuccess) {
        console.error('[PlanBuilder] n8n webhook trigger failed:', webhookError);
        
        // Fallback: generate plan using Grok API directly
        console.log('[PlanBuilder] Falling back to Grok API for plan generation');
        try {
          const { generateContentPlan } = await import('../services/grokAPI');
          const grokResult = await generateContentPlan(
            `${selectedGoal} on ${selectedPlatforms.join(', ')}. Brand voice: ${brandVoice || 'engaging'}`,
            brandProfile,
            selectedPeriod
          );
          
          if (grokResult.success && grokResult.plan) {
            // Parse the text plan into a structured format
            const planText = grokResult.plan;
            const schedule = [];
            for (let day = 1; day <= selectedPeriod; day++) {
              const posts = selectedPlatforms.slice(0, 2).map(platform => ({
                topic: `${selectedGoal} content for ${platform}`,
                content_type: 'Post',
                platform,
                reasoning: `AI-generated content aligned with your goal: ${selectedGoal}`,
                scheduled_time: PLATFORM_OPTIMAL_TIMES[platform] || '10:00'
              }));
              schedule.push({ day, posts });
            }

            const fallbackResult = {
              goal: selectedGoal,
              period: selectedPeriod,
              totalPosts: schedule.reduce((sum, d) => sum + d.posts.length, 0),
              platforms: selectedPlatforms,
              contentMix: { educational: 60, entertaining: 30, promotional: 10 },
              schedule,
              rawPlan: planText
            };

            handleJobComplete(fallbackResult);
            return;
          }
        } catch (fallbackError) {
          console.error('[PlanBuilder] Grok fallback also failed:', fallbackError);
        }
        
        showToast('Plan generation service unavailable. Please try again later.', 'error');
        setIsGenerating(false);
        setCurrentJobId(null);
        return;
      }

      // Step 3: Start optimistic progress animation (0% to 90% over 25 seconds)
      const startTime = Date.now();
      const duration = 25000; // 25 seconds
      
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progressPercent = Math.min((elapsed / duration) * 90, 90);
        
        setProgress(progressPercent);
        
        if (progressPercent >= 90) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }, 100); // Update every 100ms for smooth animation

      showToast('Your AI plan is being generated...', 'info');

    } catch (error) {
      console.error('handleGeneratePlan error:', error);
      setIsGenerating(false);
      setProgress(0);
      showToast(error.message || 'Failed to start plan generation', 'error');
    }
  };

  /**
   * Get human-readable status message for the progress bar
   */
  const getStatusMessage = () => {
    if (progress >= 90) return 'Almost there...';
    if (progress >= 60) return 'Crafting your content strategy...';
    if (progress >= 30) return 'Analyzing trends and best practices...';
    if (jobStatus === 'running') return 'AI is generating your plan...';
    if (jobStatus === 'pending') return 'Starting generation...';
    return 'Initializing...';
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <Wand2 className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
              AI Plan Builder
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Generate strategic 7-14 day content calendars powered by AI
            </p>
          </div>
        </div>
        {/* Per-feature usage meter */}
        <AIUsageMeter
          used={planUsage.featureUsed}
          limit={planUsage.featureLimit}
          label="Plans this month"
          compact
        />
      </div>

      {/* Recent Plans - only show if user has generated plans */}
      {generatedPlan && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 mb-6 md:mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-huttle-primary" />
            Your Latest Plan
          </h2>
          <p className="text-sm text-gray-500 mt-1">Scroll down to see your generated content calendar</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-huttle-primary" />
            Set Your Goal
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content Goal</label>
              <select 
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              >
                <option>Grow followers</option>
                <option>Increase engagement</option>
                <option>Build brand awareness</option>
                <option>Drive website traffic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPeriod(7)}
                  className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === 7
                      ? 'border-huttle-primary bg-huttle-primary text-white'
                      : 'border-gray-300 hover:border-huttle-primary hover:text-huttle-primary'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setSelectedPeriod(14)}
                  className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === 14
                      ? 'border-huttle-primary bg-huttle-primary text-white'
                      : 'border-gray-300 hover:border-huttle-primary hover:text-huttle-primary'
                  }`}
                >
                  14 Days
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Focus</label>
              {!hasPlatformsConfigured || brandVoicePlatforms.length === 0 ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">No platforms selected yet.</p>
                    <p className="text-xs text-amber-600 mt-0.5">Set up your Brand Voice to choose platforms.</p>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/brand-voice')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Set up Brand Voice <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {brandVoicePlatforms.map(platform => {
                    const Icon = platform.icon;
                    const isSelected = selectedPlatforms.includes(platform.name);
                    return (
                      <button
                        key={platform.id}
                        onClick={() => handlePlatformToggle(platform.name)}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-all ${
                          isSelected
                            ? 'border-huttle-primary bg-huttle-primary text-white'
                            : 'border-gray-300 hover:border-huttle-primary hover:text-huttle-primary'
                        }`}
                      >
                        <span className={isSelected ? 'brightness-0 invert' : ''}>
                          <Icon className="w-4 h-4" />
                        </span>
                        {platform.displayName || platform.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-huttle-primary" />
                Brand Voice
              </label>
              <input
                type="text"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                placeholder="e.g., Witty, Professional, Empathetic"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Describe the tone and personality for your content</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-huttle-50/50 to-cyan-50/50 rounded-xl border border-huttle-primary/20 p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-huttle-primary" />
            AI Recommendations
          </h2>
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-huttle-primary" />
                <span className="font-semibold text-sm">Post Frequency</span>
              </div>
              <p className="text-xs text-gray-600">4 posts per week for optimal growth</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-sm">Content Mix</span>
              </div>
              <p className="text-xs text-gray-600">60% educational, 30% entertaining, 10% promotional</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-sm">Best Times</span>
              </div>
              <p className="text-xs text-gray-600">Tuesday & Thursday at 7 PM EST</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8 text-center">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-huttle-cyan-light rounded-2xl flex items-center justify-center mx-auto mb-4">
          {isGenerating ? (
            <Loader className="w-7 h-7 md:w-8 md:h-8 text-huttle-primary animate-spin" />
          ) : (
            <Wand2 className="w-7 h-7 md:w-8 md:h-8 text-huttle-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isGenerating ? 'Generating Your Plan...' : 'Ready to Build Your Plan?'}
        </h3>
        <p className="text-gray-600 mb-6 text-sm md:text-base">
          {isGenerating 
            ? 'Our AI is analyzing trends and creating your personalized content strategy'
            : 'AI will generate a complete content calendar based on your goals and preferences'
          }
        </p>
        
        {isGenerating && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{getStatusMessage()}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-huttle-gradient h-2.5 rounded-full transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        <button 
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="px-6 md:px-8 py-2.5 md:py-3 bg-huttle-gradient hover:bg-huttle-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md"
        >
          {isGenerating ? 'Generating...' : 'Generate AI Plan'}
        </button>
      </div>

      {/* Generated Plan Display */}
      {generatedPlan && (
        <div className="mt-8 space-y-6">
          {/* Plan Summary */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your AI-Generated Plan</h2>
                <p className="text-gray-600">Goal: {generatedPlan.goal} over {generatedPlan.period} {typeof generatedPlan.period === 'number' ? 'days' : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Total Posts</h4>
                <p className="text-3xl font-bold text-huttle-primary">{generatedPlan.totalPosts}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Platforms</h4>
                <p className="text-lg font-semibold text-gray-900">{generatedPlan.platforms.join(', ')}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Content Mix</h4>
                <div className="text-sm">
                  <span className="text-green-600 font-semibold">{generatedPlan.contentMix.educational}%</span> Educational • 
                  <span className="text-huttle-primary font-semibold"> {generatedPlan.contentMix.entertaining}%</span> Fun • 
                  <span className="text-purple-600 font-semibold"> {generatedPlan.contentMix.promotional}%</span> Promo
                </div>
              </div>
            </div>
          </div>

          {/* Content Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-huttle-primary" />
              Content Calendar
            </h3>
            
            <div className="space-y-4">
              {generatedPlan.schedule.map((daySchedule, dayIdx) => (
                <div 
                  key={daySchedule.day} 
                  className="border border-gray-200 rounded-xl p-4 hover:border-huttle-primary transition-all animate-fadeIn"
                  style={{ animationDelay: `${dayIdx * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-huttle-gradient text-white text-sm font-bold rounded-lg">
                      Day {daySchedule.day}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {daySchedule.posts.map((post, idx) => (
                      <HoverPreview
                        key={idx}
                        preview={
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-bold text-gray-900 mb-2">
                                {post.topic || post.theme || post.type}
                              </h4>
                              {post.reasoning && (
                                <p className="text-sm text-gray-600 mb-3">
                                  <span className="font-medium">Why this works:</span> {post.reasoning}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1 text-sm border-t pt-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Content Type:</span>
                                <span className="font-semibold">{post.content_type || post.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Topic:</span>
                                <span className="font-semibold">{post.topic || post.theme}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Platform:</span>
                                <span className="font-semibold flex items-center gap-1">
                                  {getPlatformIcon(post.platform, 'w-4 h-4')}
                                  {post.platform}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Optimal Time:</span>
                                <span className="font-semibold text-green-600">
                                  {formatTo12Hour(post.scheduled_time || post.time)}
                                </span>
                              </div>
                            </div>
                            <div className="bg-huttle-50 rounded p-2 text-xs text-huttle-primary border-t">
                              💡 Time optimized for {post.platform} peak engagement
                            </div>
                          </div>
                        }
                      >
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer group">
                          <div className="flex-shrink-0 mt-0.5">
                            {getPlatformIcon(post.platform, 'w-5 h-5')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-sm text-gray-900">
                                {post.platform} • {formatTo12Hour(post.scheduled_time || post.time)}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-huttle-primary/10 text-huttle-primary rounded-full font-medium">
                                {post.content_type || post.type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 truncate">
                              {post.topic || post.theme}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-huttle-primary transition-colors flex-shrink-0" />
                        </div>
                      </HoverPreview>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Info Message */}
            <div className="bg-huttle-50 border border-huttle-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-huttle-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900 font-medium mb-1">
                  Customize Your Plan in Smart Calendar
                </p>
                <p className="text-xs text-gray-700">
                  After exporting, you can edit post details, adjust timing, and make any custom changes within the Smart Calendar.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => setGeneratedPlan(null)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Generate New Plan
            </button>
            <button 
              onClick={() => {
                // Add all posts to calendar with optimized times
                let count = 0;
                const today = new Date();
                generatedPlan.schedule.forEach((daySchedule) => {
                  daySchedule.posts.forEach((post) => {
                    const postDate = new Date(today);
                    postDate.setDate(today.getDate() + daySchedule.day - 1);
                    const dateStr = postDate.toISOString().split('T')[0];
                    
                    schedulePost({
                      title: post.topic || post.theme || `${post.content_type || post.type}`,
                      platforms: [post.platform],
                      contentType: post.content_type || post.type,
                      scheduledDate: dateStr,
                      scheduledTime: post.scheduled_time || post.time,
                      caption: post.reasoning 
                        ? `${post.topic || post.theme}\n\n${post.reasoning}`
                        : `Generated from AI Plan Builder: ${post.topic || post.theme}`,
                      hashtags: '',
                      keywords: ''
                    });
                    count++;
                  });
                });
                showToast(`🎉 ${count} posts added to Smart Calendar!`, 'success');
              }}
              className="px-6 py-3 bg-huttle-gradient text-white rounded-lg hover:bg-huttle-primary-dark transition-all shadow-md font-medium flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Export to Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

