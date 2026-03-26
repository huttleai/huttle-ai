import { useState, useEffect, useLayoutEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  Wand2,
  Target,
  Calendar,
  TrendingUp,
  Sparkles,
  CheckCircle,
  Loader,
  History,
  Mic2,
  AlertTriangle,
  Copy,
  FolderPlus,
  Pencil,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useBrand } from '../context/BrandContext';
import { createJobDirectly, triggerN8nWebhook } from '../services/planBuilderAPI';
import { supabase } from '../config/supabase';
import { saveToVault } from '../services/contentService';
import { AuthContext } from '../context/AuthContext';
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  TwitterXIcon,
  YouTubeIcon,
  getPlatformIcon,
  normalizePlatformLabelForIcon,
} from '../components/SocialIcons';
import useAIUsage from '../hooks/useAIUsage';
import AIUsageMeter from '../components/AIUsageMeter';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildContentVaultPayload } from '../utils/contentVault';
import { buildBrandContext } from '../utils/buildBrandContext';
import { sanitizeAIOutput } from '../utils/textHelpers';
import { getCachedTrends } from '../services/dashboardCacheService';
import LoadingSpinner from '../components/LoadingSpinner';
import { parsePlanBuilderDisplayResult } from '../utils/planBuilderJobResult';
import {
  PLATFORM_CONTENT_RULES,
  getPlatformPromptRule,
  getHashtagConstraint,
  normalizePlatformRulesKey,
} from '../data/platformContentRules';

const CONTENT_GOALS = [
  'Grow followers',
  'Drive traffic',
  'Generate leads',
  'Increase sales',
  'Build brand awareness',
];

const FOLLOWER_RANGE_OPTIONS = [
  { value: '0-500', label: 'Just starting (0–500)' },
  { value: '500-5K', label: 'Growing (500–5K)' },
  { value: '5K-50K', label: 'Established (5K–50K)' },
  { value: '50K+', label: 'Large (50K+)' },
];

const PLAN_BUILDER_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: InstagramIcon },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon },
  { id: 'youtube', name: 'YouTube', icon: YouTubeIcon },
  { id: 'x', name: 'X', displayName: 'X (Twitter)', icon: TwitterXIcon },
  { id: 'facebook', name: 'Facebook', icon: FacebookIcon },
];

const PLAN_BUILDER_PLATFORM_NAMES = new Set(PLAN_BUILDER_PLATFORMS.map((p) => p.name));

const PLATFORM_CARD_BORDER = {
  Instagram: '#E1306C',
  TikTok: '#01BAD2',
  YouTube: '#FF0000',
  X: '#14171A',
  Facebook: '#1877F2',
};

function getContentMixRecommendation(goal) {
  const g = String(goal || '').trim();
  if (g === 'Grow followers') return '50% Educational / 30% Entertaining / 20% Authority';
  if (g === 'Drive traffic') return '40% Educational / 30% Promotional / 30% Entertaining';
  if (g === 'Generate leads') return '40% Problem-Solution / 30% Social Proof / 30% Educational';
  if (g === 'Increase sales') {
    return '40% Problem-Solution / 30% Social Proof / 20% Educational / 10% Direct Offer';
  }
  if (g === 'Build brand awareness') return '40% Personal/BTS / 35% Authority / 25% Educational';
  return 'Balanced mix tailored to your goal';
}

const BEST_TIMES_BY_PLATFORM = {
  TikTok: '7:00 AM, 12:00 PM, 7:00 PM',
  Instagram: '9:00 AM, 12:00 PM, 5:00 PM',
  X: '8:00 AM, 12:00 PM, 5:00 PM',
  YouTube: '2:00 PM, 5:00 PM',
  Facebook: '9:00 AM, 1:00 PM, 4:00 PM',
};

function primaryPlatformForTimes(selectedNames) {
  const first = selectedNames?.[0];
  if (!first) return 'Instagram';
  return normalizePlatformLabelForIcon(first) || first;
}

function weeklyPostCountLabel(mode, customVal) {
  if (mode === 'custom') return `${customVal} posts per week`;
  return `${mode} posts per week`;
}

function isTwitterLikePlatform(name) {
  const n = normalizePlatformLabelForIcon(name);
  return n === 'X';
}

function buildV2PlanPlainText(plan) {
  const o = plan?.overview || {};
  const lines = [];
  lines.push('CONTENT PLAN');
  lines.push('');
  lines.push(`Goal: ${o.goal || ''}`);
  lines.push(`Duration: ${o.duration || ''}`);
  lines.push(`Platforms: ${(o.platforms || []).join(', ')}`);
  lines.push(`Strategy: ${o.strategy || ''}`);
  if (o.strategy_notes) {
    lines.push('');
    lines.push('Strategy notes:');
    lines.push(o.strategy_notes);
  }
  if (o.postFrequency) lines.push(`Post frequency: ${o.postFrequency}`);
  if (o.contentMix && typeof o.contentMix === 'object') {
    lines.push(`Content mix: ${JSON.stringify(o.contentMix)}`);
  }
  const tips = plan?.weeklyTips || [];
  if (tips.length) {
    lines.push('');
    lines.push('Weekly tips:');
    tips.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }
  const days = plan?.days || [];
  days.forEach((d) => {
    lines.push('');
    lines.push(`— ${d.date || `Day ${d.day}`} —`);
    lines.push(`Theme: ${d.theme || ''}`);
    (d.posts || []).forEach((p, idx) => {
      lines.push(`  Post ${idx + 1} [${p.platform || ''}] ${p.format || ''} @ ${p.postTime || ''}`);
      lines.push(`  Pillar: ${p.pillar || ''}`);
      lines.push(`  Topic: ${p.topic || ''}`);
      lines.push(`  Hook: ${p.hook || ''}`);
      if (p.caption) {
        lines.push('  Caption:');
        lines.push(String(p.caption).split('\n').map((ln) => `    ${ln}`).join('\n'));
      }
      if (Array.isArray(p.hashtags) && p.hashtags.length && !isTwitterLikePlatform(p.platform)) {
        lines.push(`  Hashtags: ${p.hashtags.join(' ')}`);
      }
      if (p.why_this_works) lines.push(`  Why this works: ${p.why_this_works}`);
      if (p.notes) lines.push(`  Notes: ${p.notes}`);
    });
  });
  return lines.join('\n');
}

function CollapsibleBlock({
  title,
  defaultOpen = true,
  children,
  headerRight = null,
  hide = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (hide) return null;
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50/50">
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 bg-gray-50/80">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between gap-2 text-left min-w-0 hover:text-huttle-primary-dark"
        >
          <span>{title}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
        </button>
        {headerRight ? <div className="shrink-0 flex items-center">{headerRight}</div> : null}
      </div>
      {open && <div className="px-3 pb-3 pt-2 text-sm text-gray-700">{children}</div>}
    </div>
  );
}

/**
 * AI Plan Builder — async job + Supabase Realtime (unchanged flow).
 */
export default function AIPlanBuilder() {
  const { showToast } = useToast();
  const { brandProfile, brandFetchComplete } = useBrand();
  const planUsage = useAIUsage('planBuilder');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);

  const [selectedGoal, setSelectedGoal] = useState(CONTENT_GOALS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [postingFreqMode, setPostingFreqMode] = useState('5');
  const [postingFreqCustom, setPostingFreqCustom] = useState(5);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [nicheInput, setNicheInput] = useState('');
  const [targetAudienceInput, setTargetAudienceInput] = useState('');
  const [brandVoiceToneInput, setBrandVoiceToneInput] = useState('');
  const [contentPillars, setContentPillars] = useState([]);
  const [pillarDraft, setPillarDraft] = useState('');
  const [followerRange, setFollowerRange] = useState('0-500');
  const [extraContext, setExtraContext] = useState('');
  const [optionalOpen, setOptionalOpen] = useState(false);

  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  const progressIntervalRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  const resolvedPostingFrequency = useMemo(() => {
    if (postingFreqMode === 'custom') {
      return Math.min(14, Math.max(1, Number(postingFreqCustom) || 1));
    }
    return Number(postingFreqMode) || 5;
  }, [postingFreqMode, postingFreqCustom]);

  useEffect(() => {
    if (!brandFetchComplete) return;
    setNicheInput((prev) => (prev.trim() ? prev : (brandProfile?.niche || '')));
    setTargetAudienceInput((prev) => (prev.trim() ? prev : (brandProfile?.targetAudience ? String(brandProfile.targetAudience) : '')));
    const tone = [brandProfile?.brandVoice, ...(brandProfile?.toneChips || [])].filter(Boolean).join(', ');
    setBrandVoiceToneInput((prev) => (prev.trim() ? prev : tone));
  }, [brandFetchComplete, brandProfile]);

  useEffect(() => {
    if (selectedPlatforms.length > 0) return;
    const fromBrand = brandProfile?.platforms?.length > 0 ? brandProfile.platforms : [];
    if (fromBrand.length) {
      const mapped = fromBrand
        .map((p) => normalizePlatformLabelForIcon(p) || p)
        .filter(Boolean)
        .filter((n) => PLAN_BUILDER_PLATFORM_NAMES.has(n));
      if (mapped.length) setSelectedPlatforms(Array.from(new Set(mapped)));
    }
  }, [brandProfile?.platforms, selectedPlatforms.length]);

  useEffect(() => {
    if (!brandFetchComplete) return;
    setSelectedPlatforms((prev) => {
      const next = [
        ...new Set(
          prev
            .map((n) => normalizePlatformLabelForIcon(n) || n)
            .filter((n) => PLAN_BUILDER_PLATFORM_NAMES.has(n))
        ),
      ];
      if (next.length === prev.length && next.every((v, i) => v === (normalizePlatformLabelForIcon(prev[i]) || prev[i]))) {
        return prev;
      }
      return next;
    });
  }, [brandFetchComplete]);

  useEffect(() => {
    const goalParam = searchParams.get('goal');
    if (!goalParam) return;
    if (CONTENT_GOALS.includes(goalParam)) setSelectedGoal(goalParam);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('goal');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

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
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const parsed = parsePlanBuilderDisplayResult(result);
    if (parsed.kind === 'fallback' && (!parsed.rawText || parsed.rawText === 'No plan content returned.')) {
      console.warn('[PlanBuilder] Empty fallback body');
    }

    setProgress(100);
    setGeneratedPlan(parsed);
    setIsGenerating(false);
    setCurrentJobId(null);
    showToast(parsed.kind === 'v2' ? 'AI Plan generated successfully!' : 'Plan ready — review below.', 'success');
  }, [showToast]);

  const jobCompleteStatuses = useCallback((status) => {
    const s = String(status || '').toLowerCase();
    return s === 'completed' || s === 'complete' || s === 'success' || s === 'done';
  }, []);

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
          filter: `id=eq.${currentJobId}`,
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

  const handlePlatformToggle = (platformName) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformName) ? prev.filter((p) => p !== platformName) : [...prev, platformName]
    );
  };

  const addPillar = () => {
    const t = pillarDraft.trim();
    if (!t) return;
    if (contentPillars.length >= 5) {
      showToast('Maximum 5 content pillars', 'warning');
      return;
    }
    if (contentPillars.some((p) => p.toLowerCase() === t.toLowerCase())) {
      setPillarDraft('');
      return;
    }
    setContentPillars((p) => [...p, t]);
    setPillarDraft('');
  };

  const removePillar = (idx) => {
    setContentPillars((p) => p.filter((_, i) => i !== idx));
  };

  const recommendationsActive =
    Boolean(selectedGoal) && nicheInput.trim().length > 0 && selectedPlatforms.length > 0;

  const primaryPlat = primaryPlatformForTimes(selectedPlatforms);
  const bestTimesLine = BEST_TIMES_BY_PLATFORM[primaryPlat] || BEST_TIMES_BY_PLATFORM.Instagram;

  const resetToForm = () => {
    setGeneratedPlan(null);
    setProgress(0);
  };

  const handleGeneratePlan = async () => {
    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }
    if (contentPillars.length < 1) {
      showToast('Add at least one content pillar', 'error');
      return;
    }

    if (!planUsage.canGenerate) {
      showToast("You've reached your monthly Plan Builder limit. Resets on the 1st.", 'warning');
      return;
    }

    await planUsage.trackFeatureUsage({ platforms: selectedPlatforms, goal: selectedGoal });

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
      const trendContext =
        Array.isArray(cachedTrends) && cachedTrends.length > 0
          ? `Current trending topics in the user's niche:\n${cachedTrends.slice(0, 4).map((t) => `- "${t.title || t.topic}" (${t.format_type || 'short-form'}, ${t.momentum || 'steady'})`).join('\n')}\nIncorporate 1-2 of these trending topics into the content plan where they naturally fit.`
          : '';

      const platformsArray = [
        ...new Set(
          selectedPlatforms
            .map((n) => normalizePlatformLabelForIcon(n) || n)
            .filter((n) => PLAN_BUILDER_PLATFORM_NAMES.has(n))
        ),
      ];

      const platformRulesBlock = platformsArray
        .map((p) => {
          const key = normalizePlatformRulesKey(p);
          const rules = PLATFORM_CONTENT_RULES[key] || PLATFORM_CONTENT_RULES.instagram;
          return [
            `--- ${rules.displayName} ---`,
            getPlatformPromptRule(key),
            `Posting frequency: ${rules.postingFrequency ?? 'Match cadence to your plan period and platform norms'}`,
            `Hashtags per post: ${getHashtagConstraint(key)}`,
          ].join('\n');
        })
        .join('\n\n');

      const { jobId, error: createError } = await createJobDirectly({
        contentGoal: selectedGoal,
        timePeriod: selectedPeriod,
        postingFrequency: resolvedPostingFrequency,
        platformFocus: platformsArray,
        niche: nicheInput.trim() || brandProfile?.niche || 'general',
        targetAudience: targetAudienceInput.trim(),
        brandVoiceTone: brandVoiceToneInput.trim(),
        contentPillars,
        followerRange,
        extraContext: extraContext.trim() || null,
        trendContext,
        platform_rules_block: platformRulesBlock,
      });

      if (createError || !jobId) {
        throw new Error(createError?.message || 'Failed to create job');
      }

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

      const brandBlock = buildBrandContext(brandProfile, { first_name: user?.user_metadata?.first_name });
      const { success: webhookSuccess, error: webhookError } = await triggerN8nWebhook(jobId, {
        contentGoal: selectedGoal,
        timePeriod: String(selectedPeriod),
        postingFrequency: resolvedPostingFrequency,
        platformFocus: platformsArray,
        niche: nicheInput.trim() || brandProfile?.niche || 'general',
        targetAudience: targetAudienceInput.trim(),
        brandVoiceTone: brandVoiceToneInput.trim(),
        contentPillars,
        followerRange,
        extraContext: extraContext.trim() || null,
        brandVoice: brandVoiceToneInput.trim(),
        brandContext: brandBlock,
        trendContext,
        platform_rules_block: platformRulesBlock,
        platforms_list: platformsArray.join(', '),
      });

      if (!webhookSuccess) {
        console.error('[PlanBuilder] n8n webhook trigger failed:', webhookError);
        try {
          const { generateContentPlan } = await import('../services/grokAPI');
          const grokResult = await generateContentPlan(
            `${selectedGoal} on ${platformsArray.join(', ')}. Brand voice: ${brandVoiceToneInput || 'engaging'}`,
            brandProfile,
            selectedPeriod,
            { platformRulesBlock }
          );

          if (grokResult.success && grokResult.plan) {
            const planText = grokResult.plan;
            const fallbackResult = {
              rawPlan: planText,
              goal: selectedGoal,
              period: selectedPeriod,
              platforms: platformsArray,
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

      <div className="mt-2 mb-6">
        <AIUsageMeter
          used={planUsage.featureUsed}
          limit={planUsage.featureLimit}
          label="Plans this month"
          compact
        />
      </div>

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
        <div className="card p-5 md:p-6 space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-huttle-primary" />
              Section 1 — Your Goal
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Goal</label>
                <select
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary focus:border-transparent outline-none"
                >
                  {CONTENT_GOALS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <div className="flex gap-2">
                  <button
                    type="button"
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
                    type="button"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Posting Frequency</label>
                <p className="text-xs text-gray-500 mb-2">How many posts per week?</p>
                <div className="flex flex-wrap gap-2">
                  {['3', '5', '7'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPostingFreqMode(m)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        postingFreqMode === m
                          ? 'border-huttle-primary bg-huttle-primary text-white'
                          : 'border-gray-300 text-gray-700 hover:border-huttle-primary'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPostingFreqMode('custom')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      postingFreqMode === 'custom'
                        ? 'border-huttle-primary bg-huttle-primary text-white'
                        : 'border-gray-300 text-gray-700 hover:border-huttle-primary'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {postingFreqMode === 'custom' && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={postingFreqCustom}
                      onChange={(e) => setPostingFreqCustom(Number(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <span className="text-sm text-gray-600">posts per week (1–14)</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mic2 className="w-5 h-5 text-huttle-primary" />
              Section 2 — Your Brand
            </h2>
            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <Pencil className="w-3.5 h-3.5" />
              From your Brand Profile — edit anytime
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niche / Industry</label>
                <input
                  type="text"
                  value={nicheInput}
                  onChange={(e) => setNicheInput(e.target.value)}
                  placeholder="e.g. Fitness coaching, SaaS, local bakery"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={targetAudienceInput}
                  onChange={(e) => setTargetAudienceInput(e.target.value)}
                  placeholder="Who you create content for"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Voice Tone</label>
                <input
                  type="text"
                  value={brandVoiceToneInput}
                  onChange={(e) => setBrandVoiceToneInput(e.target.value)}
                  placeholder="e.g. Warm, direct, expert-but-friendly"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary outline-none"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Section 3 — Platform Focus</h2>
            <div className="flex flex-wrap gap-2">
              {PLAN_BUILDER_PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const name = platform.name;
                const isSelected = selectedPlatforms.includes(name);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformToggle(name)}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm transition-all ${
                      isSelected
                        ? 'border-huttle-primary bg-huttle-primary text-white'
                        : 'border-gray-300 hover:border-huttle-primary hover:text-huttle-primary'
                    }`}
                  >
                    <span className={isSelected ? 'brightness-0 invert' : ''}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {platform.displayName || name}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 4 — Content Pillars</h2>
            <p className="text-xs text-gray-500 mb-3">
              3–5 themes you post about (min 1, max 5). Examples: Before &amp; after transformations, Client Q&amp;A,
              Behind the scenes
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={pillarDraft}
                onChange={(e) => setPillarDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPillar())}
                placeholder="Add a pillar..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-huttle-primary outline-none"
              />
              <button
                type="button"
                onClick={addPillar}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Add Pillar
              </button>
            </div>
            {contentPillars.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {contentPillars.map((p, i) => (
                  <span
                    key={`${p}-${i}`}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-cyan-50 text-cyan-900 text-sm border border-cyan-100"
                  >
                    {p}
                    <button
                      type="button"
                      className="p-1 rounded-full hover:bg-cyan-100 text-cyan-700"
                      onClick={() => removePillar(i)}
                      aria-label={`Remove ${p}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Section 5 — Follower Range</h2>
            <select
              value={followerRange}
              onChange={(e) => setFollowerRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary outline-none"
            >
              {FOLLOWER_RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section>
            <button
              type="button"
              onClick={() => setOptionalOpen(!optionalOpen)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2"
            >
              Section 6 — Optional Context
              {optionalOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {optionalOpen && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anything else AI should know? (optional)
                </label>
                <textarea
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  placeholder="e.g. Running a spring promo in 2 weeks, short-form video performs best for us, avoid overly salesy tone"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-huttle-primary outline-none text-sm"
                />
              </div>
            )}
          </section>
        </div>

        <div className="bg-gradient-to-br from-huttle-50/50 to-cyan-50/50 rounded-xl border border-huttle-primary/20 p-5 md:p-6 h-fit lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-huttle-primary" />
            AI Recommendations
          </h2>
          {!recommendationsActive ? (
            <p className="text-sm text-gray-600 bg-white/80 rounded-lg p-4 border border-gray-200">
              Fill in your goal and niche to see AI recommendations.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-huttle-primary" />
                  <span className="font-semibold text-sm">Post Frequency</span>
                </div>
                <p className="text-xs text-gray-600">
                  {weeklyPostCountLabel(postingFreqMode, resolvedPostingFrequency)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-sm">Content Mix</span>
                </div>
                <p className="text-xs text-gray-600">{getContentMixRecommendation(selectedGoal)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold text-sm">Best Times</span>
                </div>
                <p className="text-xs text-gray-600">
                  {primaryPlat}: {bestTimesLine}
                </p>
              </div>
            </div>
          )}
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
            : 'AI will generate a complete content strategy based on your goals and preferences'}
        </p>

        {isGenerating && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
              <span className="text-sm leading-snug">{getStatusMessage()}</span>
              <span className="min-w-[3.5rem] text-right text-base font-semibold tabular-nums">
                {Math.round(progress)}%
              </span>
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
          type="button"
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="px-6 md:px-8 py-2.5 md:py-3 bg-huttle-gradient hover:bg-huttle-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-md"
        >
          {isGenerating ? 'Generating...' : 'Generate AI Plan'}
        </button>
      </div>

      {generatedPlan?.kind === 'fallback' && (
        <Motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6"
        >
          <div className="flex gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Plan received (classic format)</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your plan was generated but can&apos;t display in the new format. Here&apos;s what we received:
              </p>
            </div>
          </div>
          <pre className="max-h-96 overflow-auto text-xs bg-white border border-amber-100 rounded-lg p-4 whitespace-pre-wrap font-mono text-gray-800">
            {generatedPlan.rawText}
          </pre>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(generatedPlan.rawText).then(() => showToast('Copied', 'success'))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={resetToForm}
              className="px-4 py-2 bg-huttle-primary text-white rounded-lg text-sm font-medium"
            >
              Start Over
            </button>
          </div>
        </Motion.div>
      )}

      {generatedPlan?.kind === 'v2' && (() => {
        const plan = generatedPlan.plan;
        const overview = plan?.overview || {};
        const mix = overview.contentMix && typeof overview.contentMix === 'object' ? overview.contentMix : {};
        const mixEntries = [
          ['educational', mix.educational, 'bg-cyan-500'],
          ['entertaining', mix.entertaining, 'bg-purple-500'],
          ['promotional', mix.promotional, 'bg-orange-500'],
          ['personal', mix.personal, 'bg-teal-500'],
        ].filter(([, val]) => Number(val) > 0);
        const mixTotal = mixEntries.reduce((s, [, n]) => s + Number(n), 0) || 1;

        const exportText = buildV2PlanPlainText(plan);
        let cardAnimIndex = 0;

        return (
          <div className="mt-8 space-y-6">
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-gray-100 bg-gradient-to-br from-slate-50 to-white">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Strategy</h2>
                <p className="text-gray-800 leading-relaxed">{sanitizeAIOutput(overview.strategy || '')}</p>
                {overview.strategy_notes ? (
                  <div className="mt-4 text-sm text-gray-600 bg-gray-50 border-l-4 border-gray-200 pl-4 py-2 rounded-r">
                    {sanitizeAIOutput(overview.strategy_notes)}
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {overview.postFrequency ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-huttle-primary/10 text-huttle-primary-dark border border-huttle-primary/20">
                      {overview.postFrequency}
                    </span>
                  ) : null}
                  <span className="text-xs text-gray-500">
                    Goal: {sanitizeAIOutput(overview.goal || '')} · {sanitizeAIOutput(overview.duration || '')}
                  </span>
                </div>
                {mixEntries.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Content mix</p>
                    <div className="flex h-3 rounded-full overflow-hidden w-full max-w-xl">
                      {mixEntries.map(([key, val, colorClass]) => (
                        <div
                          key={key}
                          className={`${colorClass} h-full`}
                          style={{ width: `${(Number(val) / mixTotal) * 100}%` }}
                          title={`${key}: ${val}%`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                      {mixEntries.map(([key, val, colorClass]) => (
                        <span key={key} className="inline-flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                          {key} {val}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(exportText).then(() => showToast('Plan copied', 'success'))}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-huttle-gradient text-white rounded-lg text-sm font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    Export Plan
                  </button>
                  <button
                    type="button"
                    onClick={resetToForm}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </Motion.div>

            {Array.isArray(plan.weeklyTips) && plan.weeklyTips.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plan.weeklyTips.map((tip, idx) => (
                  <Motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white border border-amber-100 rounded-xl p-4 flex gap-3 shadow-sm"
                  >
                    <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-800">{sanitizeAIOutput(tip)}</p>
                  </Motion.div>
                ))}
              </div>
            )}

            {(plan.days || []).map((day) => (
              <section key={day.day} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-huttle-primary text-white text-sm font-bold">
                    {day.day}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{sanitizeAIOutput(day.date || `Day ${day.day}`)}</p>
                    {day.theme ? (
                      <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {sanitizeAIOutput(day.theme)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {(day.posts || []).map((post) => {
                  const platLabel = normalizePlatformLabelForIcon(post.platform) || post.platform || '';
                  const borderC = PLATFORM_CARD_BORDER[platLabel] || '#64748b';
                  const cardDelay = cardAnimIndex * 0.05;
                  cardAnimIndex += 1;
                  const hideTags = isTwitterLikePlatform(post.platform);
                  const hookQ = encodeURIComponent(post.hook || '');
                  const topicQ = encodeURIComponent(post.topic || '');
                  const capQ = encodeURIComponent(post.caption || '');
                  const platQ = encodeURIComponent(String(post.platform || '').toLowerCase());

                  return (
                    <Motion.div
                      key={`${day.day}-${post.topic}-${post.platform}-${cardDelay}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: cardDelay }}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                      style={{ borderLeftWidth: 4, borderLeftColor: borderC }}
                    >
                      <div className="p-4 md:p-5 space-y-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            {getPlatformIcon(post.platform, 'w-4 h-4')}
                            {platLabel}
                          </span>
                          {post.format ? (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                              {sanitizeAIOutput(post.format)}
                            </span>
                          ) : null}
                          {post.contentType ? (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 font-medium border border-violet-100">
                              {sanitizeAIOutput(post.contentType)}
                            </span>
                          ) : null}
                          {post.postTime ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <Clock className="w-3.5 h-3.5" />
                              {sanitizeAIOutput(post.postTime)}
                            </span>
                          ) : null}
                          {post.pillar ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-100">
                              {sanitizeAIOutput(post.pillar)}
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hook</p>
                          <blockquote className="border-l-4 border-cyan-500 bg-cyan-50/60 pl-4 py-3 rounded-r-lg text-base font-bold text-gray-900 leading-snug">
                            {sanitizeAIOutput(post.hook || '')}
                          </blockquote>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Topic</p>
                          <p className="text-gray-800">{sanitizeAIOutput(post.topic || '')}</p>
                        </div>

                        <CollapsibleBlock
                          title="Caption"
                          defaultOpen
                          headerRight={
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-200"
                              onClick={() =>
                                navigator.clipboard.writeText(post.caption || '').then(() => showToast('Caption copied', 'success'))
                              }
                              aria-label="Copy caption"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          }
                        >
                          <p className="whitespace-pre-wrap text-gray-800">{sanitizeAIOutput(post.caption || '')}</p>
                          <button
                            type="button"
                            className="mt-2 text-xs font-medium text-huttle-primary hover:underline"
                            onClick={() => navigator.clipboard.writeText(post.caption || '').then(() => showToast('Caption copied', 'success'))}
                          >
                            Copy caption
                          </button>
                        </CollapsibleBlock>

                        {!hideTags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                          <CollapsibleBlock
                            title="Hashtags"
                            defaultOpen
                            headerRight={
                              <button
                                type="button"
                                className="text-xs text-huttle-primary font-medium"
                                onClick={() => {
                                  const line = post.hashtags.join(' ');
                                  navigator.clipboard.writeText(line).then(() => showToast('Hashtags copied', 'success'));
                                }}
                              >
                                Copy all
                              </button>
                            }
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {post.hashtags.map((tag) => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </CollapsibleBlock>
                        )}

                        <CollapsibleBlock title="Why This Works" defaultOpen={false}>
                          <p className="text-gray-700 whitespace-pre-wrap">{sanitizeAIOutput(post.why_this_works || '')}</p>
                        </CollapsibleBlock>

                        {post.notes ? (
                          <CollapsibleBlock title="Notes" defaultOpen={false}>
                            <p className="text-gray-700 whitespace-pre-wrap">{sanitizeAIOutput(post.notes)}</p>
                          </CollapsibleBlock>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            navigate(
                              `/dashboard/full-post-builder?hook=${hookQ}&platform=${platQ}&topic=${topicQ}&caption=${capQ}`
                            );
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800"
                        >
                          Build This Post →
                        </button>
                      </div>
                    </Motion.div>
                  );
                })}
              </section>
            ))}

            <div className="flex flex-wrap gap-3 pb-8">
              {user?.id ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const result = await saveToVault(
                        user.id,
                        buildContentVaultPayload({
                          name: `Content Plan - ${overview.goal || selectedGoal}`,
                          contentText: JSON.stringify(plan, null, 2),
                          contentType: 'plan',
                          toolSource: 'ai_plan_builder',
                          toolLabel: 'AI Plan Builder',
                          topic: overview.goal || selectedGoal,
                          platform: (overview.platforms && overview.platforms[0]) || '',
                          description: 'Content Plan from AI Plan Builder',
                          metadata: {
                            goal: overview.goal,
                            platforms: overview.platforms || [],
                          },
                        })
                      );
                      if (result.success) showToast('Saved to vault ✓', 'success');
                      else showToast('Failed to save plan', 'error');
                    } catch (err) {
                      console.error('[AIPlanBuilder] save full plan exception:', err);
                      showToast('Failed to save plan', 'error');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <FolderPlus className="w-4 h-4" />
                  Save Full Plan to Vault
                </button>
              ) : null}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
