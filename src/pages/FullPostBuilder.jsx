import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Lightbulb, PenTool, PenLine, Hash, MessageSquare, Check, ChevronLeft,
  ChevronRight, Copy, FolderPlus, Package, RotateCcw, RefreshCw, X, Sparkles, TrendingUp, HelpCircle,
} from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import useAIUsage from '../hooks/useAIUsage';
import PlatformSelector from '../components/PlatformSelector';
import UpgradeModal from '../components/UpgradeModal';
import AIUsageMeter from '../components/AIUsageMeter';
import { AIDisclaimerFooter } from '../components/AIDisclaimer';
import {
  generateFullPostHooks,
  generateHooks,
  generateCaption,
  generateHashtags,
  generateStyledCTAs,
  scoreContentQuality,
  scoreHumanness,
  mapFullPostHookTypeToHookBuilderTheme,
  enhanceCaptionWithGrokFallback,
} from '../services/grokAPI';
import { extractHooksFromHookBuilderResult } from '../utils/fullPostHooksParser';
import { FULL_POST_BUILDER_CREDITS_PER_RUN } from '../config/supabase';
import { POSTKIT_PENDING_STORAGE_KEY } from '../services/postKitService';
import { saveToVault } from '../services/contentService';
import { getPlatform } from '../utils/platformGuidelines';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { buildContentVaultPayload } from '../utils/contentVault';
import { getPromptBrandProfile } from '../utils/brandContextBuilder';
import { enhanceCaptionWithClaude, generateFullPostHooksWithClaude } from '../services/claudeAPI';
import { generateFullPostHashtagsGrounded } from '../services/perplexityAPI';
import { getHashtagMaxForPlatform, getMinAcceptableHashtagCountForPlatform } from '../data/platformContentRules';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized
import { extractField } from '../utils/parseAIResponse';
import LoadingSpinner from '../components/LoadingSpinner';
import { checkAlgorithmAlignment } from '../data/algorithmSignals';
import {
  PLATFORM_CONTENT_RULES,
  getPlatformPromptRule,
  getHashtagConstraint,
  normalizePlatformRulesKey,
} from '../data/platformContentRules';

const STORAGE_KEY_PREFIX = 'fullPostBuilderDraft';

/** Set to `true` locally to show “Run Smoke Test” under the header (dev build only). Off after QA. */
const FPB_DEV_SMOKE_UI_ENABLED = false;

/**
 * --- FPB QA notes (smoke + fixes, Mar 2026) ---
 * Smoke stages that were brittle before fixes: (1) hooks — smoke only called Claude; now mirrors UI (Claude → Grok). (2) enhance — smoke only called Claude; now Claude → Grok fallback like the wizard. (3) quality — scorer sometimes returned JSON with `overall` instead of `overallScore`; normalizeContentScoreV2 now accepts both. (4) human — Grok occasionally returned JSON embedded in prose; scoreHumanness uses a loose `overall` extractor before marking unavailable.
 * Unchanged routing summary: Hooks Claude→Grok→Hook Builder; Caption Grok; Enhance Claude→Grok; Hashtags Perplexity sonar→quick_scan→Grok; CTA Grok; Quality Claude→Grok; Human Claude→Grok; Algorithm local checklist (AlgorithmChecker).
 * Limitations: Smoke requires a logged-in session (proxies return 401 without Bearer). Algorithm score is heuristic (weighted checklist), not an API. Humanizer on the final panel scores caption-only by design.
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeFreshRegenNonce(prefix) {
  return `fpb-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** One-sentence explainer + example line for each hook style (topic-aware). */
function getHookTypeHelp(type, topicSnippet) {
  const t = (topicSnippet || 'your topic').trim().slice(0, 72) || 'your topic';
  const map = {
    Question: {
      blurb: 'Opens with a question so people stop to find the answer.',
      example: `Still guessing about ${t}? Here's what actually works.`,
    },
    Teaser: {
      blurb: 'Hints at a secret or payoff so curiosity pulls them in.',
      example: `The one thing about ${t} almost everyone gets wrong.`,
    },
    'Shocking Stat': {
      blurb: 'Surprises with a pattern or contrast — no fake numbers; qualitative surprise only.',
      example: `Most people approach ${t} backwards — here's the shift.`,
    },
    Story: {
      blurb: 'Starts mid-moment so it feels like a real story, not a pitch.',
      example: `Last week I almost gave up on ${t}. Then this happened.`,
    },
    'Bold Claim': {
      blurb: 'States a strong opinion or promise that demands a reaction.',
      example: `${t} doesn't need more content — it needs this one fix.`,
    },
  };
  return map[type] || { blurb: 'A scroll-stopping opening line.', example: `Strong opener about ${t}.` };
}

const STEPS = [
  { id: 'topic', label: 'Topic', icon: Lightbulb, description: 'Set your topic, platform & goal' },
  { id: 'hook', label: 'Hook', icon: Zap, description: 'Pick your scroll-stopping hook' },
  { id: 'caption', label: 'Caption', icon: PenTool, description: 'Build your full caption' },
  { id: 'hashtags', label: 'Hashtags', icon: Hash, description: 'Add ranked hashtags' },
  { id: 'cta', label: 'CTA', icon: MessageSquare, description: 'Choose your call-to-action' },
];

const GOALS = [
  { id: 'followers', label: 'Grow followers' },
  { id: 'engagement', label: 'Drive engagement' },
  { id: 'leads', label: 'Generate leads' },
  { id: 'sales', label: 'Make a sale' },
];

/** Richer goal copy for Claude hook generation (keeps UI labels unchanged). */
function resolveClaudeHookGoalLabel(goalId, fallbackLabel) {
  const map = {
    followers: 'Build a follower base of people who match your ideal client',
    engagement: 'Educate skeptical beginners and drive comments, saves, and shares',
    leads: 'Book consultations and capture qualified leads',
    sales: 'Sell treatment packages and convert interest into bookings',
  };
  return map[goalId] || fallbackLabel;
}

/**
 * Single string for hook AI: full user topic plus trending context that is not already implied.
 * @param {string} baseTopic
 * @param {{ niche_angle?: string, format_type?: string, description?: string } | null | undefined} tc
 */
function buildFullPostClaudeHookTopic(baseTopic, tc) {
  const t = String(baseTopic ?? '').trim();
  if (!t) return t;
  const segments = [t];
  const tLow = t.toLowerCase();

  const maybeAdd = (fragment) => {
    const f = String(fragment ?? '').trim();
    if (f.length < 3) return;
    const fLow = f.toLowerCase();
    if (tLow.includes(fLow)) return;
    if (fLow.includes(tLow) && f.length > t.length) {
      segments[0] = f;
      return;
    }
    if (segments.some((s) => s.toLowerCase().includes(fLow) && fLow.length >= 8)) return;
    segments.push(f);
  };

  maybeAdd(tc?.niche_angle);
  maybeAdd(tc?.format_type);
  maybeAdd(tc?.description);
  return segments.join(' — ');
}

/** When brand profile has no target audience, infer a concrete default from the hook topic string. */
function inferDefaultHookAudienceFromTopic(fullTopic) {
  const t = String(fullTopic ?? '').toLowerCase();
  if (t.includes('acne scar')) return 'women 25-45 worried about acne scars and texture';
  if (t.includes('microneedling')) return 'people comparing microneedling options for texture and scars';
  if (t.includes('botox') || t.includes('filler')) return 'people researching injectables and first-time med spa treatments';
  if (t.includes('laser') || t.includes('ipl')) return 'people evaluating laser or light treatments for their skin goals';
  return 'people scrolling for trustworthy, specific answers about this exact topic';
}

function resolveClaudeHookAudience(promptProfile, fullTopic) {
  const raw = promptProfile?.targetAudience?.trim();
  if (raw) return raw;
  return inferDefaultHookAudienceFromTopic(fullTopic);
}

const HOOK_TYPES = ['Question', 'Teaser', 'Shocking Stat', 'Story', 'Bold Claim'];

function shouldSkipFullPostHookRetries(code) {
  return code === 'GROK_AUTH_FAILED' || code === 'GROK_UPSTREAM_INVALID';
}

/** @param {{ code?: string, status?: number, error?: string }} res */
function classifyGrokFailure(res) {
  const code = res?.code;
  const status = res?.status;
  const msg = String(res?.error || '').toLowerCase();
  if (code === 'GROK_AUTH_FAILED' || status === 401) return 'auth_config';
  if (status === 503 && msg.includes('not configured')) return 'auth_config';
  if (status === 429 || msg.includes('rate limit')) return 'rate_limit';
  if (code === 'HOOKS_EMPTY') return 'parser_hooks';
  if (code === 'GROK_UPSTREAM_INVALID' || code === 'VALIDATION') return 'auth_config';
  return 'upstream';
}

function hookFailureUserMessage(bucket) {
  if (bucket === 'auth_config') {
    return 'We could not reach the AI service with your account. Refresh the page, confirm you are logged in, or contact support if this continues.';
  }
  if (bucket === 'rate_limit') {
    return "You've hit your current AI usage limit for this feature. Wait a minute and try again, or enter your own hook below.";
  }
  if (bucket === 'parser_hooks') {
    return 'We hit a temporary AI formatting issue. Try again or enter your own hook.';
  }
  return 'The AI service is temporarily unavailable. Please retry in a minute.';
}

function stepToolFailureMessage(step, bucket) {
  if (bucket === 'rate_limit') {
    if (step === 'caption') {
      return "You've hit your current AI usage limit for this feature. Wait briefly and tap Regenerate, or write the caption yourself.";
    }
    if (step === 'hashtags') {
      return "You've hit your current AI usage limit for this feature. Wait briefly and tap Regenerate, or add hashtags manually.";
    }
    return "You've hit your current AI usage limit for this feature. Wait briefly and tap Regenerate, or write your own CTA.";
  }
  if (bucket === 'auth_config') {
    return 'We could not authorize this AI request. Refresh the page or check your login.';
  }
  if (step === 'caption') {
    return 'The AI service hiccupped. Tap Regenerate in a moment, or keep writing manually — your draft is unchanged.';
  }
  if (step === 'hashtags') {
    return 'The AI service hiccupped. Tap Regenerate in a moment, or edit hashtags manually — previous steps are unchanged.';
  }
  return 'The AI service hiccupped. Tap Regenerate in a moment, or use your own CTA below — previous steps are unchanged.';
}

/** @param {{ success?: boolean, code?: string, status?: number } | null} res */
function shouldAttemptHookBuilderFallback(res) {
  if (!res || res.success) return false;
  const { code, status } = res;
  if (status === 429 || status === 401) return false;
  if (code === 'GROK_AUTH_FAILED' || code === 'GROK_UPSTREAM_INVALID') return false;
  if (code === 'VALIDATION') return false;
  return true;
}

function parseHashtagsFromResponse(text) {
  if (!text) return [];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr[0]?.tag) {
        return arr.map((h) => ({ tag: h.tag, score: h.score || 0, tier: h.tier || '', reason: h.reason || '' }));
      }
    }
  } catch { /* fallthrough */ }
  const tags = text.match(/#[\w]+/g) || [];
  return tags.map((tag) => ({ tag, score: 50, tier: 'mid', reason: '' }));
}

export default function FullPostBuilder() {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { checkFeatureAccess } = useSubscription();
  const { addToast } = useToast();
  const { featureUsed, featureLimit, trackFeatureUsage } = useAIUsage('fullPostBuilderRuns');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const trendingContextRef = useRef(null);
  const [trendingBanner, setTrendingBanner] = useState(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showFinalPanel, setShowFinalPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Step 1 state
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [goal, setGoal] = useState('engagement');

  // Step 2 state
  const [selectedHookType, setSelectedHookType] = useState(HOOK_TYPES[0]);
  const [hooks, setHooks] = useState([]);
  const [selectedHook, setSelectedHook] = useState(null);
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [hooksErrorHint, setHooksErrorHint] = useState(null);
  const [manualHookMode, setManualHookMode] = useState(false);
  const [manualHookDraft, setManualHookDraft] = useState('');

  // Step 3 state
  const [caption, setCaption] = useState('');
  const [captionLength, setCaptionLength] = useState('long');
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingCaptionEnhancement, setLoadingCaptionEnhancement] = useState(false);
  const [captionStreamlinedNotice, setCaptionStreamlinedNotice] = useState(null);
  const [hashtagStreamlinedNotice, setHashtagStreamlinedNotice] = useState(null);
  const [ctaStreamlinedNotice, setCtaStreamlinedNotice] = useState(null);
  const [hashtagStepError, setHashtagStepError] = useState(null);

  // Step 4 state
  const [hashtags, setHashtags] = useState([]);
  const [loadingHashtags, setLoadingHashtags] = useState(false);

  // Step 5 state
  const [ctas, setCtas] = useState([]);
  const [selectedCTA, setSelectedCTA] = useState(null);
  const [loadingCTAs, setLoadingCTAs] = useState(false);
  const [customCtaDraft, setCustomCtaDraft] = useState('');

  const [savedPartIds, setSavedPartIds] = useState({});

  const hasAccess = checkFeatureAccess('full-post-builder');
  const storageKey = useMemo(() => `${STORAGE_KEY_PREFIX}:${user?.id || 'guest'}`, [user?.id]);
  const hasHydratedRef = useRef(false);
  /** Prevents localStorage / URL hydrate from re-applying when effect deps churn (stale overwrite after async). */
  const hydrationSigRef = useRef(null);
  const pendingTrendingRef = useRef(null);
  const appliedTrendingRef = useRef(false);
  const hooksReqIdRef = useRef(0);
  const captionReqIdRef = useRef(0);
  const hashtagReqIdRef = useRef(0);
  const enhanceReqIdRef = useRef(0);
  const ctaReqIdRef = useRef(0);
  const captionTextareaRef = useRef(null);
  const wizardRef = useRef({});
  const assembledPostRef = useRef('');
  /** One billable hook-generation charge per visit to step 1 (type changes / regenerate stay within the same run). */
  const hooksRunPaidRef = useRef(false);
  /** After the user edits the topic field, never auto-reapply brand niche over their text. */
  const userEditedTopicRef = useRef(false);
  if (location.state?.source === 'trending') {
    pendingTrendingRef.current = location.state;
  }

  const prefillTopic = searchParams.get('topic')?.trim() || '';
  const prefillPlatform = searchParams.get('platform')?.trim() || '';
  const prefillGoal = searchParams.get('goal')?.trim() || '';
  const prefillHook = searchParams.get('hook')?.trim() || '';
  const prefillCaption = searchParams.get('caption')?.trim() || '';
  const hasExplicitPrefill = Boolean(
    prefillTopic || prefillPlatform || prefillGoal || prefillHook || prefillCaption
  );

  // Hydrate from URL params, trending navigation state, and local draft (once per hydration signature).
  useEffect(() => {
    try {
      const t = pendingTrendingRef.current;
      if (t?.source === 'trending' && !appliedTrendingRef.current) {
        appliedTrendingRef.current = true;
        pendingTrendingRef.current = null;
        trendingContextRef.current = t;
        hydrationSigRef.current = `trending:${storageKey}`;
        setTrendingBanner(t);
        setTopic(t.topic || '');
        setPlatform(t.platform ? String(t.platform).toLowerCase() : 'instagram');
        setGoal('engagement');
        setSelectedHookType(HOOK_TYPES[0]);
        if (t.hook) {
          setHooks([t.hook]);
          setSelectedHook(t.hook);
          setCurrentStep(1);
        } else {
          setHooks([]);
          setSelectedHook(null);
          setCurrentStep(0);
        }
        setCaption('');
        setHashtags([]);
        setCtas([]);
        setSelectedCTA(null);
        setShowFinalPanel(false);
        navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
        hasHydratedRef.current = true;
        return;
      }

      if (appliedTrendingRef.current) {
        hasHydratedRef.current = true;
        return;
      }

      const draftSig = `draft:${storageKey}:${hasExplicitPrefill}:${prefillTopic}:${prefillPlatform}:${prefillGoal}:${prefillHook}:${prefillCaption}`;
      if (hydrationSigRef.current === draftSig) {
        hasHydratedRef.current = true;
        return;
      }
      hydrationSigRef.current = draftSig;

      const draft = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const shouldStartFresh = hasExplicitPrefill;

      setTopic(prefillTopic || draft?.topic || '');
      setPlatform(prefillPlatform || draft?.platform || 'instagram');
      setGoal(prefillGoal || draft?.goal || 'engagement');
      setSelectedHookType(draft?.selectedHookType || HOOK_TYPES[0]);

      if (shouldStartFresh) {
        if (prefillHook) {
          setHooks([prefillHook]);
          setSelectedHook(prefillHook);
        } else {
          setHooks([]);
          setSelectedHook(null);
        }
        setCaption(prefillCaption || '');
        setHashtags([]);
        setCtas([]);
        setSelectedCTA(null);
        if (prefillCaption && prefillHook) {
          setCurrentStep(2);
        } else if (prefillHook) {
          setCurrentStep(1);
        } else {
          setCurrentStep(0);
        }
        setShowFinalPanel(false);
      } else if (draft?.topic) {
        setHooks(Array.isArray(draft.hooks) ? draft.hooks : []);
        setSelectedHook(draft?.selectedHook || null);
        setCaption(draft?.caption || '');
        setHashtags(Array.isArray(draft?.hashtags) ? draft.hashtags : []);
        setCtas(Array.isArray(draft?.ctas) ? draft.ctas : []);
        setSelectedCTA(draft?.selectedCTA || null);
        setCurrentStep(Number.isFinite(draft?.currentStep) ? Math.min(draft.currentStep, 4) : 0);
        setShowFinalPanel(false);
      }
    } catch {
      // Ignore malformed local drafts and let the wizard start clean.
    } finally {
      hasHydratedRef.current = true;
    }
  }, [
    storageKey,
    hasExplicitPrefill,
    prefillGoal,
    prefillPlatform,
    prefillTopic,
    prefillHook,
    prefillCaption,
    location.pathname,
    location.search,
    navigate,
  ]);

  // HUTTLE AI: brand context injected — pre-fill topic from niche and platform from brand profile (default only)
  useEffect(() => {
    if (!hasHydratedRef.current || hasExplicitPrefill || trendingBanner) return;
    if (trendingContextRef.current?.source === 'trending') return;
    if (userEditedTopicRef.current) return;
    if (!topic.trim() && brandData?.niche) {
      const niche = Array.isArray(brandData.niche) ? brandData.niche[0] : brandData.niche;
      if (niche?.trim()) setTopic(niche.trim());
    }
    if (platform === 'instagram' && brandData?.platforms?.length > 0) {
      const firstPlatform = typeof brandData.platforms[0] === 'object'
        ? brandData.platforms[0].name
        : brandData.platforms[0];
      if (firstPlatform) setPlatform(firstPlatform.toLowerCase());
    }
  }, [brandData, hasExplicitPrefill, trendingBanner, topic, platform]);

  // Save draft to localStorage
  useEffect(() => {
    if (!hasHydratedRef.current) return;

    if (!topic.trim()) {
      localStorage.removeItem(storageKey);
      return;
    }

    const draft = {
      topic,
      platform,
      goal,
      selectedHookType,
      hooks,
      selectedHook,
      caption,
      hashtags,
      ctas,
      selectedCTA,
      currentStep,
    };

    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [topic, platform, goal, selectedHookType, hooks, selectedHook, caption, hashtags, ctas, selectedCTA, currentStep, storageKey]);

  const platformData = getPlatform(platform);

  const fpbAiSnippets = useMemo(() => {
    const rulesKey = normalizePlatformRulesKey(platform) || 'instagram';
    const rules = PLATFORM_CONTENT_RULES[rulesKey] || PLATFORM_CONTENT_RULES.instagram;
    const visible =
      rules.caption.visibleBeforeTruncation
      ?? rules.caption.descriptionVisibleInSearch
      ?? rules.caption.titleVisibleInSearch
      ?? rules.caption.maxChars
      ?? '—';
    const optimal =
      rules.caption.optimalChars
      ?? (rules.caption.maxChars != null ? `${rules.caption.maxChars} chars max` : null)
      ?? (rules.caption.descriptionMaxChars != null ? `${rules.caption.descriptionMaxChars} description max` : null)
      ?? 'see platform limits';
    return {
      hookRequirement: `Hook requirement: ${rules.video?.hook || 'Grab attention immediately'}\n\n${getPlatformPromptRule(platform)}`,
      captionHints: `Caption visible limit: ${visible} chars.\nOptimal length: ${optimal}. ${rules.caption.tip}`,
      hashtagRules: `Hashtag rules: ${getHashtagConstraint(platform)}`,
      ctaHints: `CTA placement tip: ${rules.caption.tip}\nPlatform style: ${rules.promptRule}`,
    };
  }, [platform]);

  const assembledPost = useMemo(() => {
    const hashtagStr = hashtags.map((h) => h.tag).join(' ');
    return [selectedHook, caption, hashtagStr, selectedCTA?.cta].filter(Boolean).join('\n\n');
  }, [selectedHook, caption, hashtags, selectedCTA]);

  useEffect(() => {
    assembledPostRef.current = assembledPost;
  }, [assembledPost]);

  wizardRef.current = {
    topic,
    platform,
    goal,
    selectedHook,
    caption,
    captionLength,
    hashtags,
    selectedCTA,
    brandData,
  };

  const resetDownstream = (fromStep) => {
    if (fromStep <= 1) {
      setHooks([]);
      setSelectedHook(null);
      hooksRunPaidRef.current = false;
      setManualHookMode(false);
      setManualHookDraft('');
    }
    if (fromStep <= 2) {
      setCaption('');
      setCaptionStreamlinedNotice(null);
    }
    if (fromStep <= 3) {
      setHashtags([]);
      setHashtagStreamlinedNotice(null);
      setHashtagStepError(null);
    }
    if (fromStep <= 4) {
      setCtas([]);
      setSelectedCTA(null);
      setCustomCtaDraft('');
      setCtaStreamlinedNotice(null);
    }
    setShowFinalPanel(false);
  };

  const goToStep = (step) => {
    setDirection(step > currentStep ? 1 : -1);
    if (step < currentStep) resetDownstream(step + 1);
    if (step === 0) hooksRunPaidRef.current = false;
    setCurrentStep(step);
    setShowFinalPanel(false);
  };

  const applyManualHook = () => {
    const t = manualHookDraft.trim();
    if (t.length < 12) {
      addToast('Enter a hook with a bit more detail (at least 12 characters).', 'warning');
      return;
    }
    setHooks([t]);
    setSelectedHook(t);
    setManualHookMode(false);
    setHooksErrorHint(null);
    resetDownstream(2);
  };

  // Step 2: Generate hooks (Claude primary → Grok reasoning fallback; limited retries; Hook Builder fallback)
  const handleGenerateHooks = async (hookTypeOverride) => {
    if (!topic.trim()) { addToast('Enter a topic first', 'warning'); return; }
    // `onClick={handleGenerateHooks}` passes a SyntheticEvent — never treat that as a hook type.
    const effectiveHookType =
      typeof hookTypeOverride === 'string' && hookTypeOverride.trim()
        ? hookTypeOverride.trim()
        : selectedHookType;
    const rid = ++hooksReqIdRef.current;
    setHooksErrorHint(null);
    setManualHookMode(false);
    setLoadingHooks(true);
    try {
      const tc = trendingContextRef.current;
      const baseGoalLabel = GOALS.find((g) => g.id === goal)?.label || goal;
      const promptProfileForHooks = getPromptBrandProfile(brandData, { platforms: [platform] });
      const hookTopicFull = buildFullPostClaudeHookTopic(topic, tc);
      const goalForClaude = resolveClaudeHookGoalLabel(goal, baseGoalLabel);
      const audienceForClaude = resolveClaudeHookAudience(promptProfileForHooks, hookTopicFull);
      const toneForClaude = promptProfileForHooks.tone || 'authentic';

      const payload = {
        topic: hookTopicFull,
        hookType: effectiveHookType,
        platform,
        formatType: tc?.format_type,
        nicheAngle: tc?.niche_angle,
        trendDescription: tc?.description,
      };

      const maxAttempts = 3;
      let lastRes = null;

      const chargeOnceIfNeeded = async () => {
        if (hooksRunPaidRef.current) return true;
        const usage = await trackFeatureUsage({
          step: 'hooks',
          overallCredits: FULL_POST_BUILDER_CREDITS_PER_RUN,
        });
        if (!usage.allowed) {
          addToast('AI limit reached', 'warning');
          return false;
        }
        hooksRunPaidRef.current = true;
        return true;
      };

      const applyHookBatch = async (nextHooks, source) => {
        const ok = await chargeOnceIfNeeded();
        if (!ok) return false;
        const trimmed = nextHooks.slice(0, 6);
        setHooks(trimmed);
        setSelectedHook(trimmed[0]);
        resetDownstream(2);
        setHooksErrorHint(null);
        if (import.meta.env.DEV) {
          console.debug('[FullPostBuilder] Hooks applied', { source, count: trimmed.length });
        }
        return true;
      };

      if (import.meta.env.DEV) {
        console.info('[FullPostBuilder] Claude hooks input', {
          topic: hookTopicFull,
          platform,
          audience: audienceForClaude,
          goal: goalForClaude,
          tone: toneForClaude,
        });
      }

      const claudeRes = await generateFullPostHooksWithClaude(
        {
          topic: hookTopicFull,
          hookType: effectiveHookType,
          platform,
          goal: goalForClaude,
          audience: audienceForClaude,
          formatType: tc?.format_type,
          nicheAngle: tc?.niche_angle,
          trendDescription: tc?.description,
        },
        brandData,
        { fullPostBuilderHookRequirement: fpbAiSnippets.hookRequirement },
      );
      if (rid !== hooksReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale hooks (Claude) ignored', rid);
        return;
      }
      if (claudeRes.success && Array.isArray(claudeRes.hooks) && claudeRes.hooks.length > 0) {
        const applied = await applyHookBatch(claudeRes.hooks, 'claude');
        if (applied) return;
      } else if (import.meta.env.DEV) {
        console.warn('[FullPostBuilder] Claude hooks empty or failed, using Grok fallback', {
          code: claudeRes?.code,
          error: claudeRes?.error,
        });
        const errText = String(claudeRes?.error || '');
        if (errText.includes('404') || errText.toLowerCase().includes('not found')) {
          console.warn(
            '[FullPostBuilder] Claude proxy returned 404 — start the local API (npm run dev:local) so Vite can proxy /api to port 3001, or deploy with a working /api/ai/claude route.',
          );
        }
      }

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (rid !== hooksReqIdRef.current) {
          if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale hooks loop exit', rid);
          return;
        }
        if (attempt > 0) {
          const delayMs = 800 * 2 ** (attempt - 1);
          console.warn('[FullPostBuilder] Retrying hook generation', { attempt, delayMs, topic: topic.slice(0, 80) });
          await sleep(delayMs);
        }

        const res = await generateFullPostHooks(payload, brandData, {
          fullPostBuilderHookRequirement: fpbAiSnippets.hookRequirement,
        });
        lastRes = res;

        if (shouldSkipFullPostHookRetries(res.code)) {
          break;
        }

        if (rid !== hooksReqIdRef.current) return;

        if (res.success && Array.isArray(res.hooks) && res.hooks.length > 0) {
          await applyHookBatch(res.hooks, 'grok');
          return;
        }
      }

      if (rid !== hooksReqIdRef.current) return;

      if (shouldAttemptHookBuilderFallback(lastRes)) {
        try {
          const theme = mapFullPostHookTypeToHookBuilderTheme(effectiveHookType);
          const fb = await generateHooks(hookTopicFull, brandData, theme, platform, { skipRealtimeResearch: true });
          const list = extractHooksFromHookBuilderResult(fb);
          if (list.length > 0) {
            const applied = await applyHookBatch(list, 'backup');
            if (applied) return;
          }
        } catch (fbErr) {
          console.error('[FullPostBuilder] Hook Builder fallback failed', fbErr);
        }
      }

      console.error('[FullPostBuilder] Hook generation failed after retries', lastRes);
      const bucket = classifyGrokFailure(lastRes || {});
      const hint = lastRes?.code === 'GROK_AUTH_FAILED' && lastRes?.error
        ? lastRes.error
        : hookFailureUserMessage(bucket);
      setHooksErrorHint(hint);
      addToast(hint, 'error');
    } catch (e) {
      console.error('[FullPostBuilder] Hook generation error', e);
      const bucket = classifyGrokFailure({ code: e?.code, status: e?.status, error: e?.message });
      const hint = hookFailureUserMessage(bucket);
      setHooksErrorHint(hint);
      addToast(hint, 'error');
    } finally {
      if (rid === hooksReqIdRef.current) {
        setLoadingHooks(false);
      }
    }
  };

  // Step 3: Generate caption
  const handleGenerateCaption = async ({ forceFresh = false, captionLengthValue } = {}) => {
    const w = wizardRef.current;
    if (!w.selectedHook) return;
    const rid = ++captionReqIdRef.current;
    if (import.meta.env.DEV) {
      console.debug('[FullPostBuilder] caption generate start', { rid, forceFresh });
    }
    setLoadingCaption(true);
    setCaptionStreamlinedNotice(null);
    try {
      let captionText;
      const tc = trendingContextRef.current;
      const goalLabel = GOALS.find((g) => g.id === w.goal)?.label || w.goal;
      const resolvedCaptionLength = captionLengthValue ?? w.captionLength ?? 'long';
      const res = await generateCaption({
        topic: w.topic,
        platform: w.platform,
        selectedHook: w.selectedHook,
        goal: goalLabel,
        tone: w.brandData?.brandVoice || '',
        formatType: tc?.format_type,
        nicheAngle: tc?.niche_angle,
        trendDescription: tc?.description,
      }, w.brandData, {
        fullPostBuilder: true,
        forceFreshRegeneration: forceFresh ? makeFreshRegenNonce('cap') : undefined,
        fullPostBuilderCaptionHints: fpbAiSnippets.captionHints,
        captionLength: resolvedCaptionLength,
      });
      if (rid !== captionReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale caption response ignored', rid);
        return;
      }
      if (!res.success) {
        const bucket = classifyGrokFailure(res || {});
        addToast(stepToolFailureMessage('caption', bucket), 'error');
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption generate API fail', { rid, bucket });
        return;
      }
      if (res.success) {
        // res.captionVariants?.[0]?.caption is the happy path when the service parsed correctly.
        // extractField guards the fallback: if res.caption is a raw JSON string (service parse
        // failed and returned data.content verbatim), extract the .caption field from it rather
        // than rendering the entire JSON array to the user. If res.caption is already plain text
        // the JSON.parse inside extractField throws and returns the plain text as the fallback.
        const variantCaption = res.captionVariants?.[0]?.caption ?? '';
        const fallbackCaption = variantCaption || extractField(res.caption, 'caption', res.caption ?? '');
        captionText = String(fallbackCaption || '')
          .trim()
          .replace(/^\d+\.\s+/, '');
      }

      if (captionText) {
        setCaption(captionText);
        setCaptionStreamlinedNotice(res.streamlined ? 'Using streamlined caption generation right now.' : null);
        resetDownstream(3);
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption generate success', { rid });
      } else {
        addToast('We hit a temporary AI formatting issue. Try Regenerate or write your own caption.', 'warning');
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption generate empty payload', { rid });
      }
    } catch (e) {
      if (rid !== captionReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale caption error ignored', rid);
        return;
      }
      const bucket = classifyGrokFailure({ code: e?.code, status: e?.status, error: e?.message });
      addToast(stepToolFailureMessage('caption', bucket), 'error');
      if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption generate fail', { rid, bucket });
    } finally {
      if (rid === captionReqIdRef.current) {
        setLoadingCaption(false);
      }
    }
  };

  const handleEnhanceCaption = async () => {
    const w = wizardRef.current;
    const cap = String(caption || '').trim();
    if (!cap) {
      addToast('Generate or write a caption first', 'warning');
      return;
    }

    const rid = ++enhanceReqIdRef.current;
    const enhanceNonce = makeFreshRegenNonce('enh');
    const goalLabel = GOALS.find((g) => g.id === goal)?.label || goal;
    if (import.meta.env.DEV) {
      console.debug('[FullPostBuilder] caption enhance start', { rid });
    }
    setLoadingCaptionEnhancement(true);
    try {
      const claudeRes = await enhanceCaptionWithClaude({
        caption: cap,
        platform: w.platform,
        topic: w.topic,
        selectedHook: w.selectedHook,
        goal: goalLabel,
        audience: w.brandData?.targetAudience,
        brandVoice: w.brandData?.brandVoice,
      }, w.brandData);

      if (rid !== enhanceReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale enhance (Claude) ignored', rid);
        return;
      }

      if (claudeRes.success && claudeRes.caption) {
        setCaption(claudeRes.caption);
        resetDownstream(3);
        addToast('Caption updated.', 'success');
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption enhance success (Claude)', { rid });
        return;
      }

      if (import.meta.env.DEV) {
        console.debug('[FullPostBuilder] Claude enhance unavailable, trying Grok', claudeRes?.error);
      }

      const grokRes = await enhanceCaptionWithGrokFallback({
        caption: cap,
        platform: w.platform,
        topic: w.topic,
        selectedHook: w.selectedHook,
      }, w.brandData, { forceFreshRegeneration: enhanceNonce });
      if (rid !== enhanceReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale enhance (Grok) ignored', rid);
        return;
      }
      if (grokRes.success && grokRes.caption) {
        setCaption(grokRes.caption);
        resetDownstream(3);
        addToast('Caption updated.', 'success');
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption enhance success (Grok)', { rid });
      } else {
        addToast('Enhancement is temporarily unavailable. Your caption is unchanged — try again shortly or edit manually.', 'warning');
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption enhance fail', { rid });
      }
    } catch (e) {
      if (rid !== enhanceReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale enhance error ignored', rid);
        return;
      }
      addToast('Enhancement is temporarily unavailable. Your caption is unchanged — try again shortly or edit manually.', 'warning');
      if (import.meta.env.DEV) console.debug('[FullPostBuilder] caption enhance error', { rid, e });
    } finally {
      if (rid === enhanceReqIdRef.current) {
        setLoadingCaptionEnhancement(false);
      }
    }
  };

  // Step 4: Generate hashtags
  const handleGenerateHashtags = async ({ forceFresh = false } = {}) => {
    const w = wizardRef.current;
    const rid = ++hashtagReqIdRef.current;
    if (import.meta.env.DEV) {
      console.debug('[FullPostBuilder] hashtags generate start', { rid, forceFresh });
    }
    setLoadingHashtags(true);
    setHashtagStepError(null);
    setHashtagStreamlinedNotice(null);
    try {
      const goalLabel = GOALS.find((g) => g.id === w.goal)?.label || w.goal;
      const nicheKw = Array.isArray(brandData?.niche) ? brandData.niche.filter(Boolean).join(', ') : (brandData?.niche || '');

      const tagNonce = forceFresh ? makeFreshRegenNonce('tag') : undefined;
      const sonarRes = await generateFullPostHashtagsGrounded(
        {
          topic: w.topic,
          caption: w.caption,
          platform: w.platform,
          goal: goalLabel,
          selectedHook: w.selectedHook,
          nicheKeywords: nicheKw,
        },
        brandData,
        {
          forceFreshRegeneration: tagNonce,
          fullPostBuilderHashtagRules: fpbAiSnippets.hashtagRules,
        },
      );

      if (rid !== hashtagReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale hashtags response ignored', rid);
        return;
      }

      let res = sonarRes;
      const minHashtagsOk = getMinAcceptableHashtagCountForPlatform(w.platform);
      if (!sonarRes.success || !Array.isArray(sonarRes.hashtagData) || sonarRes.hashtagData.length < minHashtagsOk) {
        if (import.meta.env.DEV) {
          console.debug('[FullPostBuilder] Perplexity hashtags fallback to Grok', sonarRes?.code, sonarRes?.error);
        }
        res = await generateHashtags({
          topic: w.topic,
          platform: w.platform,
          selectedHook: w.selectedHook,
          caption: w.caption,
          goal: w.goal,
        }, w.brandData, w.platform, {
          fullPostBuilder: true,
          forceFreshRegeneration: tagNonce || makeFreshRegenNonce('tag-fb'),
          fullPostBuilderHashtagRules: fpbAiSnippets.hashtagRules,
        });
      }

      if (rid !== hashtagReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale hashtags (after fallback) ignored', rid);
        return;
      }

      if (res.success) {
        const parsed = Array.isArray(res.hashtagData) && res.hashtagData.length > 0
          ? res.hashtagData
          : parseHashtagsFromResponse(res.hashtags);
        const next = parsed.slice(0, getHashtagMaxForPlatform(w.platform));
        if (next.length === 0) {
          const msg = 'No usable hashtags returned. Try Regenerate or add your own.';
          setHashtagStepError(msg);
          addToast(msg, 'warning');
        } else {
          setHashtags(next);
          setHashtagStreamlinedNotice(
            res.streamlined ? 'Using streamlined hashtag generation right now.' : 'Hashtags grounded with live search where available.',
          );
          resetDownstream(4);
          if (import.meta.env.DEV) console.debug('[FullPostBuilder] hashtags generate success', { rid });
        }
      } else {
        const bucket = classifyGrokFailure(res);
        const msg = stepToolFailureMessage('hashtags', bucket);
        setHashtagStepError(msg);
        addToast(msg, 'error');
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] hashtags generate fail', { rid });
      }
    } catch (e) {
      if (rid !== hashtagReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale hashtags error ignored', rid);
        return;
      }
      const bucket = classifyGrokFailure({ code: e?.code, status: e?.status, error: e?.message });
      const msg = stepToolFailureMessage('hashtags', bucket);
      setHashtagStepError(msg);
      addToast(msg, 'error');
      if (import.meta.env.DEV) console.debug('[FullPostBuilder] hashtags generate error', { rid });
    } finally {
      if (rid === hashtagReqIdRef.current) {
        setLoadingHashtags(false);
      }
    }
  };

  // Step 5: Generate CTAs
  const applyCustomCta = () => {
    const t = customCtaDraft.trim();
    if (t.length < 3) {
      addToast('Enter a short CTA (at least 3 characters).', 'warning');
      return;
    }
    setSelectedCTA({ style: 'Custom', cta: t, tip: '' });
  };

  const handleGenerateCTAs = async ({ forceFresh = false } = {}) => {
    const w = wizardRef.current;
    const rid = ++ctaReqIdRef.current;
    if (import.meta.env.DEV) {
      console.debug('[FullPostBuilder] CTA generate start', { rid, forceFresh });
    }
    setLoadingCTAs(true);
    setCtaStreamlinedNotice(null);
    try {
      const res = await generateStyledCTAs({
        promoting: w.topic,
        goalType: w.goal,
        selectedHook: w.selectedHook,
        caption: w.caption,
      }, w.brandData, w.platform, {
        fullPostBuilder: true,
        forceFreshRegeneration: forceFresh ? makeFreshRegenNonce('cta') : undefined,
        fullPostBuilderCtaHints: fpbAiSnippets.ctaHints,
      });
      if (rid !== ctaReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale CTA response ignored', rid);
        return;
      }
      if (res.success && Array.isArray(res.ctas) && res.ctas.length > 0) {
        setCtas(res.ctas.slice(0, 5));
        setSelectedCTA(null);
        setCustomCtaDraft('');
        setCtaStreamlinedNotice(res.streamlined ? 'Using streamlined CTA generation right now.' : null);
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] CTA generate success', { rid });
      } else {
        const bucket = classifyGrokFailure(res || {});
        addToast(stepToolFailureMessage('cta', bucket), 'warning');
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] CTA generate fail', { rid, bucket });
      }
    } catch (e) {
      if (rid !== ctaReqIdRef.current) {
        if (import.meta.env.DEV) console.debug('[FullPostBuilder] stale CTA error ignored', rid);
        return;
      }
      const bucket = classifyGrokFailure({ code: e?.code, status: e?.status, error: e?.message });
      addToast(stepToolFailureMessage('cta', bucket), 'error');
      if (import.meta.env.DEV) console.debug('[FullPostBuilder] CTA generate error', { rid });
    } finally {
      if (rid === ctaReqIdRef.current) {
        setLoadingCTAs(false);
      }
    }
  };


  const runDevFpSmokeTest = useCallback(async () => {
    const SMOKE_TOPIC = 'microneedling for acne scars';
    const plat = 'instagram';
    const goalId = 'engagement';
    const goalLabel = GOALS.find((g) => g.id === goalId)?.label || goalId;
    const log = (step, ok, detail) => {
      const msg = `[FPB Smoke] ${step} ${ok ? 'success' : 'fail'}`;
      if (ok) console.log(msg, detail !== undefined ? detail : '');
      else console.warn(msg, detail !== undefined ? detail : '');
    };

    const qualitySmokeOk = (qRes) => {
      if (!qRes?.success) return false;
      if (qRes.score?.overall != null) return true;
      try {
        const parsed =
          typeof qRes.analysis === 'string'
            ? JSON.parse(qRes.analysis.match(/\{[\s\S]*\}/)?.[0] || '{}')
            : qRes.analysis;
        const n = parsed?.totalScore ?? parsed?.overallScore ?? parsed?.overall;
        return n != null;
      } catch {
        return false;
      }
    };

    try {
      let hook0;
      const claudeHookRes = await generateFullPostHooksWithClaude(
        {
          topic: SMOKE_TOPIC,
          hookType: 'Question',
          platform: plat,
          goal: resolveClaudeHookGoalLabel(goalId, goalLabel),
          audience: inferDefaultHookAudienceFromTopic(SMOKE_TOPIC),
        },
        brandData,
      );
      if (claudeHookRes.success && Array.isArray(claudeHookRes.hooks) && claudeHookRes.hooks.length > 0) {
        hook0 = claudeHookRes.hooks[0];
        log('hooks', true, { count: claudeHookRes.hooks.length, source: 'claude' });
      } else {
        const grokHookRes = await generateFullPostHooks(
          { topic: SMOKE_TOPIC, hookType: 'Question', platform: plat },
          brandData,
        );
        if (!grokHookRes.success || !Array.isArray(grokHookRes.hooks) || grokHookRes.hooks.length === 0) {
          log('hooks', false, grokHookRes);
          return;
        }
        hook0 = grokHookRes.hooks[0];
        log('hooks', true, { count: grokHookRes.hooks.length, source: 'grok' });
      }

      const capRes = await generateCaption(
        {
          topic: SMOKE_TOPIC,
          platform: plat,
          selectedHook: hook0,
          goal: goalLabel,
          tone: brandData?.brandVoice || '',
        },
        brandData,
        { fullPostBuilder: true },
      );
      if (!capRes.success || !String(capRes.caption || '').trim()) {
        log('caption', false, capRes);
        return;
      }
      log('caption', true, { length: String(capRes.caption).length });

      const capTrimmed = String(capRes.caption).trim();
      let captionBody = capTrimmed;
      const enhClaude = await enhanceCaptionWithClaude(
        {
          caption: capTrimmed,
          platform: plat,
          topic: SMOKE_TOPIC,
          selectedHook: hook0,
          goal: goalLabel,
          audience: brandData?.targetAudience,
          brandVoice: brandData?.brandVoice,
        },
        brandData,
      );
      if (enhClaude.success && String(enhClaude.caption || '').trim()) {
        captionBody = String(enhClaude.caption).trim();
        log('enhance', true, { length: captionBody.length, source: 'claude' });
      } else {
        const enhGrok = await enhanceCaptionWithGrokFallback(
          {
            caption: capTrimmed,
            platform: plat,
            topic: SMOKE_TOPIC,
            selectedHook: hook0,
          },
          brandData,
          { forceFreshRegeneration: makeFreshRegenNonce('smoke-enh') },
        );
        if (enhGrok.success && String(enhGrok.caption || '').trim()) {
          captionBody = String(enhGrok.caption).trim();
          log('enhance', true, { length: captionBody.length, source: 'grok' });
        } else {
          log('enhance', false, { claude: enhClaude, grok: enhGrok });
        }
      }

      const nicheKw = Array.isArray(brandData?.niche)
        ? brandData.niche.filter(Boolean).join(', ')
        : (brandData?.niche || '');
      let tagSource = 'perplexity';
      let tagRes = await generateFullPostHashtagsGrounded(
        {
          topic: SMOKE_TOPIC,
          caption: capRes.caption,
          platform: plat,
          goal: goalLabel,
          selectedHook: hook0,
          nicheKeywords: nicheKw,
        },
        brandData,
        { forceFreshRegeneration: makeFreshRegenNonce('smoke-tag') },
      );
      const smokeMinTags = getMinAcceptableHashtagCountForPlatform(plat);
      if (!tagRes.success || !Array.isArray(tagRes.hashtagData) || tagRes.hashtagData.length < smokeMinTags) {
        tagSource = 'grok';
        tagRes = await generateHashtags(
          {
            topic: SMOKE_TOPIC,
            platform: plat,
            selectedHook: hook0,
            caption: capRes.caption,
            goal: goalId,
          },
          brandData,
          plat,
          { fullPostBuilder: true, forceFreshRegeneration: makeFreshRegenNonce('smoke-tag-fb') },
        );
      }
      const hashtagRows =
        Array.isArray(tagRes.hashtagData) && tagRes.hashtagData.length > 0
          ? tagRes.hashtagData
          : parseHashtagsFromResponse(tagRes.hashtags || '');
      log('hashtags', Boolean(tagRes.success && hashtagRows.length > 0), {
        count: hashtagRows.length,
        source: tagSource,
      });
      if (!tagRes.success || hashtagRows.length === 0) {
        return;
      }

      const ctaRes = await generateStyledCTAs(
        {
          promoting: SMOKE_TOPIC,
          goalType: goalId,
          selectedHook: hook0,
          caption: captionBody,
        },
        brandData,
        plat,
        { fullPostBuilder: true },
      );
      log('cta', Boolean(ctaRes.success && Array.isArray(ctaRes.ctas) && ctaRes.ctas.length > 0), ctaRes);
      if (!ctaRes.success || !ctaRes.ctas?.length) {
        return;
      }

      const hashtagStr = hashtagRows.map((h) => h.tag).join(' ');
      const ctaText = String(ctaRes.ctas[0]?.cta || '').trim();
      const assembled = [hook0, captionBody, hashtagStr, ctaText].filter(Boolean).join('\n\n');

      const qRes = await scoreContentQuality(assembled, brandData, { fullPostBuilder: true, platform: plat });
      let qualityOverall = qRes.score?.overall;
      if (qualityOverall == null && qRes.success) {
        try {
          const parsed =
            typeof qRes.analysis === 'string'
              ? JSON.parse(qRes.analysis.match(/\{[\s\S]*\}/)?.[0] || '{}')
              : qRes.analysis;
          const n = parsed?.totalScore ?? parsed?.overallScore ?? parsed?.overall;
          if (n != null) qualityOverall = n;
        } catch { /* keep null */ }
      }
      log('quality', qualitySmokeOk(qRes), { overall: qualityOverall });

      const humRes = await scoreHumanness(captionBody, brandData, { fullPostBuilder: true, platform: plat });
      log(
        'human',
        Boolean(humRes.success && humRes.score && humRes.score.overall != null && !humRes.unavailable),
        humRes.success && humRes.score ? { overall: humRes.score.overall } : humRes,
      );

      const algo = checkAlgorithmAlignment(assembled, plat);
      log('algorithm', Boolean(algo && algo.overallScore != null), { overallScore: algo?.overallScore });

      console.log('[FPB Smoke] pipeline complete');
    } catch (e) {
      console.error('[FPB Smoke] exception', e);
    }
  }, [brandData]);


  useEffect(() => {
    if (currentStep !== 2 || !captionTextareaRef.current) return;
    const textarea = captionTextareaRef.current;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [caption, currentStep]);

  const handleNext = async () => {
    if (currentStep === 0 && !topic.trim()) { addToast('Enter a topic', 'warning'); return; }
    if (currentStep < 4) {
      setDirection(1);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (nextStep === 1 && hooks.length === 0) void handleGenerateHooks();
      // Caption step: do NOT auto-generate — let the user choose Short/Long first, then click Generate.
      if (nextStep === 3 && hashtags.length === 0) void handleGenerateHashtags({ forceFresh: false });
      if (nextStep === 4 && ctas.length === 0) void handleGenerateCTAs({ forceFresh: false });
    } else {
      setShowFinalPanel(true);
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(assembledPost);
      setCopied(true);
      addToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch { addToast('Failed to copy', 'error'); }
  };

  const handleSaveToVault = async () => {
    if (!user?.id) return;
    try {
      const result = await saveToVault(user.id, buildContentVaultPayload({
        name: `Post - ${topic.slice(0, 50)}`,
        contentText: assembledPost,
        contentType: 'full_post',
        toolSource: 'full-post-builder',
        toolLabel: 'Full Post Builder',
        topic,
        platform,
        description: `Full Post Builder | ${platformData?.name || platform} | ${GOALS.find(g => g.id === goal)?.label || goal}`,
        metadata: {
          goal,
          user_id: user.id,
          saved_at: new Date().toISOString(),
        },
      }));
      if (result.success) {
        setSaved(true);
        addToast('Saved to vault ✓', 'success');
      } else {
        console.error('[FullPostBuilder] saveToVault failed:', result.error);
        addToast(result.error || 'Failed to save', 'error');
      }
    } catch (err) {
      console.error('[FullPostBuilder] saveToVault exception:', err);
      addToast('Failed to save', 'error');
    }
  };

  const handleSaveAsPostKit = () => {
    const hashtagStr = hashtags.map((h) => h.tag).filter(Boolean).join(' ').trim();
    const cap = String(caption || '').trim();
    const prefill = {};
    if (cap) prefill.caption = cap;
    if (hashtagStr) prefill.hashtags = hashtagStr;
    try {
      localStorage.setItem(
        POSTKIT_PENDING_STORAGE_KEY,
        JSON.stringify({
          platform,
          topic: topic.trim() || 'Untitled Kit',
          ...(Object.keys(prefill).length ? { prefill } : {}),
        }),
      );
    } catch (e) {
      console.error('[FullPostBuilder] post kit pending:', e);
      addToast('Could not open Post Kit', 'error');
      return;
    }
    navigate('/dashboard/post-kit/new');
  };

  const saveWizardPartToVault = async (key, contentText, contentType, label) => {
    if (!user?.id || !String(contentText || '').trim()) return;
    try {
      const result = await saveToVault(user.id, buildContentVaultPayload({
        name: `${label} - ${topic.slice(0, 40)}`,
        contentText: String(contentText).trim(),
        contentType,
        toolSource: 'full_post_builder',
        toolLabel: `Full Post Builder — ${label}`,
        topic,
        platform,
        description: `Full Post Builder | ${label}`,
        metadata: { goal, wizard_part: key },
      }));
      if (result.success) {
        setSavedPartIds((prev) => ({ ...prev, [key]: true }));
        addToast('Saved to vault ✓', 'success');
        setTimeout(() => setSavedPartIds((prev) => ({ ...prev, [key]: false })), 2500);
      } else {
        console.error('[FullPostBuilder] save part to vault failed:', key, result.error);
        addToast(result.error || 'Failed to save', 'error');
      }
    } catch (err) {
      console.error('[FullPostBuilder] save part to vault exception:', key, err);
      addToast('Failed to save', 'error');
    }
  };

  const handleStartOver = () => {
    userEditedTopicRef.current = false;
    setCurrentStep(0);
    setDirection(-1);
    setTopic('');
    setPlatform('instagram');
    setGoal('engagement');
    resetDownstream(0);
    setSaved(false);
    setCopied(false);
    localStorage.removeItem(storageKey);
  };

  if (!hasAccess) {
    return (
      <div className="flex-1 ml-0 md:ml-12 lg:ml-64 pt-16 md:pt-20 p-4 md:p-8">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-6">
            <PenLine className="w-8 h-8 text-huttle-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Full Post Builder</h2>
          <p className="text-gray-600 mb-2">A guided 5-step AI workflow that chains your topic into a complete, publish-ready post — hook, caption, hashtags, and CTA assembled seamlessly.</p>
          <p className="text-sm text-gray-500 mb-6">Available on Essentials, Pro, and Founders Club plans.</p>
          <button onClick={() => setShowUpgradeModal(true)} className="px-6 py-3 bg-huttle-primary text-white rounded-xl font-semibold hover:bg-huttle-primary-dark hover:shadow-lg transition-all">
            Upgrade to Unlock
          </button>
          <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="fullPostBuilder" featureName="Full Post Builder" />
        </div>
      </div>
    );
  }

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -200 : 200, opacity: 0 }),
  };

  const topicPreview = topic.trim() || (Array.isArray(brandData?.niche) ? brandData.niche[0] : brandData?.niche) || 'your niche';

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 sm:px-6 lg:px-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {loadingHooks && (
        <LoadingSpinner
          fullScreen
          variant="huttle"
          text="Crafting scroll-stopping hooks…"
        />
      )}
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="pt-6 md:pt-0 mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <PenLine className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Full Post Builder</h1>
              <p className="text-sm md:text-base text-gray-500">One topic &rarr; one publish-ready post</p>
            </div>
          </div>
          <div className="mt-3">
            <AIUsageMeter
              used={featureUsed}
              limit={featureLimit}
              label="Full Post runs this month"
              compact
            />
            <p className="mt-1 text-xs text-gray-500">
              Each run uses {FULL_POST_BUILDER_CREDITS_PER_RUN} AI credits when hooks generate; caption, hashtags, and CTA steps in the same session do not charge extra runs.
            </p>
          </div>
          {import.meta.env.DEV && FPB_DEV_SMOKE_UI_ENABLED && (
            <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
              <button
                type="button"
                className="font-semibold text-amber-950 underline-offset-2 hover:underline"
                onClick={() => void runDevFpSmokeTest()}
              >
                Run Smoke Test
              </button>
              <span className="ml-2 text-amber-900/90">
                Console: [FPB Smoke] … — requires login and local API (npm run dev).
              </span>
            </div>
          )}
        </div>

        {/* Stepper — compact on mobile */}
        {!showFinalPanel && (
          <div className="mb-6 md:mb-8">
            <div className="md:hidden">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-900">
                <span>
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <span className="font-medium text-huttle-primary">{STEPS[currentStep].label}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-huttle-primary transition-all duration-300 ease-out"
                  style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="hidden items-center justify-between md:flex">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => idx <= currentStep && goToStep(idx)}
                    disabled={idx > currentStep}
                    className={`flex items-center gap-2 ${idx <= currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                        idx === currentStep
                          ? 'bg-huttle-primary text-white shadow-md shadow-huttle-primary/30'
                          : idx < currentStep
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span
                      className={`hidden text-xs font-medium sm:inline ${
                        idx === currentStep ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 rounded ${idx < currentStep ? 'bg-green-400' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        {!showFinalPanel && (
          <AnimatePresence mode="wait" custom={direction}>
            <Motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 animate-fadeIn"
            >
              {trendingBanner && (
                <div
                  data-testid="trending-context-banner"
                  className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50/90 dark:bg-cyan-950/40 dark:border-cyan-800 px-4 py-3 text-sm text-gray-800 dark:text-gray-100"
                >
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <p className="font-semibold">
                        Building from trending topic: &quot;{sanitizeAIOutput(trendingBanner.topic)}&quot;
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Format: {trendingBanner.format_type || '—'} | Platform: {getPlatform(trendingBanner.platform || platform)?.name || trendingBanner.platform}
                      </p>
                      {trendingBanner.niche_angle && (
                        <p className="text-xs mt-2 text-gray-700 dark:text-gray-200">
                          Tip: {sanitizeAIOutput(trendingBanner.niche_angle)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">{currentStep + 1}</span>
                {STEPS[currentStep].description}
              </h2>

              {/* Step 1: Topic */}
              {currentStep === 0 && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Post topic or idea</label>
                    <textarea
                      value={topic}
                      onChange={(e) => {
                        userEditedTopicRef.current = true;
                        setTopic(e.target.value);
                        resetDownstream(1);
                      }}
                      placeholder="e.g., 5 morning habits that changed my productivity"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-base leading-relaxed outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/30 md:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
                    <PlatformSelector value={platform} onChange={(v) => { setPlatform(v); resetDownstream(1); }} showTips={false} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Goal</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                            onClick={() => { setGoal(g.id); resetDownstream(1); }}
                          className={`min-h-[44px] px-3 py-2.5 rounded-xl text-base font-medium border transition-all sm:text-sm ${
                            goal === g.id
                              ? 'bg-huttle-primary/5 border-huttle-primary/30 text-huttle-primary ring-1 ring-huttle-primary/20'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {brandData?.brandVoice && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-huttle-50 border border-huttle-100 rounded-xl">
                      <Sparkles className="w-4 h-4 text-huttle-primary" />
                      <span className="text-xs text-gray-700">Brand voice: <strong>{brandData.brandVoice}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Hook */}
              {currentStep === 1 && (
                <div className="space-y-4 mt-4">
                  <div className="rounded-xl border border-huttle-primary/15 bg-huttle-primary/5 px-4 py-3 flex gap-3">
                    <HelpCircle className="w-5 h-5 text-huttle-primary flex-shrink-0 mt-0.5" aria-hidden />
                    <div className="text-sm text-gray-700">
                      <p className="font-medium text-gray-900">What&apos;s a hook?</p>
                      <p className="mt-1 text-gray-600">
                        A hook is your post&apos;s opening line — it&apos;s what stops someone from scrolling. Think of it as your headline.
                      </p>
                    </div>
                  </div>
                  {hooksErrorHint && (
                    <div
                      role="alert"
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                    >
                      <p>{hooksErrorHint}</p>
                      <p className="mt-2 text-xs text-amber-900/90">
                        <Link
                          to="/dashboard/ai-tools?tab=hooks"
                          className="font-medium text-huttle-primary hover:text-huttle-primary-dark underline-offset-2 hover:underline"
                        >
                          Open Hook Builder
                        </Link>
                        {' '}if you need hooks right away.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setManualHookMode(true);
                        setHooksErrorHint(null);
                      }}
                      className="text-sm font-medium text-huttle-primary hover:text-huttle-primary-dark underline-offset-2 hover:underline"
                    >
                      Skip AI and write my own hook
                    </button>
                  </div>
                  {manualHookMode && (
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/90 p-4">
                      <label htmlFor="full-post-manual-hook" className="block text-sm font-medium text-gray-700">
                        Paste or type your hook
                      </label>
                      <textarea
                        id="full-post-manual-hook"
                        value={manualHookDraft}
                        onChange={(e) => setManualHookDraft(e.target.value)}
                        rows={3}
                        placeholder="Your opening line — the first thing viewers read."
                        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/30"
                      />
                      <button
                        type="button"
                        onClick={applyManualHook}
                        className="rounded-xl bg-huttle-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-huttle-primary-dark transition-colors"
                      >
                        Use this hook
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hook type</label>
                    <p className="text-xs text-gray-500 mb-3">Each style uses a different psychological pull. Pick one, then choose a generated line below.</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {HOOK_TYPES.map((type) => {
                        const help = getHookTypeHelp(type, topicPreview);
                        const isSel = selectedHookType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setSelectedHookType(type);
                              setHooks([]);
                              setSelectedHook(null);
                              setHooksErrorHint(null);
                              setManualHookMode(false);
                              setManualHookDraft('');
                              resetDownstream(2);
                              void handleGenerateHooks(type);
                            }}
                            className={`text-left rounded-xl border p-3 transition-all ${
                              isSel
                                ? 'border-huttle-primary/40 bg-huttle-primary/5 ring-1 ring-huttle-primary/20'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <span className="text-xs font-semibold text-gray-900">{type}</span>
                            <p className="text-[11px] text-gray-600 mt-1 leading-snug">{help.blurb}</p>
                            <p className="text-[11px] text-huttle-primary/90 mt-2 italic leading-snug">&ldquo;{sanitizeAIOutput(help.example)}&rdquo;</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {!loadingHooks && hooks.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pick a hook</p>
                      {hooks.map((hook, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setSelectedHook(hook); resetDownstream(2); }}
                          className={`w-full text-left rounded-xl border p-4 shadow-sm transition-all ${
                            selectedHook === hook
                              ? 'bg-huttle-primary/5 border-huttle-primary/30 ring-2 ring-huttle-primary/20'
                              : 'bg-white border-gray-200 hover:border-huttle-primary/25'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{sanitizeAIOutput(hook)}</p>
                            {selectedHook === hook && <Check className="w-5 h-5 text-huttle-primary flex-shrink-0" />}
                          </div>
                          <span className="text-xs text-gray-400 mt-2 inline-block">{selectedHookType} · Option {i + 1}</span>
                        </button>
                      ))}
                    </div>
                  ) : !loadingHooks ? (
                    <div className="text-center py-8 text-gray-400">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hooks generated yet — use Next from Step 1 or Regenerate below</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleGenerateHooks()}
                      disabled={loadingHooks}
                      className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingHooks ? 'animate-spin' : ''}`} /> Regenerate hooks
                    </button>
                    {selectedHook && (
                      <button
                        type="button"
                        onClick={() => saveWizardPartToVault('hook', selectedHook, 'hook', 'Hook')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:border-huttle-primary/40 text-gray-700"
                        data-testid="full-post-save-hook-vault"
                      >
                        {savedPartIds.hook ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Saved ✓</span></> : <><FolderPlus className="w-3.5 h-3.5 text-huttle-primary" /><span>Save hook to Vault</span></>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Caption */}
              {currentStep === 2 && (
                <div className="space-y-4 mt-4">
                  {/* Caption length toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Caption style:</span>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          setCaptionLength('short');
                          if (caption) void handleGenerateCaption({ forceFresh: true, captionLengthValue: 'short' });
                        }}
                        disabled={loadingCaption}
                        className={`px-3 py-1.5 transition-colors ${captionLength === 'short' ? 'bg-huttle-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        Short
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCaptionLength('long');
                          if (caption) void handleGenerateCaption({ forceFresh: true, captionLengthValue: 'long' });
                        }}
                        disabled={loadingCaption}
                        className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${captionLength === 'long' ? 'bg-huttle-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        Long
                      </button>
                    </div>
                    {captionLength === 'short' && (
                      <span className="text-xs text-gray-400">1–2 sentences</span>
                    )}
                  </div>
                  {loadingCaption ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-huttle-primary/20 bg-huttle-primary/5 py-10">
                      <RefreshCw className="w-6 h-6 text-huttle-primary animate-spin" />
                      <p className="text-sm font-medium text-huttle-primary">
                        Generating {captionLength === 'short' ? 'short' : 'long'} caption…
                      </p>
                    </div>
                  ) : caption ? (
                    <>
                      <textarea
                        ref={captionTextareaRef}
                        value={caption}
                        onChange={(e) => {
                          setCaption(e.target.value);
                          resetDownstream(3);
                        }}
                        placeholder="Your caption will appear here..."
                        rows={8}
                        className="min-h-[12rem] w-full overflow-hidden rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary transition-all outline-none resize-none"
                      />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          Caption length: <span className="font-medium text-gray-700 tabular-nums">{caption.length}</span>
                          {' '}characters
                        </span>
                        <span className={caption.length > (platformData?.charLimit || 2200) ? 'text-red-500 font-medium' : ''}>
                          Limit: {(platformData?.charLimit || 2200).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleGenerateCaption({ forceFresh: false })}
                      disabled={!selectedHook}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-huttle-primary/30 bg-huttle-primary/5 px-4 py-8 text-sm font-medium text-huttle-primary hover:bg-huttle-primary/10 hover:border-huttle-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate {captionLength === 'short' ? 'short' : 'long'} caption
                    </button>
                  )}
                  {caption && (
                    <button
                      type="button"
                      onClick={() => void handleGenerateCaption({ forceFresh: true })}
                      disabled={loadingCaption || !selectedHook}
                      className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingCaption ? 'animate-spin' : ''}`} /> Regenerate caption
                    </button>
                  )}
                  {captionStreamlinedNotice && (
                    <p className="text-xs text-gray-500">{captionStreamlinedNotice}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleEnhanceCaption()}
                      disabled={loadingCaptionEnhancement || loadingCaption || !caption.trim()}
                      className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${loadingCaptionEnhancement ? 'animate-pulse' : ''}`} /> {loadingCaptionEnhancement ? 'Enhancing…' : 'Enhance'}
                    </button>
                    {caption.trim() && (
                      <button
                        type="button"
                        onClick={() => saveWizardPartToVault('caption', caption, 'caption', 'Caption')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:border-huttle-primary/40 text-gray-700"
                        data-testid="full-post-save-caption-vault"
                      >
                        {savedPartIds.caption ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Saved ✓</span></> : <><FolderPlus className="w-3.5 h-3.5 text-huttle-primary" /><span>Save caption to Vault</span></>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Hashtags */}
              {currentStep === 3 && (
                <div className="space-y-4 mt-4">
                  {hashtagStepError && (
                    <div
                      role="alert"
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                    >
                      {hashtagStepError}
                    </div>
                  )}
                  {hashtagStreamlinedNotice && (
                    <p className="text-xs text-gray-500">{hashtagStreamlinedNotice}</p>
                  )}
                  {loadingHashtags ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-huttle-primary/20 bg-huttle-primary/5 py-10">
                      <RefreshCw className="w-6 h-6 text-huttle-primary animate-spin" />
                      <p className="text-sm font-medium text-huttle-primary">Generating hashtags…</p>
                    </div>
                  ) : hashtags.length > 0 ? (
                    <div className="space-y-1.5">
                      {hashtags.map((ht, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{ht.tag}</span>
                            {ht.tier && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 uppercase">{ht.tier}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            {Number.isFinite(Number(ht.score)) && (
                              <span className="text-xs text-huttle-primary font-medium">{ht.score}%</span>
                            )}
                            <button onClick={() => setHashtags(hashtags.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hashtags generated yet</p>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleGenerateHashtags({ forceFresh: true })}
                      disabled={loadingHashtags}
                      className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingHashtags ? 'animate-spin' : ''}`} /> Regenerate hashtags
                    </button>
                    {hashtags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => saveWizardPartToVault('hashtags', hashtags.map((h) => h.tag).join(' '), 'hashtag', 'Hashtags')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:border-huttle-primary/40 text-gray-700"
                        data-testid="full-post-save-hashtags-vault"
                      >
                        {savedPartIds.hashtags ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Saved ✓</span></> : <><FolderPlus className="w-3.5 h-3.5 text-huttle-primary" /><span>Save hashtags to Vault</span></>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: CTA */}
              {currentStep === 4 && (
                <div className="space-y-4 mt-4">
                  {ctaStreamlinedNotice && (
                    <p className="text-xs text-gray-500">{ctaStreamlinedNotice}</p>
                  )}
                  {loadingCTAs ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-huttle-primary/20 bg-huttle-primary/5 py-10">
                      <RefreshCw className="w-6 h-6 text-huttle-primary animate-spin" />
                      <p className="text-sm font-medium text-huttle-primary">Generating CTAs…</p>
                    </div>
                  ) : ctas.length > 0 ? (
                    <div className="space-y-2">
                      {ctas.map((cta, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setCustomCtaDraft('');
                            setSelectedCTA(cta);
                          }}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedCTA?.cta === cta.cta
                              ? 'bg-huttle-primary/5 border-huttle-primary/30 ring-2 ring-huttle-primary/20'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-medium text-gray-400 uppercase">{cta.style}</span>
                              <p className="text-sm font-medium text-gray-900 mt-0.5">{sanitizeAIOutput(cta.cta)}</p>
                            </div>
                            {selectedCTA?.cta === cta.cta && <Check className="w-5 h-5 text-huttle-primary flex-shrink-0" />}
                          </div>
                          {cta.tip && <p className="text-xs text-gray-500 mt-1">{sanitizeAIOutput(cta.tip)}</p>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No CTAs generated yet</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 space-y-2">
                    <label htmlFor="full-post-custom-cta" className="block text-sm font-medium text-gray-700">
                      Or write your own CTA
                    </label>
                    <textarea
                      id="full-post-custom-cta"
                      value={customCtaDraft}
                      onChange={(e) => setCustomCtaDraft(e.target.value)}
                      rows={2}
                      placeholder="e.g. Comment SAVE if you want the checklist."
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/30"
                    />
                    <button
                      type="button"
                      onClick={applyCustomCta}
                      className="text-sm font-semibold text-huttle-primary hover:text-huttle-primary-dark"
                    >
                      Use this CTA
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleGenerateCTAs({ forceFresh: true })}
                      disabled={loadingCTAs}
                      className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingCTAs ? 'animate-spin' : ''}`} /> Regenerate CTAs
                    </button>
                    {selectedCTA?.cta && (
                      <button
                        type="button"
                        onClick={() => saveWizardPartToVault('cta', selectedCTA.cta, 'cta', 'CTA')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:border-huttle-primary/40 text-gray-700"
                        data-testid="full-post-save-cta-vault"
                      >
                        {savedPartIds.cta ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Saved ✓</span></> : <><FolderPlus className="w-3.5 h-3.5 text-huttle-primary" /><span>Save CTA to Vault</span></>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-0 disabled:cursor-default"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 0 && !topic.trim()) ||
                    (currentStep === 1 && (!selectedHook || loadingHooks)) ||
                    (currentStep === 2 && !caption.trim()) ||
                    (currentStep === 4 && !selectedCTA)
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-xl font-semibold text-sm hover:bg-huttle-primary-dark hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  {currentStep === 4 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </Motion.div>
          </AnimatePresence>
        )}

        {/* Brand Context */}
        {!showFinalPanel && brandData?.niche && (
          <div className="mt-6 bg-huttle-50 rounded-xl border border-huttle-100 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-huttle-primary" />
              Your Brand Context
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              <p><span className="text-gray-400">Niche:</span> {brandData.niche}</p>
              {brandData.targetAudience && (
                <p><span className="text-gray-400">Audience:</span> {brandData.targetAudience}</p>
              )}
              {brandData.brandVoice && (
                <p><span className="text-gray-400">Voice:</span> {brandData.brandVoice}</p>
              )}
            </div>
          </div>
        )}

        {/* Final Output Panel */}
        {showFinalPanel && (
          <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Platform Badge */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                {platformData?.name || platform}
              </span>
              <span className="text-xs text-gray-500">
                Assembled post length:{' '}
                <span className="font-medium text-gray-700 tabular-nums">{assembledPost.length}</span>
                {' '}characters
              </span>
            </div>

            {/* Assembled Post */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
              {selectedHook && (
                <div className="bg-huttle-50 border border-huttle-100 rounded-xl px-4 py-3">
                  <span className="text-[10px] font-medium text-huttle-primary uppercase tracking-wide">Hook</span>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{sanitizeAIOutput(selectedHook)}</p>
                </div>
              )}

              {caption && (
                <div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Caption</span>
                  <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{sanitizeAIOutput(caption)}</p>
                </div>
              )}

              {hashtags.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Hashtags</span>
                  <p className="text-sm text-gray-600 mt-1">{hashtags.map((h) => h.tag).join(' ')}</p>
                </div>
              )}

              {selectedCTA && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">CTA — {selectedCTA.style}</span>
                  <p className="text-sm font-medium text-blue-800 mt-0.5">{sanitizeAIOutput(selectedCTA.cta)}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-gray-800 sm:w-auto sm:min-h-0 sm:py-2.5 sm:text-sm"
              >
                {copied ? <Check className="h-5 w-5 sm:h-4 sm:w-4" /> : <Copy className="h-5 w-5 sm:h-4 sm:w-4" />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
              <button
                type="button"
                onClick={handleSaveToVault}
                disabled={saved}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-huttle-primary px-4 py-3 text-base font-medium text-white transition-all hover:bg-huttle-primary-dark hover:shadow-lg disabled:opacity-60 sm:w-auto sm:min-h-0 sm:py-2.5 sm:text-sm"
              >
                {saved ? <Check className="h-5 w-5 sm:h-4 sm:w-4" /> : <FolderPlus className="h-5 w-5 sm:h-4 sm:w-4" />}
                {saved ? 'Saved ✓' : 'Save to Vault'}
              </button>
              <button
                type="button"
                onClick={handleSaveAsPostKit}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-huttle-primary/40 bg-white px-4 py-3 text-base font-medium text-huttle-primary transition-colors hover:bg-huttle-primary/5 sm:w-auto sm:min-h-0 sm:py-2.5 sm:text-sm"
              >
                <Package className="h-5 w-5 sm:h-4 sm:w-4" />
                Save as Post Kit
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto sm:min-h-0 sm:py-2.5 sm:text-sm"
              >
                <RotateCcw className="h-5 w-5 sm:h-4 sm:w-4" /> Start Over
              </button>
              <button
                type="button"
                onClick={() => { setShowFinalPanel(false); setCurrentStep(0); }}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto sm:min-h-0 sm:py-2.5 sm:text-sm"
              >
                <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" /> Edit Steps
              </button>
            </div>

            <AIDisclaimerFooter />
          </Motion.div>
        )}
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="fullPostBuilder" featureName="Full Post Builder" />
    </div>
  );
}
