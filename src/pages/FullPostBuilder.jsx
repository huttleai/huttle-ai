import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Lightbulb, PenTool, PenLine, Hash, MessageSquare, Check, ChevronLeft,
  ChevronRight, Copy, FolderPlus, RotateCcw, RefreshCw, X, Sparkles,
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildContentVaultPayload } from '../utils/contentVault';
import { enhanceCaptionWithClaude } from '../services/claudeAPI';

const STORAGE_KEY_PREFIX = 'fullPostBuilderDraft';

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
  const hooks = [];
  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const cleaned = line.replace(/^\d+[.)]\s*/, '').trim();
    if (cleaned && cleaned.length > 3) {
      hooks.push(cleaned);
    }
  }
  return hooks.slice(0, 4);
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

function hasConfiguredNiche(brandData) {
  if (Array.isArray(brandData?.niche)) {
    return brandData.niche.some((value) => value?.trim());
  }

  return Boolean(brandData?.niche?.trim());
}

export default function FullPostBuilder() {
  const { brandData, loading: isBrandLoading } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { checkFeatureAccess } = useSubscription();
  const { addToast } = useToast();
  const { featureUsed, featureLimit, trackFeatureUsage } = useAIUsage('fullPostBuilder');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const hasAccess = checkFeatureAccess('full-post-builder');
  const isBrandVoiceComplete = hasConfiguredNiche(brandData);
  const storageKey = useMemo(() => `${STORAGE_KEY_PREFIX}:${user?.id || 'guest'}`, [user?.id]);
  const hasHydratedRef = useRef(false);

  const prefillTopic = searchParams.get('topic')?.trim() || '';
  const prefillPlatform = searchParams.get('platform')?.trim() || '';
  const prefillGoal = searchParams.get('goal')?.trim() || '';
  const hasExplicitPrefill = Boolean(prefillTopic || prefillPlatform || prefillGoal);

  // Hydrate from URL params and local draft.
  useEffect(() => {
    try {
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
  }, [storageKey, hasExplicitPrefill, prefillGoal, prefillPlatform, prefillTopic]);

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

  // Step 2: Generate hooks
  const handleGenerateHooks = async () => {
    if (!topic.trim()) { addToast('Enter a topic first', 'warning'); return; }
    setLoadingHooks(true);
    try {
      const usage = await trackFeatureUsage({ step: 'hooks' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingHooks(false); return; }

      const res = await generateFullPostHooks({
        topic,
        hookType: selectedHookType,
        platform,
      }, brandData);

      if (res.success && res.hooks) {
        const parsed = parseHooksFromText(res.hooks);
        setHooks(parsed.slice(0, 4));
        setSelectedHook(null);
        resetDownstream(2);
      } else {
        addToast('Failed to generate hooks', 'error');
      }
    } catch { addToast('Hook generation failed', 'error'); }
    finally { setLoadingHooks(false); }
  };

  // Step 3: Generate caption
  const handleGenerateCaption = async () => {
    if (!selectedHook) return;
    setLoadingCaption(true);
    try {
      const usage = await trackFeatureUsage({ step: 'caption' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingCaption(false); return; }

      let captionText;
      const res = await generateCaption({
        topic,
        platform,
        selectedHook,
        goal: GOALS.find(g => g.id === goal)?.label || goal,
        tone: brandData?.brandVoice || '',
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
        addToast('Saved to Content Vault!', 'success');
      }
    } catch { addToast('Failed to save', 'error'); }
  };

  const handleStartOver = () => {
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

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
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
                      onChange={(e) => { setTopic(e.target.value); resetDownstream(1); }}
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
                  {!isBrandLoading && !isBrandVoiceComplete && (
                    <a href="/dashboard/brand-voice" className="inline-block text-xs text-amber-600 hover:text-amber-700 font-medium">
                      Add your Brand Voice for more personalized results →
                    </a>
                  )}
                </div>
              )}

              {/* Step 2: Hook */}
              {currentStep === 1 && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hook type</label>
                    <div className="flex flex-wrap gap-2">
                      {HOOK_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setSelectedHookType(type);
                            setHooks([]);
                            setSelectedHook(null);
                            resetDownstream(2);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                            selectedHookType === type
                              ? 'bg-huttle-primary/5 border-huttle-primary/30 text-huttle-primary ring-1 ring-huttle-primary/20'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  {loadingHooks ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                      ))}
                    </div>
                  ) : hooks.length > 0 ? (
                    <div className="space-y-2">
                      {hooks.map((hook, i) => (
                        <button
                          key={i}
                          onClick={() => { setSelectedHook(hook); resetDownstream(2); }}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedHook === hook
                              ? 'bg-huttle-primary/5 border-huttle-primary/30 ring-2 ring-huttle-primary/20'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{hook}</p>
                            {selectedHook === hook && <Check className="w-5 h-5 text-huttle-primary flex-shrink-0" />}
                          </div>
                          <span className="text-xs text-gray-400 mt-1 inline-block">{selectedHookType} variation {i + 1}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hooks generated yet</p>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateHooks}
                    disabled={loadingHooks}
                    className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHooks ? 'animate-spin' : ''}`} /> Regenerate hooks
                  </button>
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
                  <button
                    onClick={handleEnhanceCaption}
                    disabled={loadingCaptionEnhancement || !caption.trim()}
                    className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${loadingCaptionEnhancement ? 'animate-pulse' : ''}`} /> {loadingCaptionEnhancement ? 'Enhancing with Sonnet 4.6...' : 'Enhance with Sonnet 4.6'}
                  </button>
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
                  <button
                    onClick={handleGenerateHashtags}
                    disabled={loadingHashtags}
                    className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHashtags ? 'animate-spin' : ''}`} /> Regenerate hashtags
                  </button>
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
                              <p className="text-sm font-medium text-gray-900 mt-0.5">{cta.cta}</p>
                            </div>
                            {selectedCTA?.cta === cta.cta && <Check className="w-5 h-5 text-huttle-primary flex-shrink-0" />}
                          </div>
                          {cta.tip && <p className="text-xs text-gray-500 mt-1">{cta.tip}</p>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No CTAs generated yet</p>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateCTAs}
                    disabled={loadingCTAs}
                    className="flex items-center gap-1.5 text-sm text-huttle-primary hover:text-huttle-primary-dark font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCTAs ? 'animate-spin' : ''}`} /> Regenerate CTAs
                  </button>
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
                    isBrandLoading ||
                    (currentStep === 0 && !topic.trim()) ||
                    (currentStep === 1 && !selectedHook) ||
                    (currentStep === 2 && !caption.trim()) ||
                    (currentStep === 4 && !selectedCTA)
                  }
                  className="flex items-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-xl font-semibold text-sm hover:bg-huttle-primary-dark hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  {isBrandLoading ? 'Loading Brand Voice...' : currentStep === 4 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
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
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedHook}</p>
                </div>
              )}

              {caption && (
                <div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Caption</span>
                  <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{caption}</p>
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
                  <p className="text-sm font-medium text-blue-800 mt-0.5">{selectedCTA.cta}</p>
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
                {saved ? 'Saved!' : 'Save to Vault'}
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
