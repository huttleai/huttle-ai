import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Lightbulb, PenTool, PenLine, Hash, MessageSquare, Check, ChevronLeft,
  ChevronRight, Copy, FolderPlus, RotateCcw, RefreshCw, X, Sparkles, TrendingUp, HelpCircle,
} from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import useAIUsage from '../hooks/useAIUsage';
import PlatformSelector from '../components/PlatformSelector';
import AlgorithmChecker from '../components/AlgorithmChecker';
import HumanizerScore from '../components/HumanizerScore';
import ScoreBadge from '../components/ScoreBadge';
import UpgradeModal from '../components/UpgradeModal';
import AIUsageMeter from '../components/AIUsageMeter';
import { AIDisclaimerFooter } from '../components/AIDisclaimer';
import { generateFullPostHooks, generateCaption, generateHashtags, generateStyledCTAs, scoreContentQuality } from '../services/grokAPI';
import { saveContentLibraryItem } from '../config/supabase';
import { getPlatform } from '../utils/platformGuidelines';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { buildContentVaultPayload } from '../utils/contentVault';
import { enhanceCaptionWithClaude } from '../services/claudeAPI';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized
import LoadingSpinner from '../components/LoadingSpinner';

const STORAGE_KEY_PREFIX = 'fullPostBuilderDraft';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const HOOK_TYPES = ['Question', 'Teaser', 'Shocking Stat', 'Story', 'Bold Claim'];

function parseHooksFromText(text) {
  if (!text) return [];
  const raw = String(text).trim();

  try {
    const direct = JSON.parse(raw);
    if (Array.isArray(direct)) {
      return direct.map((h) => String(h || '').trim()).filter((h) => h.length > 2).slice(0, 6);
    }
    if (direct && typeof direct === 'object' && Array.isArray(direct.hooks)) {
      return direct.hooks.map((h) => String(h || '').trim()).filter((h) => h.length > 2).slice(0, 6);
    }
  } catch {
    /* fall through */
  }

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) {
    try {
      const parsed = JSON.parse(fence[1].trim());
      if (Array.isArray(parsed)) {
        return parsed.map((h) => String(h || '').trim()).filter((h) => h.length > 2).slice(0, 6);
      }
    } catch {
      /* fall through */
    }
  }

  const hooks = [];
  const lines = raw.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    let cleaned = line.replace(/^\d+[.)]\s*/, '').replace(/^[-*]\s*/, '').trim();
    cleaned = cleaned.replace(/^\*\*|\*\*$/g, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
    if (cleaned && cleaned.length > 2) {
      hooks.push(cleaned);
    }
  }
  return hooks.slice(0, 6);
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
  const { featureUsed, featureLimit, trackFeatureUsage } = useAIUsage('fullPostBuilder');
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

  // Step 3 state
  const [caption, setCaption] = useState('');
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingCaptionEnhancement, setLoadingCaptionEnhancement] = useState(false);

  // Step 4 state
  const [hashtags, setHashtags] = useState([]);
  const [loadingHashtags, setLoadingHashtags] = useState(false);

  // Step 5 state
  const [ctas, setCtas] = useState([]);
  const [selectedCTA, setSelectedCTA] = useState(null);
  const [loadingCTAs, setLoadingCTAs] = useState(false);

  // Score state
  const [qualityScore, setQualityScore] = useState(null);
  const [humanScore, setHumanScore] = useState(null);
  const [algorithmScore, setAlgorithmScore] = useState(null);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [savedPartIds, setSavedPartIds] = useState({});

  const hasAccess = checkFeatureAccess('full-post-builder');
  const storageKey = useMemo(() => `${STORAGE_KEY_PREFIX}:${user?.id || 'guest'}`, [user?.id]);
  const hasHydratedRef = useRef(false);
  const pendingTrendingRef = useRef(null);
  const appliedTrendingRef = useRef(false);
  /** After the user edits the topic field, never auto-reapply brand niche over their text. */
  const userEditedTopicRef = useRef(false);
  if (location.state?.source === 'trending') {
    pendingTrendingRef.current = location.state;
  }

  const prefillTopic = searchParams.get('topic')?.trim() || '';
  const prefillPlatform = searchParams.get('platform')?.trim() || '';
  const prefillGoal = searchParams.get('goal')?.trim() || '';
  const hasExplicitPrefill = Boolean(prefillTopic || prefillPlatform || prefillGoal);

  // Hydrate from URL params, trending navigation state, and local draft.
  useEffect(() => {
    try {
      const t = pendingTrendingRef.current;
      if (t?.source === 'trending' && !appliedTrendingRef.current) {
        appliedTrendingRef.current = true;
        pendingTrendingRef.current = null;
        trendingContextRef.current = t;
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
        setQualityScore(null);
        setHumanScore(null);
        setAlgorithmScore(null);
        navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
        hasHydratedRef.current = true;
        return;
      }

      if (appliedTrendingRef.current) {
        hasHydratedRef.current = true;
        return;
      }

      const draft = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const shouldStartFresh = hasExplicitPrefill;

      setTopic(prefillTopic || draft?.topic || '');
      setPlatform(prefillPlatform || draft?.platform || 'instagram');
      setGoal(prefillGoal || draft?.goal || 'engagement');
      setSelectedHookType(draft?.selectedHookType || HOOK_TYPES[0]);

      if (shouldStartFresh) {
        setHooks([]);
        setSelectedHook(null);
        setCaption('');
        setHashtags([]);
        setCtas([]);
        setSelectedCTA(null);
        setCurrentStep(0);
        setShowFinalPanel(false);
        setQualityScore(null);
        setHumanScore(null);
        setAlgorithmScore(null);
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
  }, [storageKey, hasExplicitPrefill, prefillGoal, prefillPlatform, prefillTopic, location.pathname, location.search, navigate]);

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

  const resetDownstream = (fromStep) => {
    if (fromStep <= 1) { setHooks([]); setSelectedHook(null); }
    if (fromStep <= 2) { setCaption(''); }
    if (fromStep <= 3) { setHashtags([]); }
    if (fromStep <= 4) { setCtas([]); setSelectedCTA(null); }
    setShowFinalPanel(false);
    setQualityScore(null);
    setHumanScore(null);
    setAlgorithmScore(null);
  };

  const goToStep = (step) => {
    setDirection(step > currentStep ? 1 : -1);
    if (step < currentStep) resetDownstream(step + 1);
    setCurrentStep(step);
    setShowFinalPanel(false);
  };

  // Step 2: Generate hooks (with retries — Grok occasionally returns empty or malformed lines)
  const handleGenerateHooks = async () => {
    if (!topic.trim()) { addToast('Enter a topic first', 'warning'); return; }
    setLoadingHooks(true);
    try {
      const usage = await trackFeatureUsage({ step: 'hooks' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingHooks(false); return; }

      const tc = trendingContextRef.current;
      const payload = {
        topic: topic.trim(),
        hookType: selectedHookType,
        platform,
        formatType: tc?.format_type,
        nicheAngle: tc?.niche_angle,
        trendDescription: tc?.description,
      };

      let lastErr = null;
      let parsed = [];

      for (let attempt = 0; attempt <= 2; attempt++) {
        if (attempt > 0) {
          console.warn('[FullPostBuilder] Retrying hook generation', { attempt, topic: topic.slice(0, 80) });
          await sleep(1000);
        }
        try {
          const res = await generateFullPostHooks(payload, brandData);
          const rawHooks = res.hooks ?? res.content ?? '';
          if (res.success && rawHooks) {
            parsed = parseHooksFromText(typeof rawHooks === 'string' ? rawHooks : String(rawHooks));
          }
          if (parsed.length > 0) break;
          lastErr = new Error('Empty or unparseable hook list');
        } catch (e) {
          lastErr = e;
          console.error('[FullPostBuilder] Hook generation attempt failed', { attempt, message: e?.message });
        }
      }

      if (parsed.length > 0) {
        setHooks(parsed.slice(0, 4));
        setSelectedHook(null);
        resetDownstream(2);
      } else {
        console.error('[FullPostBuilder] Hook generation failed after retries', lastErr);
        addToast('We could not generate hooks right now. Check your connection and try again.', 'error');
      }
    } catch (e) {
      console.error('[FullPostBuilder] Hook generation error', e);
      addToast('Hook generation failed. Please try again.', 'error');
    } finally {
      setLoadingHooks(false);
    }
  };

  // Step 3: Generate caption
  const handleGenerateCaption = async () => {
    if (!selectedHook) return;
    setLoadingCaption(true);
    try {
      const usage = await trackFeatureUsage({ step: 'caption' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingCaption(false); return; }

      let captionText;
      const tc = trendingContextRef.current;
      const res = await generateCaption({
        topic,
        platform,
        selectedHook,
        goal: GOALS.find(g => g.id === goal)?.label || goal,
        tone: brandData?.brandVoice || '',
        formatType: tc?.format_type,
        nicheAngle: tc?.niche_angle,
        trendDescription: tc?.description,
      }, brandData);
      if (res.success && res.caption) {
        const captions = res.caption.split(/\d+\.\s+/).filter(c => c.trim());
        captionText = captions[0]?.trim() || res.caption.trim();
      }
      
      if (captionText) {
        setCaption(captionText);
        resetDownstream(3);
      } else {
        addToast('Caption generation failed', 'error');
      }
    } catch { addToast('Caption generation failed', 'error'); }
    finally { setLoadingCaption(false); }
  };

  const handleEnhanceCaption = async () => {
    if (!caption.trim()) {
      addToast('Generate or write a caption first', 'warning');
      return;
    }

    setLoadingCaptionEnhancement(true);
    try {
      const usage = await trackFeatureUsage({ step: 'caption-enhancement' });
      if (!usage.allowed) {
        addToast('AI limit reached', 'warning');
        setLoadingCaptionEnhancement(false);
        return;
      }

      const res = await enhanceCaptionWithClaude({
        caption,
        platform,
        topic,
        selectedHook,
      }, brandData);

      if (res.success && res.caption) {
        setCaption(res.caption);
        resetDownstream(3);
        addToast('Caption enhanced with Sonnet 4.6', 'success');
      } else {
        addToast('Caption enhancement failed', 'error');
      }
    } catch (error) {
      addToast(error.message || 'Caption enhancement failed', 'error');
    } finally {
      setLoadingCaptionEnhancement(false);
    }
  };

  // Step 4: Generate hashtags
  const handleGenerateHashtags = async () => {
    setLoadingHashtags(true);
    try {
      const usage = await trackFeatureUsage({ step: 'hashtags' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingHashtags(false); return; }
      const res = await generateHashtags({
        topic,
        platform,
        selectedHook,
        caption,
        goal,
      }, brandData, platform);
      if (res.success) {
        const parsed = Array.isArray(res.hashtagData) && res.hashtagData.length > 0
          ? res.hashtagData
          : parseHashtagsFromResponse(res.hashtags);
        setHashtags(parsed.slice(0, 10));
        resetDownstream(4);
      }
    } catch { addToast('Hashtag generation failed', 'error'); }
    finally { setLoadingHashtags(false); }
  };

  // Step 5: Generate CTAs
  const handleGenerateCTAs = async () => {
    setLoadingCTAs(true);
    try {
      const usage = await trackFeatureUsage({ step: 'cta' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingCTAs(false); return; }
      const res = await generateStyledCTAs({
        promoting: topic,
        goalType: goal,
        selectedHook,
        caption,
      }, brandData, platform);
      if (res.success && res.ctas) {
        setCtas(res.ctas.slice(0, 5));
        setSelectedCTA(null);
      }
    } catch { addToast('CTA generation failed', 'error'); }
    finally { setLoadingCTAs(false); }
  };

  const handleNext = async () => {
    if (currentStep === 0 && !topic.trim()) { addToast('Enter a topic', 'warning'); return; }
    if (currentStep < 4) {
      setDirection(1);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (nextStep === 1 && hooks.length === 0) handleGenerateHooks();
      if (nextStep === 2 && !caption && selectedHook) handleGenerateCaption();
      if (nextStep === 3 && hashtags.length === 0) handleGenerateHashtags();
      if (nextStep === 4 && ctas.length === 0) handleGenerateCTAs();
    } else {
      setShowFinalPanel(true);
      runScoring();
    }
  };

  const assembledPost = [selectedHook, caption, hashtags.map(h => h.tag).join(' '), selectedCTA?.cta].filter(Boolean).join('\n\n');

  const runScoring = async () => {
    if (!assembledPost) return;
    setLoadingQuality(true);
    try {
      const res = await scoreContentQuality(assembledPost, brandData);
      if (res.success) {
        if (res.score?.overall != null) {
          setQualityScore(res.score.overall);
        } else {
          try {
            const parsed = typeof res.analysis === 'string' ? JSON.parse(res.analysis.match(/\{[\s\S]*\}/)?.[0] || '{}') : res.analysis;
            setQualityScore(parsed.totalScore || parsed.overallScore || parsed.overall || 0);
          } catch { setQualityScore(null); }
        }
      }
    } catch { /* silent */ }
    finally { setLoadingQuality(false); }
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
      const result = await saveContentLibraryItem(user.id, buildContentVaultPayload({
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
      }
    } catch { addToast('Failed to save', 'error'); }
  };

  const saveWizardPartToVault = async (key, contentText, contentType, label) => {
    if (!user?.id || !String(contentText || '').trim()) return;
    try {
      const result = await saveContentLibraryItem(user.id, buildContentVaultPayload({
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
      }
    } catch {
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

  const handleSchedulePost = () => {
    navigate('/dashboard', {
      state: {
        prefillContent: {
          title: `Post - ${topic.slice(0, 50)}`,
          caption: assembledPost,
          platforms: [platformData?.name || platform],
          source: 'full-post-builder',
          tool: 'full-post-builder',
        },
      },
    });
  };

  if (!hasAccess) {
    return (
      <div className="flex-1 ml-0 md:ml-64 pt-16 md:pt-20 p-4 md:p-8">
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
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      {(loadingHooks || loadingCaption || loadingHashtags || loadingCTAs || loadingQuality) && (
        <LoadingSpinner
          fullScreen
          variant="huttle"
          text={
            loadingHooks ? 'Crafting scroll-stopping hooks…'
              : loadingCaption ? 'Writing your caption…'
                : loadingHashtags ? 'Ranking hashtags…'
                  : loadingCTAs ? 'Generating CTAs…'
                    : 'Scoring your post…'
          }
        />
      )}
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
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
              label="Posts this month"
              compact
            />
          </div>
        </div>

        {/* Stepper */}
        {!showFinalPanel && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => idx <= currentStep && goToStep(idx)}
                    disabled={idx > currentStep}
                    className={`flex items-center gap-2 ${idx <= currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      idx === currentStep
                        ? 'bg-huttle-primary text-white shadow-md shadow-huttle-primary/30'
                        : idx < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {idx < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${
                      idx === currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded ${
                      idx < currentStep ? 'bg-green-400' : 'bg-gray-200'
                    }`} />
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
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary transition-all outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
                    <PlatformSelector value={platform} onChange={(v) => { setPlatform(v); resetDownstream(1); }} showTips={false} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Goal</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                            onClick={() => { setGoal(g.id); resetDownstream(1); }}
                          className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hook type</label>
                    <p className="text-xs text-gray-500 mb-3">Each style uses a different psychological pull. Pick one, then choose a generated line below.</p>
                    <div className="grid gap-2 sm:grid-cols-2">
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
                              resetDownstream(2);
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
                      onClick={handleGenerateHooks}
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
                  {loadingCaption ? (
                    <div className="space-y-2">
                      <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={caption}
                        onChange={(e) => {
                          setCaption(e.target.value);
                          resetDownstream(3);
                        }}
                        placeholder="Your caption will appear here..."
                        rows={8}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary transition-all outline-none resize-none"
                      />
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{caption.length} characters</span>
                        <span className={caption.length > (platformData?.charLimit || 2200) ? 'text-red-500 font-medium' : ''}>
                          Limit: {(platformData?.charLimit || 2200).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  <button
                    onClick={handleGenerateCaption}
                    disabled={loadingCaption || !selectedHook}
                    className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCaption ? 'animate-spin' : ''}`} /> Regenerate caption
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleEnhanceCaption}
                      disabled={loadingCaptionEnhancement || !caption.trim()}
                      className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${loadingCaptionEnhancement ? 'animate-pulse' : ''}`} /> {loadingCaptionEnhancement ? 'Enhancing with Sonnet 4.6...' : 'Enhance with Sonnet 4.6'}
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
                  {loadingHashtags ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
                      ))}
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
                            {ht.score > 0 && <span className="text-xs text-huttle-primary font-medium">{ht.score}%</span>}
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
                      onClick={handleGenerateHashtags}
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
                  {loadingCTAs ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : ctas.length > 0 ? (
                    <div className="space-y-2">
                      {ctas.map((cta, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedCTA(cta)}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleGenerateCTAs}
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
                    (currentStep === 1 && !selectedHook) ||
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
            {/* Score Badges */}
            <div className="flex flex-wrap gap-2">
              <ScoreBadge label="Quality" score={qualityScore} icon={Sparkles} loading={loadingQuality} thresholds={{ green: 80, teal: 60, amber: 40 }} />
              <HumanizerScore content={caption} onScoreChange={setHumanScore} onTrackUsage={trackFeatureUsage} onContentUpdate={(nextContent) => { setCaption(nextContent); resetDownstream(3); }} compact autoRun hideInput />
              <AlgorithmChecker content={assembledPost} platform={platform} onScoreChange={setAlgorithmScore} compact />
            </div>
            <p className="text-xs text-gray-400">
              Quality {qualityScore ?? '—'} · Human {humanScore ?? '—'} · Algorithm {algorithmScore ?? '—'}
            </p>

            {/* Platform Badge */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                {platformData?.name || platform}
              </span>
              <span className="text-xs text-gray-400">{assembledPost.length} chars</span>
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
              <button
                onClick={handleSaveToVault}
                disabled={saved}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-huttle-primary text-white rounded-xl text-sm font-medium hover:bg-huttle-primary-dark hover:shadow-lg disabled:opacity-60 transition-all"
              >
                {saved ? <Check className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                {saved ? 'Saved ✓' : 'Save to Vault'}
              </button>
              <button
                onClick={handleSchedulePost}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> Schedule
              </button>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Start Over
              </button>
              <button
                onClick={() => { setShowFinalPanel(false); setCurrentStep(0); }}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Edit Steps
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
