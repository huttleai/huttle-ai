import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  Wand2,
  Calendar,
  Loader2,
  Mic2,
  AlertTriangle,
  Copy,
  FolderPlus,
  Pencil,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Clock,
  LayoutGrid,
  List,
  Plus,
  X,
  ChevronRight,
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { useToast } from '../context/ToastContext';
import { useBrand } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { createJobDirectly, triggerN8nWebhook } from '../services/planBuilderAPI';
import { supabase } from '../config/supabase';
import { saveToVault } from '../services/contentService';
import { AuthContext } from '../context/AuthContext';
import {
  InstagramIconMono,
  InstagramIcon,
  FacebookIconMono,
  FacebookIcon,
  TikTokIcon,
  TwitterXIconMono,
  TwitterXIcon,
  YouTubeIconMono,
  YouTubeIcon,
  getPlatformIcon,
  normalizePlatformLabelForIcon,
} from '../components/SocialIcons';
import useAIUsage from '../hooks/useAIUsage';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { buildContentVaultPayload } from '../utils/contentVault';
import { buildBrandContext } from '../utils/buildBrandContext';
import { sanitizeAIOutput } from '../utils/textHelpers';
import { getCachedTrends } from '../services/dashboardCacheService';
import { parsePlanBuilderDisplayResult, normalizeN8nAlternatePlanToV2 } from '../utils/planBuilderJobResult';
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
  { id: 'instagram', name: 'Instagram', icon: InstagramIcon, monoIcon: InstagramIconMono },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, monoIcon: TikTokIcon },
  { id: 'youtube', name: 'YouTube', icon: YouTubeIcon, monoIcon: YouTubeIconMono },
  { id: 'x', name: 'X', displayName: 'X (Twitter)', icon: TwitterXIcon, monoIcon: TwitterXIconMono },
  { id: 'facebook', name: 'Facebook', icon: FacebookIcon, monoIcon: FacebookIconMono },
];

const PLAN_BUILDER_PLATFORM_NAMES = new Set(PLAN_BUILDER_PLATFORMS.map((p) => p.name));

const PLATFORM_CARD_BORDER = {
  Instagram: '#E1306C',
  TikTok: '#01BAD2',
  YouTube: '#FF0000',
  X: '#14171A',
  Facebook: '#1877F2',
};

/** Short hints for summary UI; keys match normalized platform labels */
const BEST_TIMES_BY_PLATFORM = {
  Instagram: 'Weekdays 9–11am & 7–9pm local; weekends late morning often strong.',
  TikTok: 'Evenings 6–10pm and lunch 12–2pm — test against your analytics.',
  YouTube: 'Afternoons 2–4pm weekdays; weekends mid-morning for longer watches.',
  X: 'Weekday mornings 8–10am and lunch; breaking news windows anytime.',
  Facebook: 'Weekday mornings 9am–12pm; early evenings 7–9pm.',
};

const CONTENT_TYPE_BADGE = {
  educational: { label: 'Educational', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  entertaining: { label: 'Entertaining', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  authority: { label: 'Authority', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  promotional: { label: 'Promotional', className: 'bg-rose-100 text-rose-800 border-rose-200' },
  default: { label: 'Post', className: 'bg-gray-100 text-gray-800 border-gray-200' },
};

function contentTypeBadgeProps(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('educat')) return CONTENT_TYPE_BADGE.educational;
  if (s.includes('entertain')) return CONTENT_TYPE_BADGE.entertaining;
  if (s.includes('author')) return CONTENT_TYPE_BADGE.authority;
  if (s.includes('promo')) return CONTENT_TYPE_BADGE.promotional;
  return { ...CONTENT_TYPE_BADGE.default, label: raw ? String(raw).slice(0, 24) : 'Post' };
}

const PILLAR_QUICK_ADD = ['Educational tips', 'Behind the scenes', 'Client results'];

/** Supabase `jobs.id` is UUID; reject ISO dates and other strings that break Realtime filters */
const PLAN_BUILDER_JOB_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rotating button label while a plan job is running — signals progress, not a freeze. */
const PLAN_BUILDER_LOADING_PHRASES = [
  'Analyzing your niche...',
  'Mapping content pillars...',
  'Scheduling optimal times...',
  'Writing your plan...',
  'Building your strategy...',
];

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

function StepSection({ n, title, children }) {
  return (
    <section className="border-t border-gray-100 pt-3 pb-1 first:border-0 first:pt-0">
      <div className="flex items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#01BAD2] text-sm font-semibold text-white font-plan-display shadow-sm">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-plan-display text-lg font-semibold text-[#0C1220] leading-tight mb-0">{title}</h2>
          <div className="mt-2 space-y-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function formatJobError(err) {
  if (err == null) return 'Plan generation failed. Please try again.';
  if (typeof err === 'string') return err.trim() || 'Plan generation failed. Please try again.';
  if (typeof err === 'object' && err.message) return String(err.message);
  try {
    return JSON.stringify(err);
  } catch {
    return 'Plan generation failed. Please try again.';
  }
}

/** PostgREST / n8n may leave `error` as empty string; `job.error != null` wrongly treats "" as failure. */
function jobHasMeaningfulError(error) {
  if (error == null) return false;
  if (typeof error === 'string') return error.trim().length > 0;
  if (typeof error === 'object') {
    try {
      return Object.keys(error).length > 0;
    } catch {
      return true;
    }
  }
  return Boolean(error);
}

function normalizeJobStatus(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase();
}

const isComplete = (job) => {
  const s = normalizeJobStatus(job.status);
  return (
    s === 'completed' ||
    s === 'done' ||
    s === 'success' ||
    (job.result != null && Number(job.progress) === 100) ||
    job.completed_at != null
  );
};

const isFailed = (job) => {
  const s = normalizeJobStatus(job.status);
  return s === 'failed' || s === 'error' || jobHasMeaningfulError(job.error);
};

/**
 * AI Plan Builder — async job + Supabase Realtime (unchanged flow).
 */
export default function AIPlanBuilder() {
  const { showToast } = useToast();
  const { brandProfile, brandFetchComplete } = useBrand();
  const { getTierDisplayName, userTier } = useSubscription();
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
  const [generationError, setGenerationError] = useState(null);
  const [editingInputs, setEditingInputs] = useState(true);
  const [calendarViewMode, setCalendarViewMode] = useState('calendar');
  const [expandedPostKey, setExpandedPostKey] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );

  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

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

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const fn = () => {
      const m = mq.matches;
      setIsMobileViewport(m);
      if (m) setCalendarViewMode('list');
    };
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingPhraseIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setLoadingPhraseIndex((i) => (i + 1) % PLAN_BUILDER_LOADING_PHRASES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  const handleJobFailed = useCallback(
    (errorMessage) => {
      setIsGenerating(false);
      setCurrentJobId(null);
      const msg = formatJobError(errorMessage);
      setGenerationError(msg);
      showToast(msg, 'error');
    },
    [showToast]
  );

  const handleJobComplete = useCallback(
    (job) => {
      let planData = job?.result;
      if (typeof planData === 'string') {
        try {
          planData = JSON.parse(planData);
        } catch (_) {
          /* leave as string — safeParse in planBuilderJobResult will handle it */
        }
      }

      if (!planData) {
        handleJobFailed('Plan generation completed but no result was returned');
        return;
      }

      console.log('[PlanBuilder] Raw result from Supabase:', planData);

      const preNormalized = normalizeN8nAlternatePlanToV2(planData) ?? planData;
      let payload = preNormalized;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (_) {
          /* leave as string — safeParse in planBuilderJobResult will handle it */
        }
      }
      const parsed = parsePlanBuilderDisplayResult(payload);
      if (parsed.kind === 'fallback' && (!parsed.rawText || parsed.rawText === 'No plan content returned.')) {
        console.warn('[PlanBuilder] Empty fallback body');
      }

      setGeneratedPlan(parsed);
      setIsGenerating(false);
      setCurrentJobId(null);
      setGenerationError(null);
      setEditingInputs(false);
      planUsage.refreshUsage();
      showToast(parsed.kind === 'v2' ? '✓ Plan generated' : '✓ Plan ready — review below.', 'success');
    },
    [showToast, planUsage, handleJobFailed]
  );

  const handleJobCompleteRef = useRef(handleJobComplete);
  const handleJobFailedRef = useRef(handleJobFailed);

  useEffect(() => {
    handleJobCompleteRef.current = handleJobComplete;
    handleJobFailedRef.current = handleJobFailed;
  });

  useEffect(() => {
    if (!currentJobId) return;
    const jobId = currentJobId;

    console.log('[PlanBuilder] Creating Realtime channel with jobId:', jobId, typeof jobId);

    if (!jobId || typeof jobId !== 'string' || !jobId.includes('-')) {
      console.error('[PlanBuilder] Invalid jobId, skipping Realtime:', jobId);
      return;
    }
    if (!PLAN_BUILDER_JOB_UUID_RE.test(jobId)) {
      console.error('[PlanBuilder] Invalid jobId, skipping Realtime:', jobId);
      return;
    }

    let resolved = false;

    const resolveJob = (job) => {
      if (resolved) return;
      resolved = true;
      handleJobCompleteRef.current(job);
    };

    const rejectJob = (error) => {
      if (resolved) return;
      resolved = true;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:rejectJob',message:'job rejected',data:{hypothesisId:'H7',jobId,reason:typeof error==='string'?error.slice(0,300):String(error).slice(0,300)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      handleJobFailedRef.current(error);
    };

    const channel = supabase
      .channel(`plan-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const job = payload.new;
          console.log('[PlanBuilder] Realtime UPDATE:', job.status, 'progress:', job.progress, JSON.stringify(job));
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:realtimeUpdate',message:'postgres UPDATE jobs',data:{hypothesisId:'H7',status:job.status,progress:job.progress,errLen:typeof job.error==='string'?job.error.length:job.error!=null?1:0,isFailedCheck:isFailed(job),isCompleteCheck:isComplete(job)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion

          setJobStatus(job.status);

          if (isFailed(job)) {
            rejectJob(job.error || 'Plan generation failed');
            return;
          }

          if (isComplete(job)) {
            resolveJob(job);
          }
        }
      )
      .subscribe((status, err) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:realtime',message:'realtime channel status',data:{hypothesisId:'H3',jobId,status,errMsg:String(err?.message||'').slice(0,160)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (status === 'SUBSCRIBED') {
          console.log('[PlanBuilder] Realtime subscribed for job', jobId);
        }
      });

    let pollIntervalId = null;
    let loggedFirstPollSuccess = false;
    const pollStartId = window.setTimeout(() => {
      pollIntervalId = window.setInterval(async () => {
        if (resolved) return;
        try {
          const { data: job, error } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', jobId)
            .maybeSingle();

          if (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:poll',message:'jobs poll error',data:{hypothesisId:'H1',jobId,errCode:error.code,errMsg:String(error.message||'').slice(0,220),details:error.details},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            return;
          }
          if (!job) return;

          if (!loggedFirstPollSuccess && job) {
            loggedFirstPollSuccess = true;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/d75599bc-0f49-444b-a4c6-aaf631e54b4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3ed988'},body:JSON.stringify({sessionId:'3ed988',location:'AIPlanBuilder.jsx:poll',message:'jobs poll first row',data:{hypothesisId:'H4',status:job.status,hasResult:job.result!=null,hasProgress:'progress'in job,progressVal:job.progress,completed_at:job.completed_at?1:0,errorEmpty:typeof job.error==='string'&&job.error==='',errorLen:typeof job.error==='string'?job.error.length:job.error!=null?1:0,keys:Object.keys(job).slice(0,25)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
          }

          if (isFailed(job)) {
            rejectJob(job.error || 'Plan generation failed');
            return;
          }

          if (isComplete(job)) {
            resolveJob(job);
          }
        } catch (e) {
          console.error('[PlanBuilder] Poll error', e);
        }
      }, 2000);
    }, 2000);

    const softTimeoutId = window.setTimeout(() => {
      if (resolved) return;
      rejectJob('This is taking longer than expected. Your plan may still be generating — check back in a few minutes.');
    }, 300000);

    return () => {
      supabase.removeChannel(channel);
      window.clearTimeout(pollStartId);
      if (pollIntervalId != null) window.clearInterval(pollIntervalId);
      window.clearTimeout(softTimeoutId);
    };
  }, [currentJobId]);

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

  const optimalTimesMap =
    generatedPlan?.plan?.summary?.optimalTimes ??
    generatedPlan?.plan?.summary?.optimal_times ??
    generatedPlan?.summary?.optimalTimes;
  const primaryPlatformForTimes = optimalTimesMap
    ? Object.keys(optimalTimesMap)[0]
    : selectedPlatforms[0] ?? null;
  const primaryPlat =
    normalizePlatformLabelForIcon(primaryPlatformForTimes) || primaryPlatformForTimes || 'Instagram';
  const bestTimesLine = BEST_TIMES_BY_PLATFORM[primaryPlat] || BEST_TIMES_BY_PLATFORM.Instagram;

  const resetToForm = () => {
    setGeneratedPlan(null);
    setEditingInputs(true);
    setGenerationError(null);
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

    setGenerationError(null);
    setIsGenerating(true);
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

      const { jobId: createdJobId, error: createError } = await createJobDirectly({
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

      if (createError || !createdJobId) {
        throw new Error(createError?.message || 'Failed to create job');
      }

      const jobId =
        typeof createdJobId === 'string' && PLAN_BUILDER_JOB_UUID_RE.test(createdJobId)
          ? createdJobId
          : null;
        if (!jobId) {
          console.error(
            '[PlanBuilder] createJobDirectly returned invalid job id (expected UUID from jobs.id):',
            createdJobId
          );
          throw new Error('Failed to create job: invalid job id');
        }

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
            handleJobComplete({ result: fallbackResult });
            return;
          }
        } catch (fallbackError) {
          console.error('[PlanBuilder] Grok fallback also failed:', fallbackError);
        }

        const failMsg = 'Plan generation service unavailable. Please try again later.';
        setGenerationError(failMsg);
        showToast(failMsg, 'error');
        setIsGenerating(false);
        setCurrentJobId(null);
        return;
      }

      showToast('Your AI plan is being generated...', 'info');
    } catch (error) {
      console.error('handleGeneratePlan error:', error);
      setIsGenerating(false);
      const msg = formatJobError(error?.message || error);
      setGenerationError(msg);
      showToast(msg, 'error');
    }
  };

  const generateButtonSummary = useMemo(() => {
    const n = selectedPeriod;
    const w = resolvedPostingFrequency;
    const pl =
      selectedPlatforms.length > 0
        ? selectedPlatforms.join(', ')
        : 'your platforms';
    return `Generating a ${n}-day plan for ${w} post${w === 1 ? '' : 's'}/week across ${pl}.`;
  }, [selectedPeriod, resolvedPostingFrequency, selectedPlatforms]);

  const tierBadgeLabel = userTier ? `${getTierDisplayName(userTier)} Plan` : 'Plan';

  const atLimit = planUsage.featureLimit > 0 && planUsage.featureUsed >= planUsage.featureLimit;

  return (
    <div className="flex-1 min-h-screen bg-[#F4F7FB] font-plan-body text-[#0C1220] ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-12 max-w-full overflow-x-hidden">
      <div className="mb-5 pb-1 md:mb-6 md:pb-1.5 max-w-4xl mx-auto lg:mx-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white flex items-center justify-center border border-gray-200/80 shadow-sm">
            <Wand2 className="w-6 h-6 md:w-7 md:h-7 text-[#01BAD2]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-plan-display font-bold text-[#0C1220]">
              AI Plan Builder
            </h1>
            <p className="text-sm md:text-base text-gray-500 font-plan-body">
              Generate your content strategy
            </p>
          </div>
        </div>
      </div>

      {atLimit && (
        <div className="mt-1 mb-4 max-w-4xl mx-auto lg:mx-0">
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            You&apos;ve used all {planUsage.featureLimit} AI Plan generations for this month on your{' '}
            {userTier ? getTierDisplayName(userTier) : 'current'} plan. Your allowance resets on the 1st.{' '}
            <Link to="/dashboard/subscription" className="font-semibold text-[#01BAD2] underline underline-offset-2">
              Manage subscription
            </Link>
          </p>
        </div>
      )}

      {generationError && !isGenerating && (
        <div className="max-w-4xl mx-auto mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{generationError}</span>
            <button
              type="button"
              onClick={() => setGenerationError(null)}
              className="shrink-0 text-red-900 font-semibold underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {(() => {
        const showFormPanel =
          !generatedPlan || editingInputs || generatedPlan?.kind === 'fallback';
        const fieldClass =
          'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#0C1220] placeholder:text-gray-400 focus:border-[#01BAD2] focus:outline-none focus:ring-2 focus:ring-[#01BAD2]/25';
        const selectClass = `${fieldClass} appearance-none pr-10`;
        const pillBase =
          'rounded-full border px-3 py-1.5 text-sm font-medium shrink-0';
        const pillInactive = 'border-gray-200 bg-white text-gray-700 hover:border-[#01BAD2]/50';
        const pillActive = 'border-[#01BAD2] bg-[#01BAD2] text-white shadow-sm';

        if (!showFormPanel) return null;

        return (
          <div
            className={`max-w-4xl mx-auto pb-6 ${isGenerating ? 'opacity-90 pointer-events-none' : ''}`}
            aria-busy={isGenerating}
          >
            <div className="md:grid md:grid-cols-2 md:gap-6">
              <div className="space-y-5 md:space-y-4">
              <StepSection n={1} title="Your Goal">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Content Goal
                  </label>
                  <div className="relative">
                    <select
                      value={selectedGoal}
                      onChange={(e) => setSelectedGoal(e.target.value)}
                      disabled={isGenerating}
                      className={selectClass}
                    >
                      {CONTENT_GOALS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Time Period
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[7, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setSelectedPeriod(d)}
                        className={`${pillBase} px-4 py-2 min-w-[100px] flex-1 sm:flex-none ${selectedPeriod === d ? pillActive : pillInactive}`}
                      >
                        {d} Days
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Posting Frequency
                  </label>
                  <p className="text-xs text-gray-500 mb-1">How many posts per week?</p>
                  <div className="flex flex-nowrap gap-1.5 md:flex-wrap md:gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin">
                    {['3', '5', '7'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setPostingFreqMode(m)}
                        className={`${pillBase} flex-1 min-w-0 md:flex-none text-center ${postingFreqMode === m ? pillActive : pillInactive}`}
                      >
                        {m}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setPostingFreqMode('custom')}
                      className={`${pillBase} flex-1 min-w-0 md:flex-none text-center ${postingFreqMode === 'custom' ? pillActive : pillInactive}`}
                    >
                      Custom
                    </button>
                  </div>
                  {postingFreqMode === 'custom' && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={14}
                        disabled={isGenerating}
                        value={postingFreqCustom}
                        onChange={(e) => setPostingFreqCustom(Number(e.target.value))}
                        className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#01BAD2] focus:outline-none focus:ring-2 focus:ring-[#01BAD2]/25"
                      />
                      <span className="text-sm text-gray-600">posts per week (1–14)</span>
                    </div>
                  )}
                </div>
              </StepSection>

              <StepSection n={2} title="Your Brand">
                <Link
                  to="/dashboard/brand-voice"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#01BAD2] hover:underline mt-0 mb-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  From your Brand Profile — edit anytime
                </Link>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Niche / Industry</label>
                    <input
                      type="text"
                      value={nicheInput}
                      disabled={isGenerating}
                      onChange={(e) => setNicheInput(e.target.value)}
                      placeholder="e.g. Fitness coaching, SaaS, local bakery"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={targetAudienceInput}
                      disabled={isGenerating}
                      onChange={(e) => setTargetAudienceInput(e.target.value)}
                      placeholder="Who you create content for"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Brand Voice Tone</label>
                    <input
                      type="text"
                      value={brandVoiceToneInput}
                      disabled={isGenerating}
                      onChange={(e) => setBrandVoiceToneInput(e.target.value)}
                      placeholder="e.g. Warm, direct, expert-but-friendly"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </StepSection>
              </div>

              <div className="space-y-5 md:space-y-4 mt-5 md:mt-0">
              <StepSection n={3} title="Platform Focus">
                <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-2">
                  {PLAN_BUILDER_PLATFORMS.map((platform) => {
                    const Mono = platform.monoIcon || platform.icon;
                    const name = platform.name;
                    const isSelected = selectedPlatforms.includes(name);
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => handlePlatformToggle(name)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium ${
                          isSelected
                            ? 'border-[#01BAD2] bg-[#01BAD2]/10 text-[#0C1220]'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-[#01BAD2]/40'
                        }`}
                      >
                        <span className={isSelected ? 'text-[#01BAD2]' : 'text-gray-500'}>
                          <Mono className="h-4 w-4" />
                        </span>
                        {platform.displayName || name}
                      </button>
                    );
                  })}
                </div>
              </StepSection>

              <StepSection n={4} title="Content Pillars">
                <p className="text-xs text-gray-500">
                  3–5 themes you post about (min 1, max 5).
                </p>
                <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#01BAD2]/25 focus-within:border-[#01BAD2]">
                  <input
                    type="text"
                    value={pillarDraft}
                    disabled={isGenerating}
                    onChange={(e) => setPillarDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPillar())}
                    placeholder="Add a pillar..."
                    className="flex-1 min-w-0 border-0 px-4 py-2.5 text-sm focus:ring-0"
                  />
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={addPillar}
                    className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-gray-200 bg-gray-50 text-[#01BAD2] hover:bg-[#01BAD2]/10"
                    aria-label="Add pillar"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-1 mb-0">
                  {PILLAR_QUICK_ADD.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        if (contentPillars.length >= 5) {
                          showToast('Maximum 5 content pillars', 'warning');
                          return;
                        }
                        if (contentPillars.some((p) => p.toLowerCase() === s.toLowerCase())) return;
                        setContentPillars((prev) => [...prev, s]);
                      }}
                      className="text-xs font-medium text-[#01BAD2] underline-offset-2 hover:underline"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                {contentPillars.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contentPillars.map((p, i) => (
                      <span
                        key={`${p}-${i}`}
                        className="inline-flex items-center gap-1 rounded-full border border-[#01BAD2]/20 bg-[#01BAD2]/8 px-3 py-1 text-sm text-[#0C1220]"
                      >
                        {p}
                        <button
                          type="button"
                          disabled={isGenerating}
                          className="rounded-full p-0.5 text-gray-500 hover:bg-[#01BAD2]/15 hover:text-[#0C1220]"
                          onClick={() => removePillar(i)}
                          aria-label={`Remove ${p}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </StepSection>

              <StepSection n={5} title="Follower Range">
                <div className="relative">
                  <select
                    value={followerRange}
                    disabled={isGenerating}
                    onChange={(e) => setFollowerRange(e.target.value)}
                    className={selectClass}
                  >
                    {FOLLOWER_RANGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </StepSection>

              <StepSection n={6} title="Optional Context">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setOptionalOpen(!optionalOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-left text-sm font-semibold text-[#0C1220] hover:border-[#01BAD2]/40"
                >
                  <span>Anything else AI should know?</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-400 ${optionalOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {optionalOpen && (
                  <textarea
                    value={extraContext}
                    disabled={isGenerating}
                    onChange={(e) => setExtraContext(e.target.value)}
                    placeholder="e.g. Running a spring promo in 2 weeks, short-form video performs best for us"
                    rows={4}
                    className={`${fieldClass} mt-2 resize-y`}
                  />
                )}
              </StepSection>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-3">
              <p className="text-center text-sm text-gray-600 font-plan-body">{generateButtonSummary}</p>
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGenerating || atLimit || !planUsage.canGenerate}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#01BAD2] px-3 py-2.5 font-plan-display text-base font-semibold text-white shadow-md transition-all hover:bg-[#0199b0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                    <span className="text-center leading-snug">
                      {PLAN_BUILDER_LOADING_PHRASES[loadingPhraseIndex]}
                    </span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Generate content plan
                  </>
                )}
              </button>
              {isGenerating ? (
                <p className="text-center text-sm text-gray-400">
                  This takes 60–90 seconds. Grab a coffee ☕
                </p>
              ) : null}
            </div>
          </div>
        );
      })()}

      {isGenerating && (
        <div className="max-w-[1100px] mx-auto mt-10 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Preview</p>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
                <div className="h-16 rounded-lg border border-gray-200 bg-gradient-to-b from-white to-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!generatedPlan && !isGenerating && (
        <div className="max-w-[1100px] mx-auto mt-10 rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 px-4 py-12">
          <div className="grid grid-cols-7 gap-1 opacity-40 mb-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100" />
            ))}
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            <Wand2 className="h-8 w-8 text-[#01BAD2]/50" />
            <p className="font-plan-display text-lg font-semibold text-gray-600">Your strategy will appear here</p>
            <p className="text-sm text-gray-500 max-w-sm">
              Complete the form and generate a plan to see your day-by-day calendar.
            </p>
          </div>
        </div>
      )}

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
          ['Educational', mix.educational, 'bg-blue-500'],
          ['Entertaining', mix.entertaining, 'bg-amber-400'],
          ['Authority', mix.authority, 'bg-violet-500'],
          ['Promotional', mix.promotional, 'bg-rose-400'],
          ['Personal', mix.personal, 'bg-teal-500'],
        ].filter(([, val]) => Number(val) > 0);
        const mixTotal = mixEntries.reduce((s, [, n]) => s + Number(n), 0) || 1;

        const exportText = buildV2PlanPlainText(plan);
        const days = plan.days || [];
        const totalPosts = days.reduce((sum, d) => sum + (d.posts?.length || 0), 0);
        const platformSet = new Set(
          days.flatMap((d) => (d.posts || []).map((p) => normalizePlatformLabelForIcon(p.platform) || p.platform).filter(Boolean))
        );
        const contentTypes = new Set(
          days.flatMap((d) => (d.posts || []).map((p) => p.contentType).filter(Boolean))
        );

        const weekChunks = [];
        for (let i = 0; i < days.length; i += 7) {
          weekChunks.push(days.slice(i, i + 7));
        }

        const scheduleFirstPost = () => {
          const first = days[0]?.posts?.[0];
          if (!first) {
            showToast('No posts in this plan to schedule.', 'warning');
            return;
          }
          const hookQ = encodeURIComponent(first.hook || '');
          const topicQ = encodeURIComponent(first.topic || '');
          const capQ = encodeURIComponent(first.caption || '');
          const platQ = encodeURIComponent(String(first.platform || '').toLowerCase());
          navigate(`/dashboard/full-post-builder?hook=${hookQ}&platform=${platQ}&topic=${topicQ}&caption=${capQ}`);
          showToast('Opened your first planned post — schedule each post from the calendar.', 'info');
        };

        const buildPostBrief = (post) => {
          const tags = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : '';
          return [
            post.hook && `Hook: ${post.hook}`,
            post.caption && `Brief: ${post.caption}`,
            tags && `Hashtags: ${tags}`,
            post.cta && `CTA: ${post.cta}`,
            post.notes && `Visual: ${post.notes}`,
          ]
            .filter(Boolean)
            .join('\n\n');
        };

        const renderPostBody = (post) => {
          const hideTags = isTwitterLikePlatform(post.platform);
          const hookQ = encodeURIComponent(post.hook || '');
          const topicQ = encodeURIComponent(post.topic || '');
          const capQ = encodeURIComponent(post.caption || '');
          const platQ = encodeURIComponent(String(post.platform || '').toLowerCase());

          return (
            <div className="space-y-3 pt-2">
              <div>
                <p className="text-xs font-semibold text-gray-500">Hook</p>
                <p className="text-base font-semibold text-[#0C1220]">{sanitizeAIOutput(post.hook || '')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Caption angle / brief</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{sanitizeAIOutput(post.caption || post.topic || '')}</p>
              </div>
              {!hideTags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Hashtags</p>
                  <p className="text-sm text-gray-800">{post.hashtags.join(' ')}</p>
                </div>
              )}
              {post.cta ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500">CTA</p>
                  <p className="text-sm text-gray-700">{sanitizeAIOutput(post.cta)}</p>
                </div>
              ) : null}
              {post.notes ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500">Visual direction</p>
                  <p className="text-sm text-gray-700">{sanitizeAIOutput(post.notes)}</p>
                </div>
              ) : null}
              <CollapsibleBlock title="Why this works" defaultOpen={false} hide={!post.why_this_works}>
                <p className="text-gray-700 whitespace-pre-wrap">{sanitizeAIOutput(post.why_this_works || '')}</p>
              </CollapsibleBlock>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/dashboard/full-post-builder?hook=${hookQ}&platform=${platQ}&topic=${topicQ}&caption=${capQ}`
                    )
                  }
                  className="rounded-xl bg-[#01BAD2] px-4 py-2 text-sm font-semibold text-white"
                >
                  Schedule this post
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(buildPostBrief(post)).then(() => showToast('Brief copied', 'success'))
                  }
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800"
                >
                  Copy brief
                </button>
              </div>
            </div>
          );
        };

        const showCal = calendarViewMode === 'calendar' && !isMobileViewport;
        let cardAnimIndex = 0;

        return (
          <div className="mt-10 max-w-[1200px] mx-auto space-y-8 pb-16 font-plan-body">
            <Motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-gray-200 pb-6"
            >
              <div>
                <h2 className="font-plan-display text-[22px] font-bold text-[#0C1220]">
                  Your {days.length || selectedPeriod}-Day Content Strategy
                </h2>
                <p className="mt-1 text-sm text-gray-500">{sanitizeAIOutput(overview.strategy || '')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    {totalPosts} posts planned
                  </span>
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    {platformSet.size} platforms
                  </span>
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    {contentTypes.size || '—'} content types
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <span className="inline-flex w-fit items-center rounded-full border border-[#01BAD2]/30 bg-[#01BAD2]/10 px-3 py-1 text-xs font-semibold text-[#0C1220]">
                  {tierBadgeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingInputs(true)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-[#01BAD2]/40"
                >
                  Edit inputs
                </button>
                <button
                  type="button"
                  onClick={scheduleFirstPost}
                  className="rounded-xl bg-[#01BAD2] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0199b0]"
                >
                  Schedule all posts
                </button>
              </div>
            </Motion.div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recommended mix</p>
                {mixEntries.length > 0 ? (
                  <>
                    <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
                      {mixEntries.map(([label, val, colorClass]) => (
                        <div
                          key={label}
                          className={`${colorClass} h-full`}
                          style={{ width: `${(Number(val) / mixTotal) * 100}%` }}
                          title={`${label}: ${val}%`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                      {mixEntries.map(([label, val, colorClass]) => (
                        <span key={label} className="inline-flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${colorClass}`} />
                          {label} {val}%
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Mix will appear when included in your plan.</p>
                )}
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Optimal times</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {overview.strategy_notes
                    ? sanitizeAIOutput(overview.strategy_notes)
                    : 'Times are woven into each post card below.'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Key themes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contentPillars.length > 0 ? (
                    contentPillars.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-[#01BAD2]/20 bg-[#01BAD2]/8 px-3 py-1 text-xs font-medium text-[#0C1220]"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Themes from your content pillars appear here.</p>
                  )}
                </div>
              </div>
            </div>

            {Array.isArray(plan.weeklyTips) && plan.weeklyTips.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {plan.weeklyTips.map((tip, idx) => (
                  <div key={idx} className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <p className="text-sm text-gray-800">{sanitizeAIOutput(tip)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-plan-display text-lg font-semibold text-[#0C1220]">Content calendar</h3>
              <div className="flex w-fit rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('calendar')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    calendarViewMode === 'calendar' ? 'bg-[#01BAD2] text-white' : 'text-gray-600'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('list')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    calendarViewMode === 'list' ? 'bg-[#01BAD2] text-white' : 'text-gray-600'
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
              </div>
            </div>

            {showCal ? (
              <div className="space-y-8 overflow-x-auto">
                {weekChunks.map((chunk, wi) => (
                  <div key={wi}>
                    {weekChunks.length > 1 ? (
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Week {wi + 1}
                      </p>
                    ) : null}
                    <div className="grid min-w-[720px] grid-cols-7 gap-2">
                      {chunk.map((day, di) => {
                        const colDelay = di * 0.05;
                        return (
                          <div key={day.day} className="flex flex-col gap-2">
                            <div className="text-center">
                              <p className="text-[10px] font-semibold uppercase text-gray-400">
                                {String(day.date || '').split(' ')[0] || `Day ${day.day}`}
                              </p>
                              <p className="font-plan-display text-sm font-bold text-[#0C1220]">
                                {sanitizeAIOutput(day.date || `Day ${day.day}`)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              {(day.posts || []).map((post, pi) => {
                                const pk = `d${day.day}-p${pi}`;
                                const platLabel =
                                  normalizePlatformLabelForIcon(post.platform) || post.platform || '';
                                const borderC = PLATFORM_CARD_BORDER[platLabel] || '#64748b';
                                const ct = contentTypeBadgeProps(post.contentType);
                                const hookPreview =
                                  (post.hook || '').length > 48
                                    ? `${String(post.hook).slice(0, 48)}…`
                                    : (post.hook || '');
                                const anim = cardAnimIndex * 0.05;
                                cardAnimIndex += 1;
                                const expanded = expandedPostKey === pk;
                                return (
                                  <Motion.div
                                    key={pk}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: colDelay + anim }}
                                    className="cursor-pointer rounded-xl border border-gray-200 bg-white p-2.5 text-left shadow-sm transition hover:border-[#01BAD2]/50"
                                    style={{ borderTopWidth: 3, borderTopColor: borderC }}
                                    onClick={() => setExpandedPostKey(expanded ? null : pk)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setExpandedPostKey(expanded ? null : pk);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0C1220]">
                                      {getPlatformIcon(post.platform, 'h-3.5 w-3.5')}
                                      <span className="truncate">{platLabel}</span>
                                    </div>
                                    <span
                                      className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${ct.className}`}
                                    >
                                      {sanitizeAIOutput(ct.label)}
                                    </span>
                                    {post.postTime ? (
                                      <p className="mt-1 text-[10px] text-gray-500">{sanitizeAIOutput(post.postTime)}</p>
                                    ) : null}
                                    <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-gray-700">
                                      {sanitizeAIOutput(hookPreview)}
                                    </p>
                                    <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#01BAD2]">
                                      {expanded ? 'Show less' : 'Details'}
                                      <ChevronRight className={`h-3 w-3 transition ${expanded ? 'rotate-90' : ''}`} />
                                    </span>
                                    {expanded ? (
                                      <div className="mt-2 border-t border-gray-100 pt-2" onClick={(e) => e.stopPropagation()}>
                                        {renderPostBody(post)}
                                      </div>
                                    ) : null}
                                  </Motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {days.map((day) => (
                  <div key={day.day}>
                    <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                      <Calendar className="h-4 w-4 text-[#01BAD2]" />
                      <span className="font-plan-display font-semibold text-[#0C1220]">
                        {sanitizeAIOutput(day.date || `Day ${day.day}`)}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {(day.posts || []).map((post, pi) => {
                        const platLabel = normalizePlatformLabelForIcon(post.platform) || post.platform || '';
                        const borderC = PLATFORM_CARD_BORDER[platLabel] || '#64748b';
                        const ct = contentTypeBadgeProps(post.contentType);
                        return (
                          <Motion.div
                            key={`${day.day}-${pi}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: pi * 0.05 }}
                            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                            style={{ borderLeftWidth: 4, borderLeftColor: borderC }}
                          >
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              {getPlatformIcon(post.platform, 'h-5 w-5')}
                              <span className="font-plan-display font-semibold text-[#0C1220]">{platLabel}</span>
                              <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${ct.className}`}>
                                {sanitizeAIOutput(ct.label)}
                              </span>
                              {post.postTime ? (
                                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                                  <Clock className="h-4 w-4" />
                                  {sanitizeAIOutput(post.postTime)}
                                </span>
                              ) : null}
                            </div>
                            {renderPostBody(post)}
                          </Motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-6">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(exportText).then(() => showToast('Plan copied', 'success'))}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0C1220] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Copy className="h-4 w-4" />
                Copy full plan
              </button>
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
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <FolderPlus className="h-4 w-4" />
                  Save to vault
                </button>
              ) : null}
              <button
                type="button"
                onClick={resetToForm}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600"
              >
                Start over
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
