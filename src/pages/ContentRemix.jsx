import { useState, useContext, useEffect, useRef } from 'react';
import { Shuffle, Sparkles, ArrowRight, ArrowLeft, Copy, Check, Flame, DollarSign, Save, RefreshCw, Zap, AlertTriangle, ExternalLink, Loader2, Hash, Instagram, Youtube, Twitter, Facebook, Globe, Mail, MoreHorizontal, Music, AtSign } from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { generateContentRemix } from '../services/contentRemixAPI';
import { remixContentWithMode } from '../services/grokAPI';
import { getBrandVoice, getNiche, getTargetAudience } from '../utils/brandContextBuilder';
import LoadingSpinner from '../components/LoadingSpinner';
import { getToastDisclaimer } from '../components/AIDisclaimer';
import usePreferredPlatforms from '../hooks/usePreferredPlatforms';
import useAIUsage from '../hooks/useAIUsage';
import RunCapMeter from '../components/RunCapMeter';
import { useSubscription } from '../context/SubscriptionContext';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { saveToVault } from '../services/contentService';
import { buildContentVaultPayload } from '../utils/contentVault';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized
import humanizeContent, {
  mapBrandVoiceToHumanizeType,
  normalizeHumanizePlatform,
} from '../services/humanizeContent';
import {
  PLATFORM_CONTENT_RULES,
  getPlatformPromptRule,
  getHashtagConstraint,
} from '../data/platformContentRules';

/**
 * Source platform options for Step 1
 */
const SOURCE_PLATFORMS = [
  { id: 'Instagram', label: 'Instagram', Icon: Instagram },
  { id: 'TikTok', label: 'TikTok', Icon: Music },
  { id: 'X (Twitter)', label: 'X (Twitter)', Icon: Twitter },
  { id: 'YouTube', label: 'YouTube', Icon: Youtube },
  { id: 'Facebook', label: 'Facebook', Icon: Facebook },
  { id: 'Threads', label: 'Threads', Icon: AtSign },
  { id: 'Blog / Article', label: 'Blog / Article', Icon: Globe },
  { id: 'Email / Newsletter', label: 'Email / Newsletter', Icon: Mail },
  { id: 'Other', label: 'Other', Icon: MoreHorizontal },
];

const SOURCE_PLATFORM_PLACEHOLDER_MAP = {
  'Instagram': 'Paste your Instagram caption here...',
  'TikTok': 'Paste your TikTok caption or script here...',
  'X (Twitter)': 'Paste your tweet or thread here...',
  'YouTube': 'Paste your YouTube description, title, or script excerpt here...',
  'Facebook': 'Paste your Facebook post here...',
  'Threads': 'Paste your Threads post here...',
  'Blog / Article': 'Paste your blog excerpt or article section here...',
  'Email / Newsletter': 'Paste your email copy here...',
  'Other': 'Paste your text content here...',
};

/** Platforms that are not social — don't exclude from output platform selector */
const NON_SOCIAL_SOURCE_PLATFORMS = new Set(['Blog / Article', 'Email / Newsletter', 'Other']);

function getSourceContext(platform) {
  const contexts = {
    'Instagram': 'visual-first, caption-driven, hashtag-rich, story-telling format',
    'TikTok': 'short-form, trend-driven, conversational, hook-heavy, script-style',
    'X (Twitter)': 'concise, punchy, thread-friendly, hot-take style, 280 chars max per tweet',
    'YouTube': 'long-form, SEO-optimized, descriptive, keyword-rich',
    'Facebook': 'community-oriented, shareable, longer captions acceptable, engagement-bait friendly',
    'Threads': 'conversational, opinion-driven, text-first, casual tone',
    'Blog / Article': 'long-form, structured, SEO-focused, educational or informational',
    'Email / Newsletter': 'personal, direct, CTA-focused, subscriber-relationship tone',
    'Other': 'general text content',
  };
  return contexts[platform] || 'general text content';
}

/**
 * Remix goal options with metadata
 */
const REMIX_GOALS = [
  {
    id: 'viral',
    label: 'Viral Reach',
    description: 'Optimized for engagement, shares, and saves',
    icon: Flame,
    color: 'orange',
    bgGradient: 'from-orange-50 to-amber-50',
    borderActive: 'border-orange-400 ring-orange-200',
    iconColor: 'text-orange-500',
  },
  {
    id: 'sales',
    label: 'Sales Conversion',
    description: 'PAS framework with strong CTAs',
    icon: DollarSign,
    color: 'green',
    bgGradient: 'from-green-50 to-emerald-50',
    borderActive: 'border-green-400 ring-green-200',
    iconColor: 'text-green-600',
  },
];

/**
 * Platform icon and color mapping
 */
const PLATFORM_STYLES = {
  Instagram: { color: 'from-pink-500 to-purple-500', badge: 'bg-gradient-to-r from-pink-500 to-purple-500' },
  TikTok: { color: 'from-black to-cyan-500', badge: 'bg-black' },
  X: { color: 'from-black to-gray-800', badge: 'bg-black' },
  Facebook: { color: 'from-blue-600 to-blue-700', badge: 'bg-blue-600' },
  YouTube: { color: 'from-red-600 to-red-700', badge: 'bg-red-600' },
};

/**
 * Content Remix Studio — Reimagined UX
 * 
 * Step 1: Paste text content
 * Step 2: Choose remix goal (Viral Reach or Sales Conversion)
 * Step 3: Select output platforms (from Brand Voice)
 * Step 4: View remixed results per platform
 */
export default function ContentRemix() {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const { platforms: brandVoicePlatforms, hasPlatformsConfigured } = usePreferredPlatforms();
  const { userTier } = useSubscription();
  const remixUsage = useAIUsage('contentRemix');
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prefill = location.state;

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Source platform + input
  const [selectedSourcePlatform, setSelectedSourcePlatform] = useState('');
  const [showSourceValidation, setShowSourceValidation] = useState(false);
  const [remixInput, setRemixInput] = useState(prefill?.prefillContent || '');

  // Step 2: Goal
  const [remixGoal, setRemixGoal] = useState('viral');

  // Step 3: Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Step 4: Results
  const [remixResults, setRemixResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remixError, setRemixError] = useState(null);
  const [usedAiFallback, setUsedAiFallback] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [isPolishingRemix, setIsPolishingRemix] = useState(false);
  const remixPolishGenRef = useRef(0);

  // Initialize selected platforms from Brand Voice (extract names from platform objects)
  useEffect(() => {
    if (brandVoicePlatforms.length > 0 && selectedPlatforms.length === 0) {
      setSelectedPlatforms(brandVoicePlatforms.map(p => (typeof p === 'object' && p !== null ? p.name : p)));
    }
  }, [brandVoicePlatforms]);

  // Check for content passed from Trend Lab via sessionStorage
  useEffect(() => {
    const storedContent = sessionStorage.getItem('remixContent');
    if (storedContent) {
      setRemixInput(storedContent);
      sessionStorage.removeItem('remixContent');
    }
  }, []);

  useEffect(() => {
    const inputParam = searchParams.get('input');
    const goalParam = searchParams.get('goal');
    let didPrefill = false;

    if (inputParam) {
      setRemixInput(inputParam);
      didPrefill = true;
    }

    if (goalParam && REMIX_GOALS.some((goal) => goal.id === goalParam)) {
      setRemixGoal(goalParam);
      didPrefill = true;
    }

    if (didPrefill) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('input');
      nextParams.delete('goal');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  /**
   * Ensure a value is a renderable string (guards against objects from API)
   */
  const ensureString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      // If it has a 'content' or 'text' key, use that
      if (val.content && typeof val.content === 'string') return val.content;
      if (val.text && typeof val.text === 'string') return val.text;
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  };

  const sanitizeVariationText = (value) => {
    const text = ensureString(value).replace(/\*\*(.*?)\*\*/g, '$1').replace(/\r\n/g, '\n');
    if (!text) return '';

    const withoutStandaloneLabels = text
      .split('\n')
      .filter((line) => !/^\s*(?:#+\s*)?(?:variation|option|version)\s*\d+\s*:?\s*$/i.test(line.trim()))
      .join('\n');

    return withoutStandaloneLabels
      .replace(/^\s*(?:#+\s*)?(?:variation|option|version)\s*\d+\s*[:.-]?\s*/i, '')
      .trim();
  };

  /**
   * Split a single platform's content into distinct variations
   */
  const splitIntoVariations = (content) => {
    const cleanedContent = sanitizeVariationText(content);
    if (!cleanedContent) return [cleanedContent];

    // Try splitting by numbered headers: "1.", "2.", "3." or "Variation 1", etc.
    const numberedSplit = cleanedContent.split(/\n\s*(?:\d+[.)]\s+|(?:Variation|Option|Version)\s*\d+[:.\s])/i);
    if (numberedSplit.length >= 2) {
      // First item may be empty or a preamble — filter out empties
      return numberedSplit.map((value) => sanitizeVariationText(value)).filter((value) => value.length > 15).slice(0, 3);
    }

    // Try splitting by markdown headers: "### " or "## "
    const headerSplit = cleanedContent.split(/\n\s*#{2,3}\s+/);
    if (headerSplit.length >= 2) {
      return headerSplit.map((value) => sanitizeVariationText(value)).filter((value) => value.length > 15).slice(0, 3);
    }

    // Try splitting by double newlines (paragraphs)
    const paragraphs = cleanedContent
      .split(/\n\n+/)
      .map((value) => sanitizeVariationText(value))
      .filter((value) => value.length > 20);
    if (paragraphs.length >= 2) {
      return paragraphs.slice(0, 3);
    }

    // Return as single variation
    return [cleanedContent];
  };

  /**
   * Parse AI response into per-platform sections with variations
   */
  const parseRemixOutput = (rawContent) => {
    if (!rawContent) return [];

    // Handle object response variants first (e.g., { Instagram: "...", TikTok: "..." }).
    if (typeof rawContent === 'object' && rawContent !== null) {
      const platformKeys = ['Instagram', 'TikTok', 'X', 'Twitter', 'Facebook', 'YouTube'];
      const platformSections = platformKeys
        .filter((key) => rawContent[key])
        .map((key) => {
          const platformName = key === 'Twitter' ? 'X' : key;
          return {
            platform: platformName,
            variations: splitIntoVariations(ensureString(rawContent[key])),
          };
        })
        .filter((section) =>
          selectedPlatforms.some((selected) => selected.toLowerCase() === section.platform.toLowerCase())
        );

      if (platformSections.length > 0) return platformSections;

      rawContent = ensureString(
        rawContent.content
        || rawContent.output
        || rawContent.result
        || rawContent.data
        || rawContent
      );
    }

    if (typeof rawContent !== 'string') {
      rawContent = ensureString(rawContent);
    }

    const sections = [];
    // Match ### Platform or **Platform** headers
    const platformRegex = /(?:^|\n)\s*(?:#{1,4}\s*|\*\*|platform\s*[:-]\s*)?(Instagram|TikTok|X|Twitter|Facebook|YouTube)(?:\*\*)?\s*[:-]?\s*/gi;
    const matches = [...rawContent.matchAll(platformRegex)];

    if (matches.length > 0) {
      matches.forEach((match, idx) => {
        const startIdx = match.index + match[0].length;
        const endIdx = idx < matches.length - 1 ? matches[idx + 1].index : rawContent.length;
        const content = rawContent.substring(startIdx, endIdx).trim();
        const platformName = match[1] === 'Twitter' ? 'X' : match[1];

        // Only include platforms the user selected
        if (selectedPlatforms.some(p => p.toLowerCase() === platformName.toLowerCase())) {
          const variations = splitIntoVariations(content.replace(/^[\s\-:]+/, '').trim());
          sections.push({
            platform: platformName,
            variations,
          });
        }
      });
    }

    // Fallback: if no platform headers found, show as a single block
    if (sections.length === 0) {
      const variations = splitIntoVariations(rawContent.trim());
      sections.push({
        platform: 'All Platforms',
        variations,
      });
    }

    return sections;
  };

  const getRemixErrorMessage = (errorType) => {
    if (errorType === 'TIMEOUT') {
      return 'AI generation took too long. Try shorter input and remix again.';
    }
    if (errorType === 'NETWORK') {
      return 'Connection issue while remixing. Please retry.';
    }
    if (errorType === 'INVALID_RESPONSE') {
      return 'The remix result was incomplete. Please retry.';
    }
    return 'Failed to remix content. Please try again.';
  };

  /**
   * Handle content remixing — Claude first, then Grok fallback
   */
  const handleRemix = async () => {
    if (!remixInput.trim()) {
      showToast('Please enter content to remix', 'warning');
      return;
    }
    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one output platform', 'warning');
      return;
    }
    if (!user?.id) {
      showToast('Please log in to use remix features', 'error');
      return;
    }
    const gate = await remixUsage.checkCanGenerate();
    if (!gate.allowed) {
      showToast(gate.message || "You've reached your monthly Content Remix limit.", 'warning');
      return;
    }

    setIsLoading(true);
    setRemixError(null);
    setRemixResults(null);
    setUsedAiFallback(false);

    const platformRemixRules = selectedPlatforms
      .map((platform) => {
        const raw = typeof platform === 'object' && platform !== null ? platform.name : platform;
        let key = String(raw ?? '').trim().toLowerCase() || 'instagram';
        if (key === 'twitter') key = 'x';
        const rules = PLATFORM_CONTENT_RULES[key] || PLATFORM_CONTENT_RULES.instagram;
        const effectiveKey = PLATFORM_CONTENT_RULES[key] ? key : 'instagram';
        const platformContext = getPlatformPromptRule(effectiveKey);
        const hashtagContext = getHashtagConstraint(effectiveKey);
        return `When remixing for ${rules.displayName}:
   ${platformContext}
   Hashtags: ${hashtagContext}`;
      })
      .join('\n\n');

    const applyRemixSuccess = async (raw, sections, fromFallback) => {
      const usage = await remixUsage.trackFeatureUsage({ mode: remixGoal });
      const polishGen = ++remixPolishGenRef.current;
      setRemixResults({ raw, sections });
      setUsedAiFallback(Boolean(fromFallback));
      const goalLabel = REMIX_GOALS.find(g => g.id === remixGoal)?.label || 'Remixed';
      showToast(`Content remixed for ${goalLabel}! ${getToastDisclaimer('remix')}`, 'success');
      setCurrentStep(4);
      if (!usage.allowed) {
        showToast('Your remix is ready, but we could not record this run against your plan limits. Refresh usage if the meter looks off.', 'warning');
      }

      setIsPolishingRemix(true);
      (async () => {
        try {
          const brandVoiceType = mapBrandVoiceToHumanizeType(brandData?.brandVoice);
          const nextSections = await Promise.all(
            (sections || []).map(async (sec) => ({
              ...sec,
              variations: await Promise.all(
                (sec.variations || []).map((v) =>
                  humanizeContent({
                    text: ensureString(v),
                    brandVoiceType,
                    platform: normalizeHumanizePlatform(sec.platform),
                  })
                )
              ),
            }))
          );
          if (polishGen !== remixPolishGenRef.current) return;
          setRemixResults((prev) => (prev && prev.raw === raw ? { raw, sections: nextSections } : prev));
        } finally {
          if (polishGen === remixPolishGenRef.current) setIsPolishingRemix(false);
        }
      })();
    };

    try {
      // Try Claude first
      const result = await generateContentRemix({
        userId: user.id,
        originalContent: remixInput,
        platforms: selectedPlatforms,
        brandVoice: getBrandVoice(brandData),
        mode: remixGoal,
        additionalContext: {
          mode: remixGoal,
          niche: getNiche(brandData),
          targetAudience: getTargetAudience(brandData),
          targetPlatforms: selectedPlatforms,
          sourcePlatform: selectedSourcePlatform,
          sourceContext: selectedSourcePlatform ? getSourceContext(selectedSourcePlatform) : '',
          ...brandData,
          platformRemixRules,
        }
      });

      const hasPrimary =
        result.success
        && (Boolean(result.content?.trim()) || (Array.isArray(result.sections) && result.sections.length > 0));

      if (hasPrimary) {
        const safeContent = ensureString(result.content || '');
        let parsed;
        try {
          parsed = Array.isArray(result.sections) && result.sections.length > 0
            ? result.sections
            : parseRemixOutput(safeContent);
        } catch (parseErr) {
          console.error('[ContentRemix] Remix parse error', parseErr);
          parsed = [];
        }
        if (!parsed.length && safeContent) {
          parsed = [{ platform: 'All Platforms', variations: [safeContent] }];
        }
        await applyRemixSuccess(safeContent, parsed, false);
        return;
      }

      if (result.success) {
        console.warn('[ContentRemix] Primary response missing content; using Grok fallback', result.error);
      } else {
        console.warn('[ContentRemix] Claude remix failed, falling back to Grok API:', result.error);
      }

      const grokResult = await remixContentWithMode(remixInput, brandData, remixGoal, selectedPlatforms, {
        goal: remixGoal,
      });

      if (grokResult.success && (grokResult.remixed || grokResult.ideas)) {
        const rawContent = grokResult.remixed || grokResult.ideas;
        const safeContent = ensureString(rawContent);
        let parsed;
        try {
          parsed = parseRemixOutput(safeContent);
        } catch (parseErr) {
          console.error('[ContentRemix] Grok remix parse error', parseErr);
          parsed = [{ platform: 'All Platforms', variations: [safeContent] }];
        }
        await applyRemixSuccess(safeContent, parsed, true);
        return;
      }

      const errorMessage = getRemixErrorMessage(result.errorType);
      setRemixError(errorMessage);
      showToast(errorMessage, 'error');
    } catch (error) {
      console.error('Error remixing content:', error);
      try {
        const grokResult = await remixContentWithMode(remixInput, brandData, remixGoal, selectedPlatforms, {
          goal: remixGoal,
        });
        if (grokResult.success && (grokResult.remixed || grokResult.ideas)) {
          const content = grokResult.remixed || grokResult.ideas;
          const safeContent = ensureString(content);
          let parsed;
          try {
            parsed = parseRemixOutput(safeContent);
          } catch (parseErr) {
            console.error('[ContentRemix] Grok remix parse error', parseErr);
            parsed = [{ platform: 'All Platforms', variations: [safeContent] }];
          }
          await applyRemixSuccess(safeContent, parsed, true);
          return;
        }
      } catch (grokError) {
        console.error('Grok fallback also failed:', grokError);
      }
      const finalError = error?.message?.includes('timeout') || error?.name === 'AbortError'
        ? 'Generation timed out. Please try again with shorter input.'
        : getRemixErrorMessage('UNKNOWN');
      setRemixError(finalError);
      showToast(finalError, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    const copyText = typeof text === 'string' ? text : ensureString(text);
    navigator.clipboard.writeText(copyText);
    setCopiedId(id);
    showToast(`Content copied! ${getToastDisclaimer('general')}`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveVariation = async (variation, platformName, variationId) => {
    if (!user?.id) {
      showToast('Please log in to save content', 'error');
      return;
    }

    try {
      const contentText = ensureString(variation);
      const result = await saveToVault(user.id, buildContentVaultPayload({
        name: `Remix - ${platformName}`,
        contentText,
        contentType: 'remix',
        toolSource: 'content_remix',
        toolLabel: 'Content Remix Studio',
        topic: remixInput.slice(0, 120),
        platform: platformName,
        description: `Content Remix Studio | ${platformName} | ${REMIX_GOALS.find((goal) => goal.id === remixGoal)?.label || remixGoal}`,
        metadata: {
          goal: remixGoal,
          source_content: remixInput.slice(0, 500),
        },
      }));

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      setSavedId(variationId);
      setTimeout(() => setSavedId(null), 2000);
      showToast('Saved to vault ✓', 'success');
    } catch (error) {
      console.error('Failed to save remix variation:', error);
      showToast('Failed to save content', 'error');
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setRemixInput('');
    setSelectedSourcePlatform('');
    setShowSourceValidation(false);
    setRemixGoal('viral');
    const namesFromBrand = brandVoicePlatforms.map((p) =>
      (typeof p === 'object' && p !== null ? p.name : String(p))
    );
    setSelectedPlatforms(brandVoicePlatforms.length > 0 ? namesFromBrand : []);
    setRemixResults(null);
    setRemixError(null);
    setUsedAiFallback(false);
  };

  const handleRemixAgain = () => {
    setRemixResults(null);
    setRemixError(null);
    setUsedAiFallback(false);
    setCurrentStep(3);
  };

  const canProceedToStep2 = Boolean(selectedSourcePlatform) && remixInput.trim().length >= 20;
  const canProceedToStep3 = canProceedToStep2 && remixGoal;
  const canRemix = canProceedToStep3 && selectedPlatforms.length > 0;

  const remixTopicForHashtags =
    remixInput.trim().slice(0, 500) || String(getNiche(brandData) || '').trim().slice(0, 200);
  const hashtagToolsHref = remixTopicForHashtags
    ? `/dashboard/ai-tools?tab=hashtags&topic=${encodeURIComponent(remixTopicForHashtags)}`
    : '/dashboard/ai-tools?tab=hashtags';

  // Filtered output platforms — exclude the source platform (if it's a social platform)
  const filteredOutputPlatforms = brandVoicePlatforms.filter((platform) => {
    if (!selectedSourcePlatform || NON_SOCIAL_SOURCE_PLATFORMS.has(selectedSourcePlatform)) return true;
    const platformName = typeof platform === 'object' && platform !== null ? platform.name : String(platform);
    // Normalise X/Twitter matching between source id and brand platform names
    const sourceKey = selectedSourcePlatform === 'X (Twitter)' ? 'x' : selectedSourcePlatform.toLowerCase();
    const platformKey = platformName.toLowerCase() === 'x' || platformName.toLowerCase() === 'twitter' ? 'x' : platformName.toLowerCase();
    return sourceKey !== platformKey;
  });

  // Step indicator data
  const steps = [
    { num: 1, label: 'Your Content' },
    { num: 2, label: 'Choose Goal' },
    { num: 3, label: 'Select Platforms' },
    { num: 4, label: 'Results' },
  ];

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 md:ml-12 lg:ml-64 pt-14 lg:pt-20 px-4 sm:px-6 lg:px-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {isLoading && (
        <LoadingSpinner fullScreen variant="huttle" text="Remixing your content…" />
      )}
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="pt-6 md:pt-0 mb-6 md:mb-8">
          <div className="flex items-start justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                <Shuffle className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                  Content Remix Studio
                </h1>
                <p className="text-sm md:text-base text-gray-500">
                  Transform your text content into fresh posts for every platform
                </p>
              </div>
            </div>
            <RunCapMeter
              featureKey="contentRemix"
              tier={userTier}
              featureLabel="Content Remix runs"
              compact
              className="hidden sm:inline-flex flex-shrink-0 mt-2"
            />
          </div>
          <RunCapMeter
            featureKey="contentRemix"
            tier={userTier}
            featureLabel="Content Remix runs"
            compact
            className="sm:hidden mt-2"
          />
        </div>

        {/* Step Progress — compact on mobile */}
        <div className="mb-6 md:mb-8">
          <div className="md:hidden">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-900">
              <span>
                Step {currentStep} of {steps.length}
              </span>
              <span className="font-medium text-huttle-primary">{steps.find((s) => s.num === currentStep)?.label}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-huttle-primary transition-all duration-300 ease-out"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="hidden items-center justify-between md:flex">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep && step.num < 4) setCurrentStep(step.num);
                  }}
                  disabled={step.num > currentStep || step.num === 4}
                  className={`flex items-center gap-2 ${step.num <= currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      step.num === currentStep
                        ? 'bg-huttle-primary text-white shadow-md shadow-huttle-primary/30'
                        : step.num < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.num < currentStep ? <Check className="h-4 w-4" /> : step.num}
                  </div>
                  <span
                    className={`hidden text-xs font-medium sm:inline ${
                      step.num === currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded ${step.num < currentStep ? 'bg-green-400' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===================== STEP 1: What are you remixing? ===================== */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">1</span>
              What are you remixing?
            </h2>
            <p className="text-sm text-gray-500 mb-5 ml-10">
              Tell us where your content is from, then paste it in.
            </p>

            {/* 1A: Source Platform Selector */}
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Where is this content from?
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Knowing the original platform helps us remix it intelligently
              </p>
              <div className="flex flex-wrap gap-2">
                {SOURCE_PLATFORMS.map(({ id, label, Icon }) => {
                  const isSelected = selectedSourcePlatform === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedSourcePlatform(id);
                        setShowSourceValidation(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-huttle-primary bg-huttle-primary/8 text-huttle-primary ring-1 ring-huttle-primary/30 shadow-sm'
                          : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-huttle-primary' : 'text-gray-400'}`} />
                      {label}
                    </button>
                  );
                })}
              </div>
              {showSourceValidation && !selectedSourcePlatform && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Please select where your content is from
                </p>
              )}
            </div>

            {/* 1B: Text Input */}
            <textarea
              placeholder={
                selectedSourcePlatform
                  ? SOURCE_PLATFORM_PLACEHOLDER_MAP[selectedSourcePlatform]
                  : 'First, select where your content is from above ☝️'
              }
              value={remixInput}
              onChange={(e) => setRemixInput(e.target.value)}
              disabled={!selectedSourcePlatform}
              className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary transition-all outline-none text-gray-800 placeholder-gray-400 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">
                Text only — no images or videos.{' '}
                <Link to="/dashboard/ai-tools" className="text-huttle-primary hover:underline inline-flex items-center gap-0.5">
                  Looking for visual ideas? Try Visual Brainstormer <ExternalLink className="w-3 h-3" />
                </Link>
              </p>
              <span className={`text-xs ${remixInput.trim().length > 0 && remixInput.trim().length < 20 ? 'text-amber-500' : 'text-gray-400'}`}>
                {remixInput.length} chars{remixInput.trim().length > 0 && remixInput.trim().length < 20 ? ' (min 20)' : ''}
              </span>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  if (!selectedSourcePlatform) {
                    setShowSourceValidation(true);
                    return;
                  }
                  setCurrentStep(2);
                }}
                disabled={!canProceedToStep2}
                className="flex items-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-xl hover:bg-huttle-primary-dark transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Next: Choose Goal <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================== STEP 2: Choose Remix Goal ===================== */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">2</span>
              Choose Your Remix Goal
            </h2>
            <p className="text-sm text-gray-500 mb-5 ml-10">
              What do you want to achieve with this content?
            </p>

            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3">
              {REMIX_GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = remixGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setRemixGoal(goal.id)}
                    className={`min-h-[52px] w-full rounded-xl border-2 p-4 text-left transition-all sm:min-h-0 ${
                      isSelected
                        ? `${goal.borderActive} ring-2 bg-gradient-to-br ${goal.bgGradient} shadow-md`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? `bg-white shadow-sm` : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? goal.iconColor : 'text-gray-500'}`} />
                      </div>
                      <h3 className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                        {goal.label}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 ml-[52px]">{goal.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3}
                className="flex items-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-xl hover:bg-huttle-primary-dark transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Next: Select Platforms <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================== STEP 3: Select Platforms + Remix ===================== */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">3</span>
              Select Output Platforms
            </h2>
            <p className="text-sm text-gray-500 mb-5 ml-10">
              Choose which platforms to generate remixed content for.
            </p>

            {!hasPlatformsConfigured || brandVoicePlatforms.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">No platforms configured</p>
                  <p className="text-sm text-gray-600">
                    Choose your platforms under <span className="font-medium">Account → Brand Profile</span> in the sidebar, then return here.
                  </p>
                </div>
              </div>
            ) : filteredOutputPlatforms.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">No other platforms available</p>
                  <p className="text-sm text-gray-600">
                    Your Brand Profile only has {selectedSourcePlatform} configured, which is the source platform. Add more platforms under <span className="font-medium">Account → Brand Profile</span>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {selectedSourcePlatform && !NON_SOCIAL_SOURCE_PLATFORMS.has(selectedSourcePlatform) && (
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-huttle-primary" />
                    {selectedSourcePlatform} excluded — you&apos;re remixing <em>from</em> it
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {filteredOutputPlatforms.map((platform) => {
                    const platformName = typeof platform === 'object' && platform !== null ? platform.name : String(platform);
                    const isSelected = selectedPlatforms.includes(platformName);
                    return (
                      <button
                        key={platformName}
                        onClick={() => togglePlatform(platformName)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          isSelected
                            ? 'border-huttle-primary bg-huttle-primary/5 text-huttle-primary ring-1 ring-huttle-primary/30'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        {platformName}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Summary Card */}
            {canRemix && (
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Remix Summary</h4>
                <div className="space-y-1 text-xs text-gray-500">
                  {selectedSourcePlatform && (
                    <p><span className="text-gray-400">Source:</span> {selectedSourcePlatform}</p>
                  )}
                  <p><span className="text-gray-400">Content:</span> {remixInput.substring(0, 80)}...</p>
                  <p><span className="text-gray-400">Goal:</span> {REMIX_GOALS.find(g => g.id === remixGoal)?.label}</p>
                  <p><span className="text-gray-400">Platforms:</span> {selectedPlatforms.map(p => (typeof p === 'object' && p !== null ? p.name : p)).join(', ')}</p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {remixError && !isLoading && (
              <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Something went wrong</p>
                  <p className="text-sm text-gray-600">{remixError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleRemix}
                disabled={!canRemix || isLoading}
                className="flex items-center gap-3 px-6 py-3 bg-huttle-primary text-white rounded-xl hover:bg-huttle-primary-dark transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Remixing (10-15 sec)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Remix Content</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ===================== STEP 4: Results ===================== */}
        {currentStep === 4 && remixResults && (
          <div className="space-y-5 animate-fadeIn">
            {/* Results Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-sm font-bold text-green-600">
                    <Check className="w-4 h-4" />
                  </span>
                  Remixed Content
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRemixAgain}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-huttle-primary hover:bg-huttle-50 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Remix Again
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Shuffle className="w-4 h-4" />
                    Start Over
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 ml-10">
                {REMIX_GOALS.find(g => g.id === remixGoal)?.label} remix for {selectedPlatforms.join(', ')}
              </p>
              {usedAiFallback && (
                <p className="text-xs text-gray-400 ml-10 mt-1">Powered by AI fallback</p>
              )}
              {isPolishingRemix && (
                <p className="flex items-center gap-2 text-xs text-gray-500 ml-10 mt-2" role="status">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-huttle-primary" aria-hidden />
                  Polishing…
                </p>
              )}
            </div>

            {/* Platform Sections with Variations */}
            {(remixResults.sections || []).map((section, sIdx) => {
              const style = PLATFORM_STYLES[section.platform] || { badge: 'bg-gray-600' };
              return (
                <div key={sIdx} className="space-y-3">
                  {/* Platform Label */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${style.badge}`}>
                      {section.platform}
                    </span>
                    <span className="text-xs text-gray-400">
                      {section.variations.length} variation{section.variations.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Variation Cards */}
                  {(section.variations || []).map((variation, vIdx) => {
                    const variationId = `s${sIdx}-v${vIdx}`;
                    const isCopied = copiedId === variationId;
                    return (
                      <div key={vIdx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Variation Header */}
                        {section.variations.length > 1 && (
                          <div className="px-5 py-2.5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Variation {vIdx + 1}
                            </span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="p-5">
                          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {sanitizeAIOutput(sanitizeVariationText(variation))}
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="px-5 py-3 bg-gray-50/30 border-t border-gray-100 flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(variation, variationId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {isCopied ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={() => handleSaveVariation(variation, section.platform, variationId)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            data-testid="content-remix-save-vault"
                          >
                            {savedId === variationId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Save className="w-3.5 h-3.5" />}
                            {savedId === variationId ? 'Saved ✓' : 'Save to Vault'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Hashtag Generator nudge — after successful results only */}
            {!isLoading && !remixError && (remixResults.sections || []).length > 0 && (
              <div className="rounded-xl border border-huttle-primary/10 bg-[#0C1220]/[0.04] p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-huttle-primary/10">
                      <Hash className="h-4 w-4 text-huttle-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        Want trending hashtags for these posts?
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                        Run them through the Hashtag Generator for real-time ranked results.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={hashtagToolsHref}
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-huttle-primary/10 px-3.5 py-2 text-xs font-semibold text-huttle-primary transition-colors hover:bg-huttle-primary/15"
                  >
                    Generate Hashtags →
                  </Link>
                </div>
              </div>
            )}

            {/* Copy All */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleCopy(remixResults.raw, 'all')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium border border-gray-200 shadow-sm"
              >
                <Copy className="w-4 h-4" />
                {copiedId === 'all' ? 'Copied All!' : 'Copy All Content'}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center pt-1">
              AI-assisted output. Final review recommended before publishing.
            </p>
          </div>
        )}

        {/* Brand Context (shown on steps 1-3) */}
        {currentStep < 4 && brandData?.niche && (
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
      </div>
    </div>
  );
}
