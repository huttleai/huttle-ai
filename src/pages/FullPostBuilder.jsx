import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Lightbulb, PenTool, PenLine, Hash, MessageSquare, Check, ChevronLeft,
  ChevronRight, Copy, FolderPlus, RotateCcw, RefreshCw, X, Sparkles,
} from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import { useIsMobile } from '../hooks/useIsMobile';
import useAIUsage from '../hooks/useAIUsage';
import PlatformSelector from '../components/PlatformSelector';
import AlgorithmChecker from '../components/AlgorithmChecker';
import HumanizerScore from '../components/HumanizerScore';
import ScoreBadge from '../components/ScoreBadge';
import UpgradeModal from '../components/UpgradeModal';
import { AIDisclaimerFooter } from '../components/AIDisclaimer';
import { generateHooks, generateCaption, generateHashtags, generateStyledCTAs, scoreContentQuality } from '../services/grokAPI';
import { callClaudeAPI } from '../services/claudeAPI';
import { saveContentLibraryItem } from '../config/supabase';
import { getPlatform } from '../utils/platformGuidelines';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'fullPostBuilderDraft';

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
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
    if (cleaned && cleaned.length > 3) {
      hooks.push(cleaned);
    }
  }
  return hooks.slice(0, 5);
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
  const { checkFeatureAccess, userTier } = useSubscription();
  const { addToast } = useToast();
  const isMobile = useIsMobile();
  const { trackFeatureUsage, canGenerate } = useAIUsage('fullPostBuilder');
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
  const [hooks, setHooks] = useState([]);
  const [selectedHook, setSelectedHook] = useState(null);
  const [loadingHooks, setLoadingHooks] = useState(false);

  // Step 3 state
  const [caption, setCaption] = useState('');
  const [loadingCaption, setLoadingCaption] = useState(false);

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

  // Pre-fill from URL query params (used by AI Plan Builder → Open in Post Builder)
  useEffect(() => {
    const prefillTopic = searchParams.get('topic');
    const prefillPlatform = searchParams.get('platform');
    if (prefillTopic) setTopic(prefillTopic);
    if (prefillPlatform) setPlatform(prefillPlatform);
  }, [searchParams]);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (draft && draft.topic) {
        setTopic(draft.topic || '');
        setPlatform(draft.platform || 'instagram');
        setGoal(draft.goal || 'engagement');
        if (draft.selectedHook) setSelectedHook(draft.selectedHook);
        if (draft.caption) setCaption(draft.caption);
        if (draft.hashtags?.length) setHashtags(draft.hashtags);
        if (draft.selectedCTA) setSelectedCTA(draft.selectedCTA);
        if (draft.currentStep) setCurrentStep(Math.min(draft.currentStep, 4));
      }
    } catch { /* ignore */ }
  }, []);

  // Save draft to localStorage
  useEffect(() => {
    if (!topic) return;
    const draft = { topic, platform, goal, selectedHook, caption, hashtags, selectedCTA, currentStep };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [topic, platform, goal, selectedHook, caption, hashtags, selectedCTA, currentStep]);

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

  // Step 2: Generate hooks (Claude Sonnet primary, Grok fallback)
  const handleGenerateHooks = async () => {
    if (!topic.trim()) { addToast('Enter a topic first', 'warning'); return; }
    setLoadingHooks(true);
    try {
      const usage = await trackFeatureUsage({ step: 'hooks' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingHooks(false); return; }
      
      let hooksText;
      try {
        const claudeRes = await callClaudeAPI([
          { role: 'system', content: 'You are Hook Sniper — a scroll-stopping copywriter. Generate exactly 3 numbered hooks. Each hook must be under 15 words, use a different approach (question, bold claim, story open, statistic, controversy, or curiosity gap), and stop the scroll immediately. Output only the numbered hooks, no preamble.' },
          { role: 'user', content: `Generate 3 scroll-stopping hooks for: "${topic}"\nPlatform: ${platform}\nGoal: ${GOALS.find(g => g.id === goal)?.label || goal}\nNumber them 1-3.` }
        ], 0.8);
        hooksText = claudeRes.content;
      } catch (claudeErr) {
        const res = await generateHooks(topic, brandData, 'question', platform);
        if (res.success) hooksText = res.hooks;
      }
      
      if (hooksText) {
        const parsed = parseHooksFromText(hooksText);
        setHooks(parsed.slice(0, 3));
      } else {
        addToast('Failed to generate hooks', 'error');
      }
    } catch { addToast('Hook generation failed', 'error'); }
    finally { setLoadingHooks(false); }
  };

  // Step 3: Generate caption (Claude Sonnet primary, Grok fallback)
  const handleGenerateCaption = async () => {
    if (!selectedHook) return;
    setLoadingCaption(true);
    try {
      const usage = await trackFeatureUsage({ step: 'caption' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingCaption(false); return; }
      
      let captionText;
      try {
        const claudeRes = await callClaudeAPI([
          { role: 'system', content: `You are Caption Architect — an elite social media copywriter. Write one compelling, publish-ready caption. Open with the provided hook. Build value in the body with short paragraphs and line breaks. End with one clear CTA. No hashtags in the body. No filler openers.` },
          { role: 'user', content: `Write one caption for ${platform} about: "${topic}"\n\nUse this hook as the opening line: "${selectedHook}"\nGoal: ${GOALS.find(g => g.id === goal)?.label || goal}\n\nWrite only the caption, no numbering or alternatives.` }
        ], 0.7);
        captionText = claudeRes.content?.trim();
      } catch (claudeErr) {
        const res = await generateCaption({
          topic: `${topic}\n\nUse this hook as the opening line: "${selectedHook}"\nGoal: ${GOALS.find(g => g.id === goal)?.label || goal}`,
          platform,
        }, brandData);
        if (res.success && res.caption) {
          const captions = res.caption.split(/\d+\.\s+/).filter(c => c.trim());
          captionText = captions[0]?.trim() || res.caption.trim();
        }
      }
      
      if (captionText) {
        setCaption(captionText);
      } else {
        addToast('Caption generation failed', 'error');
      }
    } catch { addToast('Caption generation failed', 'error'); }
    finally { setLoadingCaption(false); }
  };

  // Step 4: Generate hashtags
  const handleGenerateHashtags = async () => {
    setLoadingHashtags(true);
    try {
      const usage = await trackFeatureUsage({ step: 'hashtags' });
      if (!usage.allowed) { addToast('AI limit reached', 'warning'); setLoadingHashtags(false); return; }
      const res = await generateHashtags(topic, brandData, platform);
      if (res.success) {
        const parsed = parseHashtagsFromResponse(res.hashtags);
        setHashtags(parsed.slice(0, 10));
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
      const goalLabel = GOALS.find(g => g.id === goal)?.label || goal;
      const res = await generateStyledCTAs({ promoting: topic, goalType: goal === 'sales' ? 'sales' : goal === 'leads' ? 'dms' : 'engagement' }, brandData, platform);
      if (res.success && res.ctas) {
        setCtas(res.ctas.slice(0, 3));
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

  const assembledPost = [selectedHook, caption, selectedCTA?.cta, hashtags.map(h => h.tag).join(' ')].filter(Boolean).join('\n\n');

  const runScoring = async () => {
    if (!assembledPost) return;
    setLoadingQuality(true);
    try {
      const res = await scoreContentQuality(assembledPost, brandData);
      if (res.success) {
        try {
          const parsed = typeof res.analysis === 'string' ? JSON.parse(res.analysis.match(/\{[\s\S]*\}/)?.[0] || '{}') : res.analysis;
          setQualityScore(parsed.overallScore || parsed.overall || 0);
        } catch { setQualityScore(null); }
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
      const result = await saveContentLibraryItem({
        user_id: user.id,
        name: `Post — ${topic.slice(0, 50)}`,
        type: 'text',
        content: assembledPost,
        size_bytes: new Blob([assembledPost]).size,
        description: `Full Post Builder | ${platformData?.name || platform} | ${GOALS.find(g => g.id === goal)?.label || goal}`,
      });
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
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!hasAccess) {
    return (
      <div className="flex-1 ml-0 md:ml-64 pt-16 md:pt-20 p-4 md:p-8">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Full Post Builder</h2>
          <p className="text-gray-600 mb-2">A guided 5-step AI workflow that chains your topic into a complete, publish-ready post — hook, caption, hashtags, and CTA assembled seamlessly.</p>
          <p className="text-sm text-gray-500 mb-6">Available on Essentials, Pro, and Founders Club plans.</p>
          <button onClick={() => setShowUpgradeModal(true)} className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition-all">
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
              <PenLine className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl lg:text-3xl font-display font-bold text-gray-900">Full Post Builder</h1>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">One topic &rarr; one publish-ready post</p>
            </div>
          </div>
        </motion.div>

        {/* Stepper */}
        {!showFinalPanel && (
          <div className="mb-6">
            {isMobile ? (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                    animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">Step {currentStep + 1}/{STEPS.length}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {STEPS.map((step, i) => {
                  const StepIcon = step.icon;
                  const isActive = i === currentStep;
                  const isComplete = i < currentStep;
                  return (
                    <button
                      key={step.id}
                      onClick={() => i <= currentStep && goToStep(i)}
                      disabled={i > currentStep}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                        ${isActive ? 'bg-teal-50 text-teal-700 border border-teal-200' : ''}
                        ${isComplete ? 'text-teal-600 hover:bg-teal-50 cursor-pointer' : ''}
                        ${!isActive && !isComplete ? 'text-gray-400 cursor-not-allowed' : ''}
                      `}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4 text-teal-500" />
                      ) : (
                        <StepIcon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                      )}
                      <span className="hidden sm:inline">{step.label}</span>
                      {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step Content */}
        {!showFinalPanel && (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-1">{STEPS[currentStep].description}</h2>

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
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
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
                          onClick={() => setGoal(g.id)}
                          className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                            goal === g.id
                              ? 'bg-teal-50 border-teal-200 text-teal-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {brandData?.brandVoice && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-blue-700">Brand voice: <strong>{brandData.brandVoice}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Hook */}
              {currentStep === 1 && (
                <div className="space-y-4 mt-4">
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
                              ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-200'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{hook}</p>
                            {selectedHook === hook && <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />}
                          </div>
                          <span className="text-xs text-gray-400 mt-1 inline-block">{HOOK_TYPES[i % HOOK_TYPES.length]}</span>
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
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
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
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Your caption will appear here..."
                        rows={8}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
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
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingCaption ? 'animate-spin' : ''}`} /> Regenerate caption
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
                            {ht.score > 0 && <span className="text-xs text-teal-600 font-medium">{ht.score}%</span>}
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
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
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
                              ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-200'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-medium text-gray-400 uppercase">{cta.style}</span>
                              <p className="text-sm font-medium text-gray-900 mt-0.5">{cta.cta}</p>
                            </div>
                            {selectedCTA?.cta === cta.cta && <Check className="w-5 h-5 text-teal-500 flex-shrink-0" />}
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
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
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
                    (currentStep === 0 && !topic.trim()) ||
                    (currentStep === 1 && !selectedHook) ||
                    (currentStep === 2 && !caption.trim()) ||
                    (currentStep === 4 && !selectedCTA)
                  }
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {currentStep === 4 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Final Output Panel */}
        {showFinalPanel && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Score Badges */}
            <div className="flex flex-wrap gap-2">
              <ScoreBadge label="Quality" score={qualityScore} icon={Sparkles} loading={loadingQuality} thresholds={{ green: 80, teal: 60, amber: 40 }} />
              <HumanizerScore content={assembledPost} onScoreChange={setHumanScore} compact />
              <AlgorithmChecker content={assembledPost} platform={platform} onScoreChange={setAlgorithmScore} compact />
            </div>

            {/* Platform Badge */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                {platformData?.name || platform}
              </span>
              <span className="text-xs text-gray-400">{assembledPost.length} chars</span>
            </div>

            {/* Assembled Post */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              {selectedHook && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                  <span className="text-[10px] font-medium text-teal-500 uppercase tracking-wide">Hook</span>
                  <p className="text-sm font-semibold text-teal-800 mt-0.5">{selectedHook}</p>
                </div>
              )}

              {caption && (
                <div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Caption</span>
                  <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{caption}</p>
                </div>
              )}

              {selectedCTA && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <span className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">CTA — {selectedCTA.style}</span>
                  <p className="text-sm font-medium text-blue-800 mt-0.5">{selectedCTA.cta}</p>
                </div>
              )}

              {hashtags.length > 0 && (
                <div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Hashtags</span>
                  <p className="text-sm text-gray-600 mt-1">{hashtags.map((h) => h.tag).join(' ')}</p>
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
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-60 transition-all"
              >
                {saved ? <Check className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                {saved ? 'Saved!' : 'Save to Vault'}
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
          </motion.div>
        )}
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="fullPostBuilder" featureName="Full Post Builder" />
    </div>
  );
}
