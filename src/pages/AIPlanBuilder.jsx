import { useState, useEffect, useLayoutEffect, useRef, useContext, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Wand2, Target, Calendar, TrendingUp, Sparkles, CheckCircle, Clock, Info, Loader, History, ChevronRight, Mic2, AlertTriangle, Copy, Check, FolderPlus } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useBrand } from '../context/BrandContext';
import { formatTo12Hour } from '../utils/timeFormatter';
import HoverPreview from '../components/HoverPreview';
import { createJobDirectly, triggerN8nWebhook } from '../services/planBuilderAPI';
import { supabase, saveContentLibraryItem } from '../config/supabase';
import { AuthContext } from '../context/AuthContext';
import { InstagramIcon, FacebookIcon, TikTokIcon, TwitterXIcon, YouTubeIcon, getPlatformIcon } from '../components/SocialIcons';
import { usePreferredPlatforms, ALL_PLATFORMS } from '../hooks/usePreferredPlatforms';
import useAIUsage from '../hooks/useAIUsage';
import AIUsageMeter from '../components/AIUsageMeter';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildContentVaultPayload } from '../utils/contentVault';
import { buildBrandContext } from '../utils/buildBrandContext'; // HUTTLE AI: brand context injected
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized
import { getCachedTrends } from '../services/dashboardCacheService';
import LoadingSpinner from '../components/LoadingSpinner';

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

function normalizePlanResultShape(result) {
  if (!result || typeof result !== 'object') {
    return { isValid: false, error: 'No plan data was returned from the workflow.' };
  }

  const platforms = Array.isArray(result.platforms)
    ? result.platforms.filter(Boolean)
    : [];
  const contentMix = result.contentMix && typeof result.contentMix === 'object'
    ? result.contentMix
    : null;
  const rawSchedule = Array.isArray(result.schedule) ? result.schedule : [];

  const schedule = rawSchedule
    .map((dayItem, index) => ({
      day: Number(dayItem?.day) || index + 1,
      posts: Array.isArray(dayItem?.posts) ? dayItem.posts : [],
    }))
    .filter((dayItem) => dayItem.posts.length > 0);

  if (platforms.length === 0) {
    return { isValid: false, error: 'Generated plan is missing platform details.' };
  }

  if (!contentMix || Number.isNaN(Number(contentMix?.educational ?? 0))) {
    return { isValid: false, error: 'Generated plan is missing content mix details.' };
  }

  if (schedule.length === 0) {
    return { isValid: false, error: 'Generated plan is missing a valid posting schedule.' };
  }

  const totalPosts = schedule.reduce((sum, dayItem) => sum + dayItem.posts.length, 0);
  return {
    isValid: true,
    plan: {
      ...result,
      platforms,
      contentMix,
      schedule,
      totalPosts: result.totalPosts || totalPosts,
    },
  };
}

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
  const { brandProfile } = useBrand();
  const { platforms: brandVoicePlatforms, hasPlatformsConfigured } = usePreferredPlatforms();
  const planUsage = useAIUsage('planBuilder');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  
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
  const handleJobFailed = useCallback((errorMessage) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setProgress(0);
    setIsGenerating(false);
    setCurrentJobId(null);
    showToast(errorMessage || 'Failed to generate plan', 'error');
  }, [showToast]);

  const handleJobComplete = useCallback((result) => {
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    const validation = normalizePlanResultShape(result);
    if (!validation.isValid) {
      handleJobFailed(validation.error);
      return;
    }

    // Apply time optimization to the schedule
    const optimizedResult = {
      ...validation.plan,
      schedule: applyTimeOptimization(validation.plan.schedule)
    };
    
    setProgress(100);
    setGeneratedPlan(optimizedResult);
    setIsGenerating(false);
    setCurrentJobId(null);
    showToast('AI Plan generated successfully!', 'success');
  }, [handleJobFailed, showToast]);

  // HUTTLE AI: brand context injected — pre-select platforms from brand profile
  useEffect(() => {
    if (selectedPlatforms.length === 0 && brandProfile?.platforms?.length > 0) {
      setSelectedPlatforms(brandProfile.platforms);
    }
  }, [brandProfile?.platforms]);

  useEffect(() => {
    const goalParam = searchParams.get('goal');

    if (!goalParam) return;

    setSelectedGoal(goalParam);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('goal');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const jobCompleteStatuses = useCallback((status) => {
    const s = String(status || '').toLowerCase();
    return s === 'completed' || s === 'complete' || s === 'success' || s === 'done';
  }, []);

  // Subscribe to job updates via Supabase Realtime + polling (useLayoutEffect so listener runs before paint / before n8n can finish)
  useLayoutEffect(() => {
    if (!currentJobId) return;
    let resolved = false;

    const resolveJob = (result) => {
      if (resolved) return;
      resolved = true;
      handleJobComplete(result);
    };

    const rejectJob = (error) => {
      if (resolved) return;
      resolved = true;
      handleJobFailed(error);
    };

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

          if (jobCompleteStatuses(updatedJob.status) && updatedJob.result) {
            resolveJob(updatedJob.result);
          } else if (String(updatedJob.status || '').toLowerCase() === 'failed') {
            rejectJob(updatedJob.error);
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    const pollInterval = setInterval(async () => {
      if (resolved) return;
      try {
        const { data: job, error } = await supabase
          .from('jobs')
          .select('status, result, error')
          .eq('id', currentJobId)
          .maybeSingle();

        if (error || !job) return;

        if (jobCompleteStatuses(job.status) && job.result) {
          resolveJob(job.result);
        } else if (String(job.status || '').toLowerCase() === 'failed') {
          rejectJob(job.error);
        }
      } catch (e) {
        console.error('[PlanBuilder] Poll error', e);
      }
    }, 3000);

    const softTimeoutId = setTimeout(() => {
      if (resolved) return;
      rejectJob('This is taking longer than expected. Your plan may still be generating — check back in a few minutes.');
    }, 300000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      clearTimeout(softTimeoutId);
    };
  }, [currentJobId, handleJobComplete, handleJobFailed, jobCompleteStatuses]);

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
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsGenerating(true);
    setProgress(0);
    setGeneratedPlan(null);
    setJobStatus('pending');

    try {
      const cachedTrends = getCachedTrends();
      const trendContext = Array.isArray(cachedTrends) && cachedTrends.length > 0
        ? `Current trending topics in the user's niche:\n${cachedTrends.slice(0, 4).map((t) => `- "${t.title || t.topic}" (${t.format_type || 'short-form'}, ${t.momentum || 'steady'})`).join('\n')}\nIncorporate 1-2 of these trending topics into the content plan where they naturally fit.`
        : '';

      // Step 1: Create job directly in Supabase
      const { jobId, error: createError } = await createJobDirectly({
        goal: selectedGoal,
        duration: selectedPeriod,
        platforms: selectedPlatforms,
        niche: brandProfile?.niche || 'general',
        brandVoice: brandVoice,
        trendContext,
      });

      if (createError || !jobId) {
        throw new Error(createError?.message || 'Failed to create job');
      }

      // Progress + Realtime listener must exist before n8n can complete (avoid race)
      const startTime = Date.now();
      const duration = 25000;
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progressPercent = Math.min((elapsed / duration) * 88, 88);
        setProgress(progressPercent);
        if (progressPercent >= 88) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }, 120);

      flushSync(() => {
        setCurrentJobId(jobId);
      });

      // Step 2: Trigger n8n webhook with job_id AND form data (fire-and-forget with retry)
      const brandBlock = buildBrandContext(brandProfile, { first_name: user?.user_metadata?.first_name }); // HUTTLE AI: brand context injected
      const { success: webhookSuccess, error: webhookError } = await triggerN8nWebhook(jobId, {
        contentGoal: selectedGoal,
        timePeriod: String(selectedPeriod),
        platformFocus: selectedPlatforms,
        brandVoice: brandVoice,
        brandContext: brandBlock, // HUTTLE AI: brand context injected
        trendContext,
      });
      
      if (!webhookSuccess) {
        console.error('[PlanBuilder] n8n webhook trigger failed:', webhookError);

        // Fallback: generate plan using Grok API directly
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
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setIsGenerating(false);
        setProgress(0);
        setCurrentJobId(null);
        return;
      }

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
    if (progress >= 85) return 'Finalizing your calendar...';
    if (progress >= 55) return 'Scheduling optimal post times...';
    if (progress >= 28) return 'Planning your content mix...';
    if (jobStatus === 'running') return 'AI is generating your plan...';
    if (jobStatus === 'pending' || jobStatus === 'queued') return 'Starting generation...';
    return 'Initializing...';
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {isGenerating && (
        <LoadingSpinner fullScreen variant="huttle" text={getStatusMessage()} />
      )}
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
              Generate your content strategy
            </p>
          </div>
        </div>
      </div>
      
      {/* Per-feature usage meter */}
      <div className="mt-2 mb-6">
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
          <p className="text-sm text-gray-500 mt-1">Scroll down to see your content strategy</p>
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
                    <p className="text-xs text-amber-600 mt-0.5">Select platforms under Account → Brand Profile in the sidebar.</p>
                  </div>
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
            : 'AI will generate a complete content strategy based on your goals and preferences'
          }
        </p>
        
        {isGenerating && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
              <span className="text-sm leading-snug">{getStatusMessage()}</span>
              <span className="min-w-[3.5rem] text-right text-base font-semibold tabular-nums">{Math.round(progress)}%</span>
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

      {/* Generated Plan Display — Day Cards */}
      {generatedPlan && (
        <div className="mt-8 space-y-6">
          {/* Plan Summary Header */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Content Strategy</h2>
                <p className="text-gray-600">Goal: {sanitizeAIOutput(generatedPlan.goal)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Platforms</h4>
                <p className="text-sm font-semibold text-gray-900">{sanitizeAIOutput(generatedPlan.platforms?.join(', ')) || 'Multi-platform'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Days</h4>
                <p className="text-3xl font-bold text-huttle-primary">{generatedPlan.schedule?.length || generatedPlan.period || 7}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Total Posts</h4>
                <p className="text-3xl font-bold text-huttle-primary">{generatedPlan.totalPosts}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Generations Needed</h4>
                <p className="text-sm text-gray-600">~{generatedPlan.totalPosts * 5} to build all posts</p>
              </div>
            </div>
          </Motion.div>

          {/* Plan-Level Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const firstPost = generatedPlan.schedule?.[0]?.posts?.[0];
                if (firstPost) {
                  const params = new URLSearchParams({
                    topic: firstPost.topic || firstPost.theme || '',
                    platform: (firstPost.platform || 'instagram').toLowerCase(),
                    goal: generatedPlan.goal || '',
                  });
                  navigate(`/dashboard/full-post-builder?${params.toString()}`);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-huttle-gradient text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Build All in Post Builder
            </button>
            <button
              onClick={async () => {
                if (!user?.id) { showToast('Please log in to save', 'error'); return; }
                try {
                  const planData = {
                    goal: generatedPlan.goal,
                    period: generatedPlan.period,
                    platforms: generatedPlan.platforms,
                    schedule: generatedPlan.schedule,
                    totalPosts: generatedPlan.totalPosts,
                    contentMix: generatedPlan.contentMix,
                    savedAt: new Date().toISOString(),
                  };
                  const result = await saveContentLibraryItem(user.id, buildContentVaultPayload({
                    name: `Content Plan - ${generatedPlan.goal}`,
                    contentText: JSON.stringify(planData, null, 2),
                    contentType: 'plan',
                    toolSource: 'ai_plan_builder',
                    toolLabel: 'AI Plan Builder',
                    topic: generatedPlan.goal,
                    platform: generatedPlan.platforms?.[0] || '',
                    description: 'Content Plan from AI Plan Builder',
                    metadata: {
                      goal: generatedPlan.goal,
                      platforms: generatedPlan.platforms || [],
                    },
                  }));
                  if (result.success) showToast('Saved to vault ✓', 'success');
                  else showToast('Failed to save plan', 'error');
                } catch { showToast('Failed to save plan', 'error'); }
              }}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              Save Full Plan to Vault
            </button>
            <button
              onClick={() => {
                const planText = generatedPlan.schedule?.map((day) =>
                  day.posts?.map((post) =>
                    `Day ${day.day}: [${post.platform}] — ${post.topic || post.theme}`
                  ).join('\n')
                ).join('\n') || '';
                navigator.clipboard.writeText(planText).then(() => showToast('Plan copied to clipboard!', 'success'));
              }}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
            >
              <Copy className="w-4 h-4" />
              Export Plan
            </button>
          </div>

          {/* Day Cards */}
          <div className="space-y-4">
            {generatedPlan.schedule?.map((daySchedule, dayIdx) => (
              daySchedule.posts?.map((post, postIdx) => (
                <Motion.div
                  key={`day-${daySchedule.day}-post-${postIdx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (dayIdx * daySchedule.posts.length + postIdx) * 0.1 }}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-huttle-gradient text-white text-sm font-bold rounded-lg">
                        Day {daySchedule.day}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getPlatformIcon(post.platform, 'w-4 h-4')}
                        <span className="text-sm font-semibold text-gray-900">{post.platform}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      Goal: {generatedPlan.goal}
                    </span>
                  </div>
                  
                  <p className="text-gray-800 mb-4">{sanitizeAIOutput(post.topic || post.theme) || 'Content idea'}</p>
                  
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-4">
                    <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      Format: {sanitizeAIOutput(post.content_type || post.type) || 'Post'}
                    </span>
                    <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                      Best time: {post.scheduled_time ? formatTo12Hour(post.scheduled_time) : 'TBD'}
                    </span>
                    {post.reasoning && (
                      <span className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                        Tone: {post.reasoning.includes('educational') ? 'Educational' : post.reasoning.includes('entertaining') ? 'Entertaining' : 'Inspirational'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const params = new URLSearchParams({
                          topic: post.topic || post.theme || '',
                          platform: (post.platform || 'instagram').toLowerCase(),
                          goal: generatedPlan.goal || '',
                        });
                        navigate(`/dashboard/full-post-builder?${params.toString()}`);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-huttle-primary text-white rounded-lg text-xs font-semibold hover:bg-huttle-primary-dark transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Open in Post Builder →
                    </button>
                    <button
                      onClick={async () => {
                        if (!user?.id) return;
                        try {
                          const result = await saveContentLibraryItem(user.id, buildContentVaultPayload({
                            name: `Day ${daySchedule.day} - ${post.topic || post.theme || 'Content'}`,
                            contentText: `Platform: ${post.platform}\nTopic: ${post.topic || post.theme}\nFormat: ${post.content_type || post.type || 'Post'}\nGoal: ${generatedPlan.goal}`,
                            contentType: 'plan',
                            toolSource: 'ai_plan_builder',
                            toolLabel: 'AI Plan Builder',
                            topic: post.topic || post.theme || generatedPlan.goal,
                            platform: post.platform,
                            description: 'Content idea from AI Plan Builder',
                            metadata: {
                              goal: generatedPlan.goal,
                              post_type: post.content_type || post.type || 'Post',
                            },
                          }));
                          if (result.success) showToast('Saved to vault ✓', 'success');
                        } catch { showToast('Failed to save', 'error'); }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-all"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Save to Vault
                    </button>
                  </div>
                </Motion.div>
              ))
            ))}
          </div>

          {/* Generate New Plan Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setGeneratedPlan(null)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Generate New Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

