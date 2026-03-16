import { useState, useContext, useEffect, useMemo } from 'react';
import { useBrand } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePreferredPlatforms, normalizePlatformName } from '../hooks/usePreferredPlatforms';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Zap, 
  Sparkles, 
  Lock, 
  Check, 
  ChevronRight,
  ChevronDown,
  Lightbulb,
  Copy,
  RefreshCw,
  Flame,
  Building,
  User,
  Users,
  Music,
  Video,
  FileText,
  Hash,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  FolderPlus,
  Info,
} from 'lucide-react';
import { 
  TikTokIcon, 
  InstagramIcon, 
  TwitterXIcon, 
  YouTubeIcon,
  FacebookIcon,
  LinkedInIcon,
} from '../components/SocialIcons';
import UpgradeModal from '../components/UpgradeModal';
import { saveContentLibraryItem, supabase } from '../config/supabase';
import { buildContentVaultPayload } from '../utils/contentVault';
import useAIUsage from '../hooks/useAIUsage';
import AIUsageMeter from '../components/AIUsageMeter';
import ViralScoreGauge from '../components/ViralScoreGauge';
import PremiumScriptRenderer from '../components/PremiumScriptRenderer';
import {
  getSectionsForType,
  getBlueprintLabel,
  getViralScoreWeights,
  getSectionMeta,
} from '../data/blueprintSchema';
import { buildN8nSystemPrompt } from '../utils/blueprintPromptBuilder';

const N8N_WEBHOOK_URL = '/api/viral-blueprint-proxy';

const PLATFORMS = [
  {
    id: 'TikTok',
    name: 'TikTok',
    icon: TikTokIcon,
    gradient: 'from-gray-900 to-gray-800',
    ring: 'ring-gray-900',
    glow: 'group-hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]',
    postTypes: ['Video']
  },
  {
    id: 'Instagram',
    name: 'Instagram',
    icon: InstagramIcon,
    gradient: 'from-pink-500 via-purple-500 to-orange-400',
    ring: 'ring-pink-500',
    glow: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    postTypes: ['Image Post', 'Reel', 'Carousel', 'Story']
  },
  {
    id: 'Facebook',
    name: 'Facebook',
    icon: FacebookIcon,
    gradient: 'from-blue-600 to-blue-500',
    ring: 'ring-blue-600',
    glow: 'group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]',
    postTypes: ['Post', 'Reel', 'Story']
  },
  {
    id: 'X',
    name: 'X',
    icon: TwitterXIcon,
    gradient: 'from-gray-900 to-gray-800',
    ring: 'ring-gray-900',
    glow: 'group-hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]',
    postTypes: ['Post', 'Thread']
  },
  {
    id: 'YouTube',
    name: 'YouTube',
    icon: YouTubeIcon,
    gradient: 'from-red-600 to-red-500',
    ring: 'ring-red-600',
    glow: 'group-hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]',
    postTypes: ['Short', 'Long-Form']
  },
  {
    id: 'LinkedIn',
    name: 'LinkedIn',
    icon: LinkedInIcon,
    gradient: 'from-blue-700 to-blue-600',
    ring: 'ring-blue-700',
    glow: 'group-hover:shadow-[0_0_20px_rgba(29,78,216,0.3)]',
    postTypes: ['Post', 'Article']
  }
];

const GOALS = [
  { id: 'Grow Followers', label: 'Grow Followers', emoji: '🚀' },
  { id: 'Drive Engagement', label: 'Drive Engagement', emoji: '💬' },
  { id: 'Generate Leads', label: 'Generate Leads', emoji: '🎯' },
  { id: 'Sales/Conversions', label: 'Sales/Conversions', emoji: '💰' },
  { id: 'Build Authority', label: 'Build Authority', emoji: '🤝' },
];

function getScoreExplanation(score) {
  if (score >= 90) return 'Exceptional — all signals point to viral';
  if (score >= 80) return 'Great — built to outperform average content';
  if (score >= 65) return 'Good — strong chance of solid performance';
  if (score >= 50) return 'Solid foundation — refine before posting';
  return 'Needs significant work before posting';
}

function getScoreBreakdown(viralScore) {
  const base = viralScore;
  return [
    { label: 'Hook Strength', value: Math.min(100, Math.max(0, base + 3)), weight: 25 },
    { label: 'Trend Alignment', value: Math.min(100, Math.max(0, base - 2)), weight: 25 },
    { label: 'Audience Fit', value: Math.min(100, Math.max(0, base + 1)), weight: 25 },
    { label: 'Platform Optimization', value: Math.min(100, Math.max(0, base - 2)), weight: 25 },
  ];
}

export default function ViralBlueprint() {
  const { brandProfile, isCreator } = useBrand();
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const { checkFeatureAccess, getFeatureLimit, userTier } = useSubscription();
  const { platforms: brandVoicePlatforms, hasPlatformsConfigured } = usePreferredPlatforms();
  const blueprintUsage = useAIUsage('viralBlueprint');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const availablePlatforms = hasPlatformsConfigured
    ? PLATFORMS.filter(p => {
        const normalizedId = normalizePlatformName(p.id);
        return brandVoicePlatforms.some(bvp => bvp.id === normalizedId);
      })
    : [];

  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedPostType, setSelectedPostType] = useState('');
  const [goal, setGoal] = useState('Grow Followers');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState(null);
  const [generatedForPlatform, setGeneratedForPlatform] = useState('');
  const [generatedForPostType, setGeneratedForPostType] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Generate Blueprint');
  const [savedBlueprint, setSavedBlueprint] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [showAllVisualKeywords, setShowAllVisualKeywords] = useState(false);
  const [showAllCaptionKeywords, setShowAllCaptionKeywords] = useState(false);
  
  const [currentView, setCurrentView] = useState('input');
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(0);

  const hasMismatch = generatedBlueprint && (selectedPlatform !== generatedForPlatform || selectedPostType !== generatedForPostType);
  const mismatchLabel = hasMismatch ? getBlueprintLabel(generatedForPlatform, generatedForPostType) : '';
  const newLabel = hasMismatch ? getBlueprintLabel(selectedPlatform, selectedPostType) : '';

  useEffect(() => {
    const limit = getFeatureLimit('viralBlueprint');
    setUsageLimit(limit === -1 ? Infinity : limit);
    const savedUsage = localStorage.getItem('viralBlueprintUsage');
    if (savedUsage) setUsageCount(parseInt(savedUsage, 10));
  }, [userTier, getFeatureLimit]);

  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const platformParam = searchParams.get('platform');
    const postTypeParam = searchParams.get('postType');
    const audienceParam = searchParams.get('audience');
    let didPrefill = false;

    if (topicParam) { setTopic(topicParam); didPrefill = true; }
    if (platformParam) { setSelectedPlatform(platformParam); didPrefill = true; }
    if (postTypeParam) { setSelectedPostType(postTypeParam); didPrefill = true; }
    if (audienceParam) { setTargetAudience(audienceParam); didPrefill = true; }

    if (didPrefill) {
      const nextParams = new URLSearchParams(searchParams);
      ['topic', 'platform', 'postType', 'audience'].forEach(k => nextParams.delete(k));
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!isGenerating) { setLoadingStep('Generate Blueprint'); return; }
    const messages = ['Scanning platform trends...', 'Analyzing viral patterns...', 'Drafting content strategy...', 'Finalizing blueprint...'];
    let idx = 0;
    setLoadingStep(messages[0]);
    const interval = setInterval(() => { idx = (idx + 1) % messages.length; setLoadingStep(messages[idx]); }, 12000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform);

  const sectionPreview = useMemo(() => {
    if (!selectedPlatform || !selectedPostType) return [];
    const { required } = getSectionsForType(selectedPlatform, selectedPostType);
    return required.map(key => getSectionMeta(key));
  }, [selectedPlatform, selectedPostType]);

  const isFormValid = selectedPlatform && selectedPostType && topic.trim().length > 0 && targetAudience.trim().length > 0;
  const hasAccess = checkFeatureAccess('viralBlueprint');
  const isAtLimit = usageLimit !== Infinity && usageCount >= usageLimit;
  const voiceContextLabel = isCreator ? 'Personal Brand' : 'Business Authority';
  const VoiceIcon = isCreator ? User : Building;

  const handlePlatformSelect = (platformId) => {
    setSelectedPlatform(platformId);
    setSelectedPostType('');
  };

  const handleCopy = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggleStep = (index) => {
    setExpandedSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const getVisibleItems = (items, showAll, limit = 8) => {
    if (!Array.isArray(items)) return [];
    return showAll ? items : items.slice(0, limit);
  };

  const handleGenerate = async () => {
    if (!hasAccess) { setShowUpgradeModal(true); return; }
    if (isAtLimit || !blueprintUsage.canGenerate) {
      showToast("You've reached your monthly blueprint limit. Resets on the 1st.", 'warning');
      return;
    }
    if (!isFormValid) { showToast('Please fill in all required fields', 'warning'); return; }

    setIsGenerating(true);
    setParseError(false);
    await blueprintUsage.trackFeatureUsage({ platform: selectedPlatform, postType: selectedPostType });

    try {
      const { required, optional, excluded } = getSectionsForType(selectedPlatform, selectedPostType);
      const viralWeights = getViralScoreWeights(selectedPlatform, selectedPostType);
      const blueprintLabel = getBlueprintLabel(selectedPlatform, selectedPostType);

      const blueprintContext = {
        topic: topic.trim(),
        platform: selectedPlatform,
        content_type: selectedPostType,
        goal,
        niche: brandProfile?.niche || '',
        target_audience: targetAudience.trim(),
        brand_voice_tone: brandProfile?.brandVoice || 'Authentic',
        required_sections: required,
        optional_sections: optional,
        excluded_sections: excluded,
        viral_score_weights: viralWeights,
        blueprint_label: blueprintLabel,
      };

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      let response;
      try {
        response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(blueprintContext),
          signal: controller.signal,
          mode: 'cors',
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') throw new Error('REQUEST_TIMEOUT');
        throw fetchError;
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('[Blueprint] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP_ERROR: ${response.status}`);
      }

      let responseData;
      try {
        const rawText = await response.text();
        responseData = rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        console.error('[Blueprint] JSON Parse Error:', e);
        throw new Error('INVALID_JSON');
      }

      const normalized = normalizeN8nResponse(responseData, blueprintLabel);

      if (!normalized || (!normalized.directorsCut?.length && !normalized.sections)) {
        console.error('[Blueprint] No usable content in response');
        throw new Error('INVALID_BLUEPRINT_STRUCTURE');
      }

      setGeneratedBlueprint(normalized);
      setGeneratedForPlatform(selectedPlatform);
      setGeneratedForPostType(selectedPostType);
      setExpandedSteps({ 0: true });

      const newUsage = usageCount + 1;
      setUsageCount(newUsage);
      localStorage.setItem('viralBlueprintUsage', newUsage.toString());

      if (import.meta.env.DEV) {
        const prompt = buildN8nSystemPrompt(blueprintContext);
        console.log('=== PASTE THIS INTO N8N MASTER BLUEPRINT GENERATOR ===');
        console.log(prompt);
      }

      showToast('Viral Blueprint generated!', 'success');
      setCurrentView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('[Blueprint] Generation error:', error.message);
      
      if (error.message === 'INVALID_JSON' || error.message === 'INVALID_BLUEPRINT_STRUCTURE') {
        setParseError(true);
        setCurrentView('results');
      }

      let msg = "We're having trouble generating your blueprint. Please try again in a moment.";
      if (error.message === 'REQUEST_TIMEOUT') msg = 'This request is taking longer than expected. Please try again.';
      else if (error.message.startsWith('HTTP_ERROR')) msg = 'We received an unexpected response. Please try again.';

      showToast(msg, 'error');

      if (topic.trim() && !parseError) {
        try {
          const grokBlueprint = await attemptGrokFallback(
            selectedPlatform, selectedPostType, topic, goal, targetAudience, brandProfile
          );
          if (grokBlueprint) {
            setGeneratedBlueprint(grokBlueprint);
            setGeneratedForPlatform(selectedPlatform);
            setGeneratedForPostType(selectedPostType);
            setExpandedSteps({ 0: true });
            setParseError(false);
            setCurrentView('results');
            showToast('Blueprint generated via direct AI.', 'success');
          }
        } catch {
          // Both failed
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBlueprint = async () => {
    if (!user?.id || !generatedBlueprint) { showToast('Generate a blueprint first', 'warning'); return; }
    try {
      const bp = generatedBlueprint;
      const textParts = [];

      if (bp.directorsCut?.length) {
        textParts.push(
          bp.directorsCut
            .map(s => `${s.title || `Step ${s.step}`}\n${s.text || s.script || ''}`)
            .join('\n\n')
        );
      }
      if (bp.seoStrategy?.spokenHooks?.length) {
        textParts.push('Hooks:\n' + bp.seoStrategy.spokenHooks.join('\n'));
      }
      if (bp.seoStrategy?.captionKeywords?.length) {
        textParts.push('Hashtags:\n' + bp.seoStrategy.captionKeywords.join(' '));
      }
      if (bp.seoStrategy?.visualKeywords?.length) {
        textParts.push('Keywords:\n' + bp.seoStrategy.visualKeywords.join(', '));
      }

      const blueprintText = textParts.filter(Boolean).join('\n\n');
      const result = await saveContentLibraryItem(user.id, buildContentVaultPayload({
        name: `Blueprint - ${topic.slice(0, 50) || selectedPlatform || 'Content'}`,
        contentText: blueprintText,
        contentType: 'blueprint',
        toolSource: 'viral_blueprint',
        toolLabel: 'Viral Blueprint',
        topic,
        platform: selectedPlatform,
        description: `Viral Blueprint | ${selectedPlatform} | ${selectedPostType || 'Content'}`,
        metadata: {
          goal,
          target_audience: targetAudience,
          post_type: selectedPostType,
          platform_display: selectedPlatform,
          viral_score: bp.viralScore,
        },
      }));

      if (!result.success) throw new Error(result.error || 'Failed to save');
      setSavedBlueprint(true);
      setTimeout(() => setSavedBlueprint(false), 2000);
      showToast('Saved to Content Vault!', 'success');
    } catch (error) {
      console.error('Failed to save blueprint:', error);
      showToast('Failed to save blueprint', 'error');
    }
  };

  const handleReset = () => {
    setSelectedPlatform('');
    setSelectedPostType('');
    setGoal('Grow Followers');
    setTopic('');
    setTargetAudience('');
    setGeneratedBlueprint(null);
    setGeneratedForPlatform('');
    setGeneratedForPostType('');
    setParseError(false);
    setExpandedSteps({});
    setShowAllVisualKeywords(false);
    setShowAllCaptionKeywords(false);
    setCopiedSection(null);
    setCurrentView('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegenerate = () => {
    setGeneratedBlueprint(null);
    setParseError(false);
    setCurrentView('input');
    setTimeout(() => handleGenerate(), 100);
  };

  /* ─── Render ────────────────────────────────────────────────── */

  const bp = generatedBlueprint;
  const viralScore = bp?.viralScore ?? 0;
  const scoreBreakdown = viralScore > 0 ? getScoreBreakdown(viralScore) : [];
  const blueprintLabel = bp?.blueprintLabel || getBlueprintLabel(generatedForPlatform, generatedForPostType);

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="mb-4 md:mb-6 lg:mb-8">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
              <Flame className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-huttle-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-0.5 flex-wrap">
                <h1 className="text-lg md:text-2xl lg:text-3xl font-display font-bold text-gray-900">
                  Viral Blueprint
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-huttle-gradient text-white text-[10px] font-bold uppercase tracking-wider">
                  Beta
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                Engineer viral content with AI-powered precision
              </p>
            </div>
            {hasAccess && (
              <div className="flex-shrink-0">
                <AIUsageMeter
                  used={blueprintUsage.featureUsed}
                  limit={blueprintUsage.featureLimit}
                  label="Blueprints this month"
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── INPUT FORM ─────────────────────────────────────── */}
        {currentView === 'input' && (
        <div className="card-glass overflow-hidden relative animate-fadeIn">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-50" />
          
          <div className="p-6 md:p-8 space-y-8 relative z-10">
            {!hasAccess ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gray-900 rounded-full blur opacity-20" />
                  <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-50 to-white flex items-center justify-center border border-gray-200 shadow-xl">
                    <Lock className="w-10 h-10 text-gray-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Initialize Command Center</h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Upgrade to Essentials or Pro to unlock the full power of the Viral Blueprint Generator.
                </p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="btn-ignite px-10 py-4 rounded-xl font-bold text-white flex items-center gap-3 mx-auto text-lg shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Unlock Access
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-slate-100/80 border border-slate-200/50 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200">
                      <VoiceIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">
                      Analyzing as <span className="font-bold text-slate-900">{voiceContextLabel}</span> Mode
                    </span>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">Select Platform</h2>
                  {!hasPlatformsConfigured || availablePlatforms.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">You haven't selected your platforms yet.</p>
                        <p className="text-xs text-amber-600 mt-0.5">Set up your Brand Voice to choose which platforms you create content for.</p>
                      </div>
                      <button
                        onClick={() => navigate('/dashboard/brand-voice')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Set up Brand Voice <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {availablePlatforms.map((platform) => {
                      const isSelected = selectedPlatform === platform.id;
                      const Icon = platform.icon;
                      return (
                        <button
                          key={platform.id}
                          onClick={() => handlePlatformSelect(platform.id)}
                          className={`relative group p-4 rounded-2xl border transition-all duration-300 ease-out overflow-hidden ${isSelected ? `border-transparent bg-gray-900 text-white shadow-xl scale-[1.02] ring-2 ring-offset-2 ${platform.ring}` : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg hover:-translate-y-1'}`}
                        >
                          <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 ${isSelected ? 'opacity-20 bg-gradient-to-br ' + platform.gradient : platform.glow}`} />
                          <div className="relative z-10 flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-white/10 shadow-inner' : 'bg-gray-50 group-hover:bg-white group-hover:shadow-md'}`}>
                              <Icon className={`w-6 h-6 transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`} />
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-600'}`}>{platform.name}</span>
                          </div>
                          {isSelected && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.6)] animate-pulse" />}
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>

                <div className={`space-y-4 transition-all duration-500 ease-out ${selectedPlatform ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none'}`}>
                  <h2 className="text-lg font-bold text-gray-900">Select Format</h2>
                  <div className="flex flex-wrap gap-3">
                    {currentPlatform?.postTypes.map((type) => {
                      const isSelected = selectedPostType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setSelectedPostType(type)}
                          className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${isSelected ? 'bg-gray-900 text-white shadow-lg scale-105' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-md'}`}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            {type}
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {sectionPreview.length > 0 && (
                    <div className="mt-3 animate-fadeIn">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Blueprint includes:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sectionPreview.map((meta, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200/50 animate-slideUp" style={{ animationDelay: `${i * 40}ms` }}>
                            <span className="text-xs">{meta.icon}</span>
                            {meta.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`space-y-6 p-6 rounded-2xl bg-slate-50/50 border border-slate-200/50 transition-all duration-500 ease-out ${selectedPostType ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 pointer-events-none'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strategy Brief</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">What is the Goal?</h2>
                    <div className="flex flex-wrap gap-3">
                      {GOALS.map((obj) => {
                        const isSelected = goal === obj.id;
                        return (
                          <button key={obj.id} onClick={() => setGoal(obj.id)} className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${isSelected ? 'bg-gray-900 text-white shadow-lg scale-105' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-md'}`}>
                            <span className="relative z-10 flex items-center gap-2">
                              <span>{obj.emoji}</span>
                              <span className="font-bold">{obj.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">What's the Topic?</h2>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lightbulb className={`w-5 h-5 transition-colors duration-300 ${topic ? 'text-orange-500' : 'text-gray-400'}`} />
                      </div>
                      <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., AI automation for real estate agents" className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all outline-none group-hover:border-gray-300" disabled={!selectedPostType} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">Who is this for?</h2>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Users className={`w-5 h-5 transition-colors duration-300 ${targetAudience ? 'text-orange-500' : 'text-gray-400'}`} />
                      </div>
                      <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g., SaaS Founders, New Moms, First-time Homebuyers..." className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all outline-none group-hover:border-gray-300" disabled={!selectedPostType} />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex flex-col items-center justify-center gap-6">
                  <button
                    onClick={handleGenerate}
                    disabled={!isFormValid || isGenerating || isAtLimit}
                    className={`group relative w-full md:w-auto px-12 py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-orange-400 ${isFormValid && !isGenerating && !isAtLimit ? 'hover:scale-[1.02]' : ''}`}
                    style={{
                      backgroundImage: 'none', background: '', backgroundColor: 'rgba(0, 0, 0, 1)', border: '1px solid rgba(0, 0, 0, 0.2)',
                      ...(isFormValid && !isGenerating && !isAtLimit ? { boxShadow: '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(168, 85, 247, 0.3), 0 0 60px rgba(249, 115, 22, 0.2)' } : {})
                    }}
                    onMouseEnter={(e) => { if (isFormValid && !isGenerating && !isAtLimit) e.currentTarget.style.boxShadow = '0 0 30px rgba(249, 115, 22, 0.6), 0 0 60px rgba(168, 85, 247, 0.5), 0 0 90px rgba(249, 115, 22, 0.3)'; }}
                    onMouseLeave={(e) => { if (isFormValid && !isGenerating && !isAtLimit) e.currentTarget.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(168, 85, 247, 0.3), 0 0 60px rgba(249, 115, 22, 0.2)'; }}
                  >
                    {isFormValid && !isGenerating && !isAtLimit && (
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-purple-600 rounded-2xl blur opacity-40 animate-pulse -z-10" />
                    )}
                    {isGenerating ? (
                      <div className="flex items-center justify-center gap-3">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        <span className="animate-pulse drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">{loadingStep}</span>
                      </div>
                    ) : (
                      <>
                        <Zap className="w-6 h-6 fill-current drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                        <span className="drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">Generate Blueprint</span>
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-3">Deep research & strategy generation takes 60-90 seconds. Please keep this tab open.</p>
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {/* ─── RESULTS ────────────────────────────────────────── */}
        {currentView === 'results' && hasAccess && (
          <div id="blueprint-results" className="space-y-8 animate-fadeIn">

            {/* Mismatch Warning */}
            {hasMismatch && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-fadeIn">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    Your current blueprint was generated for <span className="font-bold">{mismatchLabel}</span>.
                    Regenerate to get a blueprint for <span className="font-bold">{newLabel}</span>.
                  </p>
                </div>
                <button onClick={handleRegenerate} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate Now
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="relative overflow-hidden rounded-2xl glass-panel p-6 md:p-8 transition-all duration-500">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Blueprint Generated!</h2>
                      <p className="text-sm text-gray-500">Your viral content strategy is ready</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedPlatform && (
                      <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1.5">
                        {(() => { const p = PLATFORMS.find(pl => pl.id === selectedPlatform); const I = p?.icon; return I ? <I className="w-3.5 h-3.5" /> : null; })()}
                        {selectedPlatform}
                      </span>
                    )}
                    {selectedPostType && <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{selectedPostType}</span>}
                    {topic && <span className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold max-w-xs truncate">{topic.length > 40 ? topic.substring(0, 40) + '...' : topic}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleSaveBlueprint} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 font-bold text-gray-900 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                    {savedBlueprint ? <Check className="w-5 h-5 text-green-600" /> : <FolderPlus className="w-5 h-5 text-huttle-primary" />}
                    <span>{savedBlueprint ? 'Saved!' : 'Save to Vault'}</span>
                  </button>
                  <button onClick={handleReset} className="group flex items-center gap-3 rounded-xl bg-gray-900 px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-gray-800 hover:shadow-xl">
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span>Create New Blueprint</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parse Error */}
            {parseError && !bp && (
              <div className="text-center py-16 card-glass rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Blueprint generation failed</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">We received an unexpected response from the AI. This can happen occasionally. Please try again.</p>
                <button onClick={handleRegenerate} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            )}

            {/* ─── BLUEPRINT CONTENT ──────────────────────────── */}
            {bp && (
              <div className="space-y-8">

                {/* Blueprint Label */}
                {blueprintLabel && (
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm font-bold shadow-lg">
                      {blueprintLabel}
                    </span>
                  </div>
                )}

                {/* ── Viral Score with Breakdown ── */}
                {viralScore > 0 && (
                  <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/60 to-gray-50/40 border border-white/60 shadow-lg p-8 md:p-12">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-transparent to-purple-50/20 pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-center">
                        <ViralScoreGauge score={viralScore} />
                      </div>

                      {/* Score Explanation */}
                      <p className="text-center text-sm font-medium text-gray-500 mt-4">
                        {getScoreExplanation(viralScore)}
                      </p>

                      {/* 4-Criteria Breakdown */}
                      <div className="mt-8 space-y-3 max-w-md mx-auto">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Score Breakdown</h4>
                        {scoreBreakdown.map((item, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">{item.label}</span>
                              <span className="text-xs font-bold text-gray-900">{item.value}/100 <span className="text-gray-400 font-normal">({item.weight}%)</span></span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${item.value >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : item.value >= 65 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                                style={{ width: `${item.value}%`, transitionDelay: `${i * 200}ms` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Director's Cut / Content Steps ── */}
                {bp.directorsCut?.length > 0 && (
                  <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/60 border border-white/60 shadow-lg p-6 md:p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl blur opacity-40 animate-pulse" />
                            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center shadow-xl ring-1 ring-white/20">
                              {bp.isVideoContent
                                ? <Video className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                                : <FileText className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                              }
                            </div>
                          </div>
                          {bp.isVideoContent ? "The Director's Cut" : 'Content Blueprint'}
                        </h2>
                        <span className="text-sm font-medium text-gray-500">
                          {bp.directorsCut.length} {bp.directorsCut.length === 1 ? 'step' : 'steps'}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {bp.directorsCut.map((step, index) => {
                          const isExpanded = expandedSteps[index] ?? index === 0;
                          const contentText = step.text || step.script || '';
                          const visualText = step.visualSuggestion || step.visual || '';

                          return (
                            <div
                              key={index}
                              className="relative backdrop-blur-md bg-white/80 rounded-2xl border border-white/80 overflow-hidden hover:shadow-xl transition-all duration-300 animate-slideUp"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleStep(index)}
                                className="w-full flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-gray-50/80 to-white/60 border-b border-gray-100/50 backdrop-blur-sm text-left"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                                    {step.step || index + 1}
                                  </div>
                                  <h3 className="font-bold text-gray-900">{step.title || `Step ${index + 1}`}</h3>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>

                              {isExpanded && (
                                <div className="p-6">
                                  {contentText && (
                                    <PremiumScriptRenderer
                                      content={contentText}
                                      onCopy={(text) => handleCopy(text, `step-${index}`)}
                                    />
                                  )}
                                  {visualText && (
                                    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50/80 to-indigo-50/60 backdrop-blur-sm rounded-xl border border-purple-100/50">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm">{bp.isVideoContent ? '🎬' : '📸'}</span>
                                        <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Visual Direction</span>
                                      </div>
                                      <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{visualText}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SEO Strategy ── */}
                {(bp.seoStrategy?.visualKeywords?.length > 0 || bp.seoStrategy?.spokenHooks?.length > 0 || bp.seoStrategy?.captionKeywords?.length > 0) && (
                  <div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/60 border border-white/60 shadow-lg p-6 md:p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-green-50/20 pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                            <Hash className="w-5 h-5 text-white" />
                          </div>
                          SEO Strategy
                        </h2>
                        <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-bold uppercase tracking-wider shadow-sm border border-green-200/50">
                          Keyword Pack
                        </span>
                      </div>

                      <div className="space-y-6">

                        {/* Visual Keywords */}
                        {bp.seoStrategy.visualKeywords?.length > 0 && (() => {
                          const visible = getVisibleItems(bp.seoStrategy.visualKeywords, showAllVisualKeywords, 10);
                          const hidden = Math.max(bp.seoStrategy.visualKeywords.length - visible.length, 0);
                          return (
                            <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 border border-green-100/60 hover:shadow-xl transition-all duration-300 hover:border-green-200/80">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md">
                                  <TrendingUp className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-sm">Trending Keywords</h3>
                              </div>
                              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Trending search terms to boost discoverability</p>
                              <div className="flex flex-wrap gap-2">
                                {visible.map((keyword, i) => (
                                  <span key={i} className="px-4 py-2 bg-gradient-to-br from-green-50/90 to-emerald-100/70 backdrop-blur-sm border border-green-300/60 rounded-full text-xs font-semibold text-green-700 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer" onClick={() => handleCopy(keyword, `vk-${i}`)}>
                                    {copiedSection === `vk-${i}` ? '✓ Copied' : keyword}
                                  </span>
                                ))}
                              </div>
                              {hidden > 0 && (
                                <button onClick={() => setShowAllVisualKeywords(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 transition-colors">
                                  <span>Show {hidden} more keywords</span> <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {showAllVisualKeywords && bp.seoStrategy.visualKeywords.length > 10 && (
                                <button onClick={() => setShowAllVisualKeywords(false)} className="mt-3 ml-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                                  <span>Show fewer</span> <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Spoken Hooks */}
                        {bp.seoStrategy.spokenHooks?.length > 0 && (
                          <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 border border-amber-100/60 hover:shadow-xl transition-all duration-300 hover:border-amber-200/80">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                                  <Flame className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-sm">Spoken Hooks</h3>
                              </div>
                              <button onClick={() => handleCopy(bp.seoStrategy.spokenHooks.join('\n\n'), 'all-hooks')} className="px-4 py-2 rounded-xl bg-white/80 hover:bg-white border border-amber-200 hover:border-amber-300 text-amber-700 text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                                {copiedSection === 'all-hooks' ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy All</>}
                              </button>
                            </div>
                            <div className="space-y-3">
                              {bp.seoStrategy.spokenHooks.map((hook, i) => (
                                <div key={i} className="group flex items-start gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100/60 hover:border-amber-200 hover:shadow-md transition-all cursor-pointer" onClick={() => handleCopy(hook, `hook-${i}`)}>
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-md">{i + 1}</div>
                                  <p className="flex-1 text-gray-800 leading-relaxed font-medium">{hook}</p>
                                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {copiedSection === `hook-${i}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Caption Keywords / Hashtags */}
                        {bp.seoStrategy.captionKeywords?.length > 0 && (() => {
                          const visible = getVisibleItems(bp.seoStrategy.captionKeywords, showAllCaptionKeywords, 12);
                          const hidden = Math.max(bp.seoStrategy.captionKeywords.length - visible.length, 0);
                          return (
                            <div className="backdrop-blur-md bg-white/80 rounded-2xl p-6 border border-purple-100/60 hover:shadow-xl transition-all duration-300 hover:border-purple-200/80">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-md">
                                  <Hash className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-sm">Hashtags</h3>
                              </div>
                              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Caption & description tags</p>
                              <div className="flex flex-wrap gap-2">
                                {visible.map((tag, i) => (
                                  <span key={i} className="px-4 py-2 bg-gradient-to-br from-purple-50/90 to-purple-100/70 backdrop-blur-sm border border-purple-200/60 rounded-full text-xs font-semibold text-purple-700 shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer" onClick={() => handleCopy(tag, `ct-${i}`)}>
                                    {copiedSection === `ct-${i}` ? '✓ Copied' : tag}
                                  </span>
                                ))}
                              </div>
                              {hidden > 0 && (
                                <button onClick={() => setShowAllCaptionKeywords(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 transition-colors">
                                  <span>Show {hidden} more tags</span> <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {showAllCaptionKeywords && bp.seoStrategy.captionKeywords.length > 12 && (
                                <button onClick={() => setShowAllCaptionKeywords(false)} className="mt-3 ml-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                                  <span>Show fewer</span> <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                </button>
                              )}
                              <button onClick={() => handleCopy(bp.seoStrategy.captionKeywords.join(' '), 'all-tags')} className="mt-5 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                {copiedSection === 'all-tags' ? <><Check className="w-3.5 h-3.5" /> Copied All!</> : <><Copy className="w-3.5 h-3.5" /> Copy All Tags</>}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Audio Vibe (video content only) ── */}
                {bp.isVideoContent && bp.audioVibe && (
                  <div className="glass-panel rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg">
                        <Music className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900">Audio Vibe</h2>
                        <p className="text-gray-600">{bp.audioVibe.mood}</p>
                      </div>
                      {bp.audioVibe.bpm && (
                        <div className="text-right">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">BPM</span>
                          <p className="text-lg font-mono font-bold text-gray-900">{bp.audioVibe.bpm}</p>
                        </div>
                      )}
                    </div>
                    {bp.audioVibe.suggestion && (
                      <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        💡 {bp.audioVibe.suggestion}
                      </p>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* Dev Panel */}
            {import.meta.env.DEV && bp && (
              <N8nPromptPanel platform={selectedPlatform} contentType={selectedPostType} />
            )}
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="viralBlueprint"
      />
    </div>
  );
}

/* ─── Response Normalization ─────────────────────────────────── */

/**
 * Normalize any n8n response shape into the rendering format:
 * { directorsCut, seoStrategy, audioVibe, viralScore, isVideoContent, blueprintLabel }
 */
function normalizeN8nResponse(data, fallbackLabel) {
  if (!data || typeof data !== 'object') return null;

  // The n8n response wraps blueprint data inside a "blueprint" key
  const inner = (data.blueprint && typeof data.blueprint === 'object')
    ? data.blueprint
    : data;

  // Extract directorsCut — handles both camelCase and snake_case
  let directorsCut = inner.directorsCut || inner.directors_cut || [];
  if (!Array.isArray(directorsCut)) {
    const scenes = directorsCut?.scenes || directorsCut;
    directorsCut = Array.isArray(scenes) ? scenes : [];
  }

  // Normalize each step
  directorsCut = directorsCut.map((item, i) => {
    if (!item || typeof item !== 'object') return null;
    return {
      step: Number(item.step || item.sceneNumber || item.scene_number || item.slide_number || item.tweet_number || item.frame_number || i + 1),
      title: String(item.title || item.headline || item.timestamp || `Step ${i + 1}`).trim(),
      text: String(item.text || item.content || item.dialogue || item.body_text || item.caption || '').trim(),
      script: String(item.script || '').trim(),
      visual: String(item.visual || item.visual_note || item.visual_description || item.media_suggestion || '').trim(),
      visualSuggestion: String(item.visualSuggestion || item.visual_suggestion || '').trim(),
    };
  }).filter(Boolean);

  // Extract SEO strategy
  const rawSeo = inner.seoStrategy || inner.seo_strategy || {};
  const seoStrategy = {
    visualKeywords: normalizeArray(rawSeo.visualKeywords ?? rawSeo.visual_keywords ?? inner.seo_keywords),
    spokenHooks: normalizeArray(rawSeo.spokenHooks ?? rawSeo.spoken_hooks ?? inner.hooks),
    captionKeywords: normalizeArray(rawSeo.captionKeywords ?? rawSeo.caption_keywords ?? inner.suggested_hashtags),
  };

  // Extract audio vibe
  const rawAudio = inner.audioVibe || inner.audio_vibe || null;
  const audioVibe = rawAudio ? {
    mood: rawAudio.mood || rawAudio.music_style || '',
    bpm: rawAudio.bpm || '',
    suggestion: rawAudio.suggestion || '',
  } : null;

  // Viral score
  const rawScore = inner.viralScore ?? inner.viral_score;
  const viralScore = typeof rawScore === 'object' ? (rawScore?.score ?? 85) : (Number(rawScore) > 0 ? Number(rawScore) : 85);

  // Video flag
  const isVideoContent = typeof inner.isVideoContent === 'boolean'
    ? inner.isVideoContent
    : typeof data.isVideoContent === 'boolean'
      ? data.isVideoContent
      : false;

  // Blueprint label
  const blueprintLabel = data.blueprint_label || data.blueprintLabel || inner.blueprint_label || inner.blueprintLabel || fallbackLabel || '';

  // If directorsCut is empty, try to build from simplified format
  if (directorsCut.length === 0 && (inner.content_script || inner.hooks || inner.suggested_hashtags)) {
    directorsCut = [{
      step: 1,
      title: 'Content Blueprint',
      text: inner.content_script || '',
      script: '',
      visual: inner.visual_direction || '',
      visualSuggestion: '',
    }];
    if (inner.hooks) seoStrategy.spokenHooks = normalizeArray(inner.hooks);
    if (inner.seo_keywords) seoStrategy.visualKeywords = normalizeArray(inner.seo_keywords);
    if (inner.suggested_hashtags) seoStrategy.captionKeywords = normalizeArray(inner.suggested_hashtags);
  }

  // Also keep raw sections if present (for future new-format n8n responses)
  const sections = inner.sections || null;

  return {
    directorsCut,
    seoStrategy,
    audioVibe,
    viralScore,
    isVideoContent,
    blueprintLabel,
    sections,
  };
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/* ─── Grok Fallback ──────────────────────────────────────────── */

async function attemptGrokFallback(platform, contentType, topic, goal, targetAudience, brandProfile) {
  const isVideo = ['Reel', 'Video', 'Short', 'Long-Form'].includes(contentType);

  const prompt = `You are a viral content strategist. Generate a ${contentType} blueprint for ${platform}.

Topic: ${topic}
Goal: ${goal}
Target Audience: ${targetAudience}
Brand Voice: ${brandProfile?.brandVoice || 'authentic'}

Return ONLY valid JSON with this exact structure:
{
  "isVideoContent": ${isVideo},
  "viralScore": <number 70-95>,
  "directorsCut": [
    { "step": 1, "title": "The Hook", "${isVideo ? 'script' : 'text'}": "<content>", "${isVideo ? 'visual' : 'visualSuggestion'}": "<visual direction>" },
    { "step": 2, "title": "The Setup", "${isVideo ? 'script' : 'text'}": "<content>", "${isVideo ? 'visual' : 'visualSuggestion'}": "<visual direction>" },
    { "step": 3, "title": "The Value", "${isVideo ? 'script' : 'text'}": "<content>", "${isVideo ? 'visual' : 'visualSuggestion'}": "<visual direction>" },
    { "step": 4, "title": "The CTA", "${isVideo ? 'script' : 'text'}": "<content>", "${isVideo ? 'visual' : 'visualSuggestion'}": "<visual direction>" }
  ],
  "seoStrategy": {
    "visualKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "spokenHooks": ["hook1", "hook2", "hook3"],
    "captionKeywords": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  },
  "audioVibe": ${isVideo ? '{ "mood": "<music mood>", "bpm": "<bpm range>", "suggestion": "<audio tip>" }' : 'null'}
}

Make content specific, actionable, and optimized for ${platform} ${contentType}. Output ONLY raw JSON.`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch('/api/ai/grok', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model: 'grok-3-fast',
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'You are a viral content strategist. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]
    }),
  });

  if (!res.ok) return null;

  const grokData = await res.json();
  const raw = grokData.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return normalizeN8nResponse(parsed, getBlueprintLabel(platform, contentType));
  } catch {
    return null;
  }
}

/* ─── Dev-only Component ─────────────────────────────────────── */

function N8nPromptPanel({ platform, contentType }) {
  const [expanded, setExpanded] = useState(false);

  const { required, optional, excluded } = getSectionsForType(platform, contentType);
  const weights = getViralScoreWeights(platform, contentType);
  const label = getBlueprintLabel(platform, contentType);

  const prompt = buildN8nSystemPrompt({
    platform,
    content_type: contentType,
    required_sections: required,
    optional_sections: optional,
    excluded_sections: excluded,
    viral_score_weights: weights,
    blueprint_label: label,
  });

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between p-4 text-left text-xs font-mono text-gray-500"
      >
        <span>[DEV] n8n System Prompt for {label}</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <pre className="p-4 pt-0 text-[10px] leading-relaxed text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
          {prompt}
        </pre>
      )}
    </div>
  );
}
