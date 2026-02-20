import { useState, useContext, useEffect } from 'react';
import { Shuffle, Sparkles, ArrowRight, ArrowLeft, Copy, Check, Flame, DollarSign, Save, RefreshCw, Zap, AlertTriangle, BookOpen, Users, ExternalLink } from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { generateWithN8n } from '../services/n8nGeneratorAPI';
import { remixContentWithMode } from '../services/grokAPI';
import { getBrandVoice, getNiche, getTargetAudience } from '../utils/brandContextBuilder';
import LoadingSpinner from '../components/LoadingSpinner';
import { getToastDisclaimer } from '../components/AIDisclaimer';
import usePreferredPlatforms from '../hooks/usePreferredPlatforms';
import useAIUsage from '../hooks/useAIUsage';
import AIUsageMeter from '../components/AIUsageMeter';
import { useNavigate, Link } from 'react-router-dom';

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
  {
    id: 'educational',
    label: 'Educational',
    description: 'Teach and provide value',
    icon: BookOpen,
    color: 'blue',
    bgGradient: 'from-blue-50 to-indigo-50',
    borderActive: 'border-blue-400 ring-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    id: 'community',
    label: 'Community Building',
    description: 'Spark conversations and connection',
    icon: Users,
    color: 'purple',
    bgGradient: 'from-purple-50 to-violet-50',
    borderActive: 'border-purple-400 ring-purple-200',
    iconColor: 'text-purple-600',
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
 * Step 2: Choose remix goal (Viral, Sales, Educational, Community)
 * Step 3: Select output platforms (from Brand Voice)
 * Step 4: View remixed results per platform
 */
export default function ContentRemix() {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addToast: showToast } = useToast();
  const { platforms: brandVoicePlatforms, hasPlatformsConfigured } = usePreferredPlatforms();
  const remixUsage = useAIUsage('contentRemix');
  const navigate = useNavigate();

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Input
  const [remixInput, setRemixInput] = useState('');

  // Step 2: Goal
  const [remixGoal, setRemixGoal] = useState('viral');

  // Step 3: Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Step 4: Results
  const [remixResults, setRemixResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remixError, setRemixError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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

  /**
   * Split a single platform's content into distinct variations
   */
  const splitIntoVariations = (content) => {
    if (!content) return [ensureString(content)];

    // Try splitting by numbered headers: "1.", "2.", "3." or "Variation 1", etc.
    const numberedSplit = content.split(/\n\s*(?:\d+[\.\)]\s+|(?:Variation|Option|Version)\s*\d+[:\.\s])/i);
    if (numberedSplit.length >= 2) {
      // First item may be empty or a preamble — filter out empties
      return numberedSplit.map(v => v.trim()).filter(v => v.length > 15).slice(0, 3);
    }

    // Try splitting by markdown headers: "### " or "## "
    const headerSplit = content.split(/\n\s*#{2,3}\s+/);
    if (headerSplit.length >= 2) {
      return headerSplit.map(v => v.trim()).filter(v => v.length > 15).slice(0, 3);
    }

    // Try splitting by double newlines (paragraphs)
    const paragraphs = content.split(/\n\n+/).map(v => v.trim()).filter(v => v.length > 20);
    if (paragraphs.length >= 2) {
      return paragraphs.slice(0, 3);
    }

    // Return as single variation
    return [content.trim()];
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
    const platformRegex = /(?:^|\n)\s*(?:#{1,4}\s*|\*\*|platform\s*[:\-]\s*)?(Instagram|TikTok|X|Twitter|Facebook|YouTube)(?:\*\*)?\s*[:\-]?\s*/gi;
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
   * Handle content remixing — n8n first, then Grok fallback
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
    if (!remixUsage.canGenerate) {
      showToast('You\'ve reached your monthly Content Remix limit. Resets on the 1st.', 'warning');
      return;
    }

    setIsLoading(true);
    // Track usage
    await remixUsage.trackFeatureUsage({ mode: remixGoal });
    setRemixError(null);
    setRemixResults(null);

    try {
      // Try n8n first
      const result = await generateWithN8n({
        userId: user.id,
        topic: remixInput,
        platform: selectedPlatforms.join(', '),
        contentType: 'remix',
        brandVoice: getBrandVoice(brandData),
        remixMode: remixGoal,
        additionalContext: {
          mode: remixGoal,
          niche: getNiche(brandData),
          targetAudience: getTargetAudience(brandData),
          targetPlatforms: selectedPlatforms,
          ...brandData
        }
      });

      if (result.success && result.content) {
        const safeContent = ensureString(result.content);
        const parsed = parseRemixOutput(safeContent);
        setRemixResults({ raw: safeContent, sections: parsed });
        const goalLabel = REMIX_GOALS.find(g => g.id === remixGoal)?.label || 'Remixed';
        showToast(`Content remixed for ${goalLabel}! ${getToastDisclaimer('remix')}`, 'success');
        setCurrentStep(4);
        return;
      }

      // n8n failed — fallback to Grok API
      console.warn('n8n remix failed, falling back to Grok API:', result.error);
      const grokResult = await remixContentWithMode(remixInput, brandData, remixGoal, selectedPlatforms);

      if (grokResult.success && (grokResult.remixed || grokResult.ideas)) {
        const rawContent = grokResult.remixed || grokResult.ideas;
        const safeContent = ensureString(rawContent);
        const parsed = parseRemixOutput(safeContent);
        setRemixResults({ raw: safeContent, sections: parsed });
        const goalLabel = REMIX_GOALS.find(g => g.id === remixGoal)?.label || 'Remixed';
        showToast(`Content remixed for ${goalLabel}! ${getToastDisclaimer('remix')}`, 'success');
        setCurrentStep(4);
        return;
      }

      // Both failed
      const errorMessage = getRemixErrorMessage(result.errorType);
      setRemixError(errorMessage);
      showToast(errorMessage, 'error');
    } catch (error) {
      console.error('Error remixing content:', error);
      // Final fallback attempt
      try {
        const grokResult = await remixContentWithMode(remixInput, brandData, remixGoal, selectedPlatforms);
        if (grokResult.success && (grokResult.remixed || grokResult.ideas)) {
          const content = grokResult.remixed || grokResult.ideas;
          const parsed = parseRemixOutput(content);
          setRemixResults({ raw: content, sections: parsed });
          showToast(`Content remixed! ${getToastDisclaimer('remix')}`, 'success');
          setCurrentStep(4);
          return;
        }
      } catch (grokError) {
        console.error('Grok fallback also failed:', grokError);
      }
      const finalError = getRemixErrorMessage('UNKNOWN');
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

  const handleStartOver = () => {
    setCurrentStep(1);
    setRemixInput('');
    setRemixGoal('viral');
    setSelectedPlatforms(brandVoicePlatforms.length > 0 ? [...brandVoicePlatforms] : []);
    setRemixResults(null);
    setRemixError(null);
  };

  const handleRemixAgain = () => {
    setRemixResults(null);
    setRemixError(null);
    setCurrentStep(3);
  };

  // Loading state - show skeleton on step 4 while generating
  const isRemixing = isLoading && currentStep === 3;

  const canProceedToStep2 = remixInput.trim().length > 10;
  const canProceedToStep3 = canProceedToStep2 && remixGoal;
  const canRemix = canProceedToStep3 && selectedPlatforms.length > 0;

  // Step indicator data
  const steps = [
    { num: 1, label: 'Paste Content' },
    { num: 2, label: 'Choose Goal' },
    { num: 3, label: 'Select Platforms' },
    { num: 4, label: 'Results' },
  ];

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="fixed inset-0 pointer-events-none pattern-mesh opacity-30 z-0" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <Shuffle className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                Content Remix Studio
              </h1>
              <p className="text-sm md:text-base text-gray-500">
                Transform your text content into fresh posts for every platform
              </p>
            </div>
          </div>
          {/* Per-feature usage meter */}
          <div className="mt-3">
            <AIUsageMeter
              used={remixUsage.featureUsed}
              limit={remixUsage.featureLimit}
              label="Remixes this month"
              compact
            />
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <button
                  onClick={() => {
                    if (step.num < currentStep && step.num < 4) setCurrentStep(step.num);
                  }}
                  disabled={step.num > currentStep || step.num === 4}
                  className={`flex items-center gap-2 ${step.num <= currentStep ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step.num === currentStep
                      ? 'bg-huttle-primary text-white shadow-md shadow-huttle-primary/30'
                      : step.num < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.num < currentStep ? <Check className="w-4 h-4" /> : step.num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${
                    step.num === currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded ${
                    step.num < currentStep ? 'bg-green-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===================== STEP 1: Paste Content ===================== */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">1</span>
              Paste Your Text Content
            </h2>
            <p className="text-sm text-gray-500 mb-4 ml-10">
              Captions, blog excerpts, emails, tweets, or any written content.
            </p>

            <textarea
              placeholder="Paste your text content here — captions, blog excerpts, emails, tweets, or any written content you want to remix into platform-optimized posts..."
              value={remixInput}
              onChange={(e) => setRemixInput(e.target.value)}
              className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary transition-all outline-none text-gray-800 placeholder-gray-400 resize-none"
            />

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">
                Text only — no images or videos.{' '}
                <Link to="/dashboard/ai-tools" className="text-huttle-primary hover:underline inline-flex items-center gap-0.5">
                  Looking for visual ideas? Try Visual Brainstormer <ExternalLink className="w-3 h-3" />
                </Link>
              </p>
              <span className="text-xs text-gray-400">{remixInput.length} chars</span>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCurrentStep(2)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REMIX_GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = remixGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setRemixGoal(goal.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
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
                  <p className="text-sm text-gray-600 mb-3">
                    Set up your Brand Voice to select your preferred platforms first.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard/brand-voice')}
                    className="flex items-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg text-sm font-semibold hover:bg-huttle-primary-dark transition-all"
                  >
                    Set Up Brand Voice <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {brandVoicePlatforms.map((platform) => {
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
            )}

            {/* Summary Card */}
            {canRemix && (
              <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Remix Summary</h4>
                <div className="space-y-1 text-xs text-gray-500">
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
            </div>

            {/* Platform Sections with Variations */}
            {remixResults.sections.map((section, sIdx) => {
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
                  {section.variations.map((variation, vIdx) => {
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
                            {typeof variation === 'string' ? variation : ensureString(variation)}
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
                            onClick={() => {
                              const varText = typeof variation === 'string' ? variation : ensureString(variation);
                              sessionStorage.setItem('createPostContent', varText.substring(0, 500));
                              showToast('Opening post creator...', 'success');
                              navigate('/dashboard/smart-calendar');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-huttle-50 text-huttle-primary border border-huttle-200 rounded-lg hover:bg-huttle-100 transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Use in Post
                          </button>
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

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
