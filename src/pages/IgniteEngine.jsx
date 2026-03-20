import { useState, useContext, useEffect, useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
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
  Lightbulb,
  Copy,
  RefreshCw,
  Flame,
  Building,
  User,
  Users,
  Music,
  FileText,
  Hash,
  AlertTriangle,
  ArrowRight,
  FolderPlus,
  Info,
  Clock,
  Camera,
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
import {
  getSectionsForType,
  getBlueprintLabel,
  getViralScoreWeights,
  getSectionMeta,
} from '../data/blueprintSchema';
import { buildN8nSystemPrompt } from '../utils/blueprintPromptBuilder';
import { buildBrandContext } from '../utils/buildBrandContext'; // HUTTLE AI: brand context injected
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized
import { getCachedTrends } from '../services/dashboardCacheService';

const N8N_WEBHOOK_URL = '/api/ignite-engine-proxy'; // HUTTLE AI: updated 3

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

function getVerdict(score) {
  if (score >= 90) return { label: 'Exceptional', className: 'bg-green-100 text-green-700 border-green-200' };
  if (score >= 80) return { label: 'Great', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  if (score >= 66) return { label: 'Good', className: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (score >= 50) return { label: 'Average — refine before posting', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { label: 'Needs work', className: 'bg-red-100 text-red-700 border-red-200' };
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
};

const BREAKDOWN_ITEMS = [
  { label: 'Hook Strength', key: 'hookStrength' },
  { label: 'Trend Alignment', key: 'trendAlignment' },
  { label: 'Audience Fit', key: 'audienceFit' },
  { label: 'Platform Fit', key: 'platformOptimization' },
];

export default function IgniteEngine() {
  const { brandProfile, isCreator } = useBrand();
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const { checkFeatureAccess, getFeatureLimit, userTier } = useSubscription();
  const { platforms: brandVoicePlatforms, hasPlatformsConfigured } = usePreferredPlatforms();
  const blueprintUsage = useAIUsage('igniteEngine'); // HUTTLE AI: updated 3
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const availablePlatforms = hasPlatformsConfigured
    ? PLATFORMS.filter(p => {
        const normalizedId = normalizePlatformName(p.id);
        return brandVoicePlatforms.some(bvp => bvp.id === normalizedId);
      })
    : [];

  const isBrandVoiceComplete = brandProfile?.niche && brandProfile?.targetAudience
    && (brandProfile?.toneChips?.length > 0 || brandProfile?.brandVoice);

  // Form state
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedPostType, setSelectedPostType] = useState('');
  const [goal, setGoal] = useState('Grow Followers');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [trendingExtras, setTrendingExtras] = useState(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState(null);
  const [generatedForPlatform, setGeneratedForPlatform] = useState('');
  const [generatedForPostType, setGeneratedForPostType] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Generate Brief');
  const [savedBrief, setSavedBrief] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [currentView, setCurrentView] = useState('input');
  const [usageCount, setUsageCount] = useState(0);
  const [usageLimit, setUsageLimit] = useState(0);

  const hasMismatch = generatedBrief && (selectedPlatform !== generatedForPlatform || selectedPostType !== generatedForPostType);
  const mismatchLabel = hasMismatch ? getBlueprintLabel(generatedForPlatform, generatedForPostType) : '';
  const newLabel = hasMismatch ? getBlueprintLabel(selectedPlatform, selectedPostType) : '';

  useEffect(() => {
    const limit = getFeatureLimit('igniteEngine'); // HUTTLE AI: updated 3
    setUsageLimit(limit === -1 ? Infinity : limit);
    const savedUsage = localStorage.getItem('igniteEngineUsage'); // HUTTLE AI: updated 3
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
    if (brandProfile?.targetAudience && !targetAudience) {
      setTargetAudience(brandProfile.targetAudience);
    }
  }, [brandProfile]);

  useEffect(() => {
    if (!isGenerating) { setLoadingStep('Generate Brief'); return; }
    const messages = ['Scanning platform trends...', 'Analyzing content patterns...', 'Drafting your strategy...', 'Finalizing brief...'];
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
  const hasAccess = checkFeatureAccess('igniteEngine'); // HUTTLE AI: updated 3
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

  const handleGenerate = async () => {
    if (!hasAccess) { setShowUpgradeModal(true); return; }
    if (isAtLimit || !blueprintUsage.canGenerate) {
      showToast("You've reached your monthly brief limit. Resets on the 1st.", 'warning');
      return;
    }
    if (!isFormValid) { showToast('Please fill in all required fields', 'warning'); return; }

    setIsGenerating(true);
    setParseError(false);
    await blueprintUsage.trackFeatureUsage({ platform: selectedPlatform, postType: selectedPostType });

    try {
      const { required, optional, excluded } = getSectionsForType(selectedPlatform, selectedPostType);
      const viralWeights = getViralScoreWeights(selectedPlatform, selectedPostType);
      const briefLabel = getBlueprintLabel(selectedPlatform, selectedPostType);

      const brandBlock = buildBrandContext(brandProfile, { first_name: brandProfile?.firstName }); // HUTTLE AI: brand context injected
      const briefContext = {
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
        blueprint_label: briefLabel,
        user_type: brandProfile?.profileType || 'brand',
        brand_name: brandProfile?.brandName || '',
        handle: brandProfile?.socialHandle || '',
        creator_name: brandProfile?.brandName || brandProfile?.firstName || '', // HUTTLE AI: brand context injected
        brand_context: brandBlock, // HUTTLE AI: brand context injected
        trending_format_type: trendingExtras?.format_type || '',
        trending_niche_angle: trendingExtras?.niche_angle || '',
        sub_niche: brandProfile?.subNiche || '',
        city: brandProfile?.city || '',
        audience_pain_point: brandProfile?.audiencePainPoint || '',
        audience_action_trigger: brandProfile?.audienceActionTrigger || '',
        tone_chips: brandProfile?.toneChips || [],
        writing_style: brandProfile?.writingStyle || '',
        example_post: brandProfile?.examplePost || '',
        content_to_post: brandProfile?.contentToPost || [],
        content_to_avoid: brandProfile?.contentToAvoid || '',
        follower_count: brandProfile?.followerCount || '',
        primary_offer: brandProfile?.primaryOffer || '',
        conversion_goal: brandProfile?.conversionGoal || '',
        content_persona: brandProfile?.contentPersona || '',
        monetization_goal: brandProfile?.monetizationGoal || '',
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
          body: JSON.stringify(briefContext),
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
        console.error('[IgniteEngine] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP_ERROR: ${response.status}`);
      }

      let responseData;
      try {
        const rawText = await response.text();
        responseData = rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        console.error('[IgniteEngine] JSON Parse Error:', e);
        throw new Error('INVALID_JSON');
      }

      const normalized = normalizeN8nResponse(responseData);

      if (!normalized || !normalized.performanceScore) {
        console.error('[IgniteEngine] No usable content in response');
        throw new Error('INVALID_BRIEF_STRUCTURE');
      }

      setGeneratedBrief(normalized);
      setGeneratedForPlatform(selectedPlatform);
      setGeneratedForPostType(selectedPostType);

      const newUsage = usageCount + 1;
      setUsageCount(newUsage);
      localStorage.setItem('igniteEngineUsage', newUsage.toString()); // HUTTLE AI: updated 3

      showToast('Ignite Engine brief generated!', 'success');
      setCurrentView('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('[IgniteEngine] Generation error:', error.message);

      if (error.message === 'INVALID_JSON' || error.message === 'INVALID_BRIEF_STRUCTURE') {
        setParseError(true);
        setCurrentView('results');
      }

      let msg = "We're having trouble generating your brief. Please try again in a moment.";
      if (error.message === 'REQUEST_TIMEOUT') msg = 'This request is taking longer than expected. Please try again.';
      else if (error.message.startsWith('HTTP_ERROR')) msg = 'We received an unexpected response. Please try again.';

      showToast(msg, 'error');

      if (topic.trim() && !parseError) {
        try {
          const fallbackBrief = await attemptGrokFallback(
            selectedPlatform, selectedPostType, topic, goal, targetAudience, brandProfile
          );
          if (fallbackBrief) {
            setGeneratedBrief(fallbackBrief);
            setGeneratedForPlatform(selectedPlatform);
            setGeneratedForPostType(selectedPostType);
            setParseError(false);
            setCurrentView('results');
            showToast('Brief generated via direct AI.', 'success');
          }
        } catch {
          // Both paths failed
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveBrief = async () => {
    if (!user?.id || !bp) { showToast('Generate a brief first', 'warning'); return; }
    try {
      const textParts = [];
      if (bp.hook) textParts.push(`Hook:\n${bp.hook}`);
      if (bp.script) textParts.push(`Script:\n${bp.script}`);
      if (bp.caption) textParts.push(`Caption:\n${bp.caption}`);
      if (bp.hashtags) {
        const allTags = [...(bp.hashtags.niche || []), ...(bp.hashtags.mid || []), ...(bp.hashtags.broad || [])];
        if (allTags.length) textParts.push(`Hashtags:\n${allTags.join(' ')}`);
      }
      if (bp.proTip) textParts.push(`Pro Tip:\n${bp.proTip}`);

      const briefText = textParts.filter(Boolean).join('\n\n');
      const result = await saveContentLibraryItem(user.id, buildContentVaultPayload({
        name: `Brief - ${topic.slice(0, 50) || selectedPlatform || 'Content'}`,
        contentText: briefText,
        contentType: 'blueprint',
        toolSource: 'ignite_engine', // HUTTLE AI: updated 3
        toolLabel: 'Ignite Engine',
        topic,
        platform: selectedPlatform,
        description: `Ignite Engine | ${selectedPlatform} | ${selectedPostType || 'Content'}`,
        metadata: {
          goal,
          target_audience: targetAudience,
          post_type: selectedPostType,
          platform_display: selectedPlatform,
          performance_score: bp.performanceScore,
        },
      }));

      if (!result.success) throw new Error(result.error || 'Failed to save');
      setSavedBrief(true);
      setTimeout(() => setSavedBrief(false), 2000);
      showToast('Saved to vault ✓', 'success');
    } catch (error) {
      console.error('Failed to save brief:', error);
      showToast('Failed to save brief', 'error');
    }
  };

  const handleReset = () => {
    setSelectedPlatform('');
    setSelectedPostType('');
    setGoal('Grow Followers');
    setTopic('');
    setTargetAudience('');
    setGeneratedBrief(null);
    setGeneratedForPlatform('');
    setGeneratedForPostType('');
    setParseError(false);
    setCopiedSection(null);
    setCurrentView('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegenerate = () => {
    setGeneratedBrief(null);
    setParseError(false);
    setCurrentView('input');
    setTimeout(() => handleGenerate(), 100);
  };

  /* ─── Render ────────────────────────────────────────────────── */

  const bp = generatedBrief;
  const performanceScore = bp?.performanceScore ?? 0;
  const briefLabel = bp ? getBlueprintLabel(generatedForPlatform, generatedForPostType) : '';

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
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
                  Ignite Engine
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-huttle-gradient text-white text-[10px] font-bold uppercase tracking-wider">
                  Beta
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                Built to maximize reach. Backed by live data.
              </p>
            </div>
            {hasAccess && (
              <div className="flex-shrink-0">
                <AIUsageMeter
                  used={blueprintUsage.featureUsed}
                  limit={blueprintUsage.featureLimit}
                  label="Briefs this month"
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
                  Upgrade to Essentials or Pro to unlock the full power of the Ignite Engine.
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

                {!isBrandVoiceComplete && (
                  <div className="flex items-center gap-3 p-4 bg-huttle-50 border border-huttle-primary/20 rounded-xl animate-fadeIn">
                    <Sparkles className="w-5 h-5 text-huttle-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        Complete your Brand Voice for more personalized briefs
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/dashboard/brand-voice')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-huttle-primary bg-white hover:bg-huttle-50 rounded-lg transition-colors whitespace-nowrap border border-huttle-primary/20"
                    >
                      Complete Now <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

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
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Brief includes:</p>
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
                      <input type="text" value={topic} onChange={(e) => { setTopic(e.target.value); setTrendingExtras(null); }} placeholder="e.g., AI automation for real estate agents" className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all outline-none group-hover:border-gray-300" disabled={!selectedPostType} />
                    </div>
                    {brandProfile?.niche && Array.isArray(getCachedTrends()) && getCachedTrends().length > 0 && (
                      <div className="mt-3" data-testid="ignite-trending-chips">
                        <p className="text-xs font-medium text-gray-500 mb-2">Or build from a trending topic:</p>
                        <div className="flex flex-wrap gap-2">
                          {getCachedTrends().slice(0, 3).map((tr, idx) => {
                            const pl = String(tr.relevant_platform || '').toLowerCase();
                            const platformMatch = PLATFORMS.find((p) => pl.includes(p.id.toLowerCase()) || (p.id === 'X' && (pl.includes('x') || pl.includes('twitter'))));
                            return (
                              <button
                                key={`${tr.topic}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setTopic(sanitizeAIOutput(tr.topic || tr.title) || '');
                                  setTrendingExtras({ format_type: tr.format_type || '', niche_angle: tr.niche_angle || '' });
                                  if (platformMatch) setSelectedPlatform(platformMatch.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-200 hover:border-orange-400 text-gray-800"
                              >
                                <Flame className="w-3.5 h-3.5 text-orange-500" aria-hidden />
                                {sanitizeAIOutput(tr.topic || tr.title)} · {tr.relevant_platform || 'IG'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                        <span className="drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">Generate Brief</span>
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
          <div id="brief-results" className="space-y-6 animate-fadeIn">

            {/* Mismatch Warning */}
            {hasMismatch && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-fadeIn">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    Your current brief was generated for <span className="font-bold">{mismatchLabel}</span>.
                    Regenerate to get a brief for <span className="font-bold">{newLabel}</span>.
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
                      <h2 className="text-xl font-bold text-gray-900">Brief Generated!</h2>
                      <p className="text-sm text-gray-500">Your Ignite Engine brief is ready</p>
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
                  <button type="button" data-testid="ignite-save-vault" onClick={handleSaveBrief} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 font-bold text-gray-900 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                    {savedBrief ? <Check className="w-5 h-5 text-green-600" /> : <FolderPlus className="w-5 h-5 text-huttle-primary" />}
                    <span>{savedBrief ? 'Saved ✓' : 'Save to Vault'}</span>
                  </button>
                  <button onClick={handleReset} className="group flex items-center gap-3 rounded-xl bg-gray-900 px-6 py-4 font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-gray-800 hover:shadow-xl">
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span>Create New Brief</span>
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">Brief generation failed</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">We received an unexpected response from the AI. This can happen occasionally. Please try again.</p>
                <button onClick={handleRegenerate} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            )}

            {/* ─── BRIEF CONTENT ──────────────────────────────── */}
            {bp && (
              <div className="space-y-6">

                {/* Brief Label Badge */}
                {briefLabel && (
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm font-bold shadow-lg">
                      {briefLabel}
                    </span>
                  </div>
                )}

                {/* ── Performance Score Card ── */}
                {performanceScore > 0 && (
                  <Motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
                    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 md:p-12">
                      <div className="flex items-center justify-center">
                        <ViralScoreGauge score={performanceScore} />
                      </div>

                      {bp.scoreBreakdown && (
                        <div className="mt-8 space-y-3 max-w-md mx-auto">
                          {BREAKDOWN_ITEMS.map((item, i) => {
                            const value = bp.scoreBreakdown[item.key] ?? 0;
                            return (
                              <div key={item.key}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-gray-600">{item.label}</span>
                                  <span className="text-xs font-bold text-gray-900">{value}/25</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <Motion.div
                                    className={`h-full rounded-full ${value >= 20 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : value >= 15 ? 'bg-gradient-to-r from-cyan-400 to-teal-500' : value >= 10 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(value / 25) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {bp.scoreReason && (
                        <p className="text-center text-sm text-gray-400 italic mt-6 max-w-lg mx-auto">
                          {sanitizeAIOutput(bp.scoreReason)}
                        </p>
                      )}

                      {performanceScore > 0 && (() => {
                        const verdict = getVerdict(performanceScore);
                        return (
                          <div className="flex justify-center mt-5">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border ${verdict.className}`}>
                              {verdict.label}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </Motion.div>
                )}

                {/* ── Conditional Content Sections ── */}
                {bp.isVideoContent ? (
                  <>
                    {bp.hook && (
                      <Motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
                        <SectionCard icon={<Flame className="w-4 h-4 text-white" />} iconBg="bg-gradient-to-br from-amber-400 to-orange-500" title="Your Opening Hook" action={
                          <CopyBtn label="Copy" copiedLabel="Copied!" active={copiedSection === 'hook'} onClick={() => handleCopy(bp.hook, 'hook')} />
                        }>
                          <p className="text-lg font-semibold text-gray-900 leading-relaxed">{sanitizeAIOutput(bp.hook)}</p>
                          {bp.hookReason && <ReasonCallout text={bp.hookReason} />}
                        </SectionCard>
                      </Motion.div>
                    )}

                    {bp.script && (
                      <Motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
                        <SectionCard icon={<FileText className="w-4 h-4 text-white" />} iconBg="bg-gradient-to-br from-violet-500 to-purple-600" title="Script" action={
                          <CopyBtn label="Copy" copiedLabel="Copied!" active={copiedSection === 'script'} onClick={() => handleCopy(bp.script, 'script')} />
                        }>
                          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{sanitizeAIOutput(bp.script)}</div>
                          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Estimated read time: ~{Math.max(1, Math.round(bp.script.split(/\s+/).length / 130))} min
                          </p>
                        </SectionCard>
                      </Motion.div>
                    )}

                    {bp.caption && (
                      <Motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
                        <CaptionCard bp={bp} copiedSection={copiedSection} handleCopy={handleCopy} />
                      </Motion.div>
                    )}

                    {bp.audioVibe && (
                      <Motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
                        <SectionCard icon={<Music className="w-4 h-4 text-white" />} iconBg="bg-gradient-to-br from-pink-500 to-violet-500" title="Audio Direction">
                          <div className="space-y-3">
                            <InfoRow emoji="🎵" label="Mood" value={bp.audioVibe.mood} />
                            <InfoRow emoji="🥁" label="BPM" value={bp.audioVibe.bpm} />
                            <InfoRow emoji="💡" label="Tip" value={bp.audioVibe.tip} />
                          </div>
                        </SectionCard>
                      </Motion.div>
                    )}

                    {bp.imageDirection && (
                      <Motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
                        <ImageDirectionCard imageDirection={bp.imageDirection} />
                      </Motion.div>
                    )}

                    {bp.postingIntel && (
                      <Motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible">
                        <PostingIntelCard postingIntel={bp.postingIntel} />
                      </Motion.div>
                    )}

                    {bp.proTip && (
                      <Motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible">
                        <ProTipCard proTip={bp.proTip} />
                      </Motion.div>
                    )}
                  </>
                ) : (
                  <>
                    {bp.caption && (
                      <Motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
                        <CaptionCard bp={bp} copiedSection={copiedSection} handleCopy={handleCopy} />
                      </Motion.div>
                    )}

                    {bp.hashtags && (
                      <Motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
                        <HashtagsCard hashtags={bp.hashtags} copiedSection={copiedSection} handleCopy={handleCopy} />
                      </Motion.div>
                    )}

                    {bp.imageDirection && (
                      <Motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
                        <ImageDirectionCard imageDirection={bp.imageDirection} />
                      </Motion.div>
                    )}

                    {bp.postingIntel && (
                      <Motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
                        <PostingIntelCard postingIntel={bp.postingIntel} />
                      </Motion.div>
                    )}

                    {bp.proTip && (
                      <Motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
                        <ProTipCard proTip={bp.proTip} />
                      </Motion.div>
                    )}
                  </>
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
        feature="igniteEngine" // HUTTLE AI: updated 3
      />
    </div>
  );
}

/* ─── Section Helper Components ──────────────────────────────── */

function SectionCard({ icon, iconBg, title, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shadow-sm`}>
            {icon}
          </div>
          <h3 className="font-bold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-6 pb-6">
        {children}
      </div>
    </div>
  );
}

function CopyBtn({ label, copiedLabel, active, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
      {active ? <><Check className="w-3.5 h-3.5 text-green-600" /> {copiedLabel}</> : <><Copy className="w-3.5 h-3.5" /> {label}</>}
    </button>
  );
}

function ReasonCallout({ text }) {
  return (
    <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
      <p className="text-sm text-gray-500 italic">💡 {sanitizeAIOutput(text)}</p>
    </div>
  );
}

function InfoRow({ emoji, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-base flex-shrink-0">{emoji}</span>
      <div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <p className="text-sm text-gray-800 mt-0.5">{sanitizeAIOutput(value)}</p>
      </div>
    </div>
  );
}

function CaptionCard({ bp, copiedSection, handleCopy }) {
  return (
    <SectionCard
      icon={<Sparkles className="w-4 h-4 text-white" />}
      iconBg="bg-gradient-to-br from-teal-500 to-cyan-500"
      title="Your Caption"
      action={<CopyBtn label="Copy" copiedLabel="Copied!" active={copiedSection === 'caption'} onClick={() => handleCopy(bp.caption, 'caption')} />}
    >
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{sanitizeAIOutput(bp.caption)}</p>
      </div>
      {bp.captionReason && <ReasonCallout text={bp.captionReason} />}
    </SectionCard>
  );
}

function HashtagsCard({ hashtags, copiedSection, handleCopy }) {
  const allTags = [...(hashtags.niche || []), ...(hashtags.mid || []), ...(hashtags.broad || [])];

  const renderRow = (label, tags, prefix) => {
    if (!tags?.length) return null;
    return (
      <div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, i) => (
            <button
              key={i}
              onClick={() => handleCopy(tag, `${prefix}-${i}`)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-300 hover:scale-105 transition-all"
            >
              {copiedSection === `${prefix}-${i}` ? '✓ Copied' : sanitizeAIOutput(tag)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <SectionCard
      icon={<Hash className="w-4 h-4 text-white" />}
      iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
      title="Hashtags"
      action={<CopyBtn label="Copy All" copiedLabel="Copied All!" active={copiedSection === 'all-tags'} onClick={() => handleCopy(allTags.join(' '), 'all-tags')} />}
    >
      <div className="space-y-5">
        {renderRow('Niche', hashtags.niche, 'niche')}
        {renderRow('Mid-Range', hashtags.mid, 'mid')}
        {renderRow('Broad', hashtags.broad, 'broad')}
      </div>
      {hashtags.reason && (
        <p className="text-xs text-gray-400 mt-5">{sanitizeAIOutput(hashtags.reason)}</p>
      )}
    </SectionCard>
  );
}

function ImageDirectionCard({ imageDirection }) {
  return (
    <SectionCard
      icon={<Camera className="w-4 h-4 text-white" />}
      iconBg="bg-gradient-to-br from-indigo-500 to-blue-500"
      title="Image Direction"
    >
      <div className="space-y-3">
        <InfoRow emoji="📸" label="Concept" value={imageDirection.concept} />
        <InfoRow emoji="🎨" label="Style" value={imageDirection.style} />
        <InfoRow emoji="✍️" label="Text Overlay" value={imageDirection.textOverlay || 'None'} />
        <InfoRow emoji="⚠️" label="Avoid" value={imageDirection.avoid} />
      </div>
      {imageDirection.reason && <ReasonCallout text={imageDirection.reason} />}
    </SectionCard>
  );
}

function PostingIntelCard({ postingIntel }) {
  return (
    <SectionCard
      icon={<Clock className="w-4 h-4 text-white" />}
      iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
      title="When to Post"
    >
      <div className="space-y-4">
        <div>
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-cyan-50 text-cyan-700 text-sm font-bold border border-cyan-200">
            {sanitizeAIOutput(postingIntel.bestTime)}
          </span>
          {postingIntel.reason && (
            <p className="text-xs text-gray-400 mt-2">{sanitizeAIOutput(postingIntel.reason)}</p>
          )}
        </div>
        {postingIntel.frequency && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>🔁</span>
            <span className="font-medium">Post frequency:</span>
            <span>{sanitizeAIOutput(postingIntel.frequency)}</span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ProTipCard({ proTip }) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 shadow-sm p-6">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚡</span>
        <div>
          <h3 className="font-bold text-gray-900 mb-2">Pro Tip</h3>
          <p className="text-gray-700 leading-relaxed">{sanitizeAIOutput(proTip)}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Response Normalization ─────────────────────────────────── */

function normalizeN8nResponse(data) {
  if (!data || typeof data !== 'object') return null;

  const inner = (data.blueprint && typeof data.blueprint === 'object')
    ? data.blueprint
    : data;

  const isVideoContent = Boolean(inner.isVideoContent ?? inner.is_video_content ?? false);

  const rawScore = inner.performanceScore ?? inner.performance_score ?? inner.viralScore ?? inner.viral_score;
  const performanceScore = typeof rawScore === 'object'
    ? (rawScore?.score ?? 0)
    : (Number(rawScore) || 0);

  const rawBreakdown = inner.scoreBreakdown ?? inner.score_breakdown ?? {};
  const scoreBreakdown = {
    hookStrength: Number(rawBreakdown.hookStrength ?? rawBreakdown.hook_strength ?? 0),
    trendAlignment: Number(rawBreakdown.trendAlignment ?? rawBreakdown.trend_alignment ?? 0),
    audienceFit: Number(rawBreakdown.audienceFit ?? rawBreakdown.audience_fit ?? 0),
    platformOptimization: Number(rawBreakdown.platformOptimization ?? rawBreakdown.platform_optimization ?? 0),
  };

  const scoreReason = String(inner.scoreReason ?? inner.score_reason ?? '').trim();
  const caption = String(inner.caption ?? '').trim();
  const captionReason = String(inner.captionReason ?? inner.caption_reason ?? '').trim();

  const rawHashtags = inner.hashtags ?? null;
  const hashtags = rawHashtags ? {
    niche: normalizeArray(rawHashtags.niche),
    mid: normalizeArray(rawHashtags.mid),
    broad: normalizeArray(rawHashtags.broad),
    reason: String(rawHashtags.reason ?? '').trim(),
  } : null;

  const rawImageDir = inner.imageDirection ?? inner.image_direction ?? null;
  const imageDirection = rawImageDir ? {
    concept: String(rawImageDir.concept ?? '').trim(),
    style: String(rawImageDir.style ?? '').trim(),
    textOverlay: rawImageDir.textOverlay ?? rawImageDir.text_overlay ?? null,
    avoid: String(rawImageDir.avoid ?? '').trim(),
    reason: String(rawImageDir.reason ?? '').trim(),
  } : null;

  const rawPosting = inner.postingIntel ?? inner.posting_intel ?? null;
  const postingIntel = rawPosting ? {
    bestTime: String(rawPosting.bestTime ?? rawPosting.best_time ?? '').trim(),
    reason: String(rawPosting.reason ?? '').trim(),
    frequency: String(rawPosting.frequency ?? '').trim(),
  } : null;

  const proTip = String(inner.proTip ?? inner.pro_tip ?? '').trim();

  const hook = String(inner.hook ?? '').trim();
  const hookReason = String(inner.hookReason ?? inner.hook_reason ?? '').trim();
  const script = String(inner.script ?? '').trim();

  const rawAudioVibe = inner.audioVibe ?? inner.audio_vibe ?? null;
  const audioVibe = rawAudioVibe ? {
    mood: String(rawAudioVibe.mood ?? '').trim(),
    bpm: String(rawAudioVibe.bpm ?? '').trim(),
    tip: String(rawAudioVibe.tip ?? rawAudioVibe.suggestion ?? '').trim(),
  } : null;

  return {
    isVideoContent,
    performanceScore,
    scoreBreakdown,
    scoreReason,
    caption,
    captionReason,
    hashtags,
    imageDirection,
    postingIntel,
    proTip,
    hook,
    hookReason,
    script,
    audioVibe,
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
  const fallbackBrandBlock = buildBrandContext(brandProfile, { first_name: brandProfile?.firstName }); // HUTTLE AI: brand context injected

  const prompt = `${fallbackBrandBlock}You are a content strategist. Generate a ${contentType} content brief for ${platform}.

Topic: ${topic}
Goal: ${goal}
Target Audience: ${targetAudience}
Brand Voice: ${brandProfile?.brandVoice || 'authentic'}

Return ONLY valid JSON with this exact structure:
{
  "isVideoContent": ${isVideo},
  "performanceScore": <number 70-95>,
  "scoreBreakdown": {
    "hookStrength": <0-25>,
    "trendAlignment": <0-25>,
    "audienceFit": <0-25>,
    "platformOptimization": <0-25>
  },
  "scoreReason": "<brief explanation of the score>",
  ${isVideo ? `"hook": "<compelling opening hook line>",
  "hookReason": "<why this hook works>",
  "script": "<full script with ... pause markers>",` : ''}
  "caption": "<full caption with emojis and line breaks>",
  "captionReason": "<why this caption works>",
  ${!isVideo ? `"hashtags": {
    "niche": ["#tag1", "#tag2", "#tag3"],
    "mid": ["#tag1", "#tag2", "#tag3"],
    "broad": ["#tag1", "#tag2", "#tag3"],
    "reason": "<hashtag strategy>"
  },` : ''}
  ${isVideo ? `"audioVibe": {
    "mood": "<music mood>",
    "bpm": "<bpm range>",
    "tip": "<audio direction tip>"
  },` : ''}
  "imageDirection": {
    "concept": "<visual concept>",
    "style": "<visual style>",
    "textOverlay": "<text overlay or null>",
    "avoid": "<what to avoid visually>",
    "reason": "<visual strategy>"
  },
  "postingIntel": {
    "bestTime": "<best posting time>",
    "reason": "<timing rationale>",
    "frequency": "<posting frequency>"
  },
  "proTip": "<actionable pro tip>"
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
        { role: 'system', content: 'You are a content strategist. Return only valid JSON.' },
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
    return normalizeN8nResponse(parsed);
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
