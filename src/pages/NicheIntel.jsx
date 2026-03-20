import { useState, useContext, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Lightbulb, Target, Zap, ArrowRight, RefreshCw,
  Copy, Check, Sparkles, Lock, FolderPlus,
} from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import useAIUsage from '../hooks/useAIUsage';
import PlatformSelector from '../components/PlatformSelector';
import UpgradeModal from '../components/UpgradeModal';
import AIUsageMeter from '../components/AIUsageMeter';
import { AIDisclaimerFooter } from '../components/AIDisclaimer';
import { researchNicheContent } from '../services/perplexityAPI';
import { analyzeNiche } from '../services/grokAPI';
import { useNavigate } from 'react-router-dom';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized
import { saveContentLibraryItem } from '../config/supabase';
import { buildContentVaultPayload } from '../utils/contentVault';
import { AuthContext } from '../context/AuthContext';

const MOMENTUM_COLORS = {
  Rising: 'bg-emerald-100 text-emerald-700',
  Peaking: 'bg-amber-100 text-amber-700',
  Declining: 'bg-red-100 text-red-700',
};

function hasConfiguredNiche(brandData) {
  if (Array.isArray(brandData?.niche)) {
    return brandData.niche.some((value) => value?.trim());
  }

  return Boolean(brandData?.niche?.trim());
}

export default function NicheIntel() {
  const { brandData, loading: isBrandLoading } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { checkFeatureAccess } = useSubscription();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { featureUsed, featureLimit, trackFeatureUsage, canGenerate } = useAIUsage('nicheIntel');

  const [nicheQuery, setNicheQuery] = useState(() => {
    const niches = brandData?.niche;
    if (Array.isArray(niches)) return niches.join(', ');
    if (typeof niches === 'string') return niches;
    return '';
  });
  const [platform, setPlatform] = useState('instagram');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [copiedIdea, setCopiedIdea] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [savedIdeaId, setSavedIdeaId] = useState(null);
  const isBrandVoiceComplete = hasConfiguredNiche(brandData);

  const hasAccess = checkFeatureAccess('niche-intel');

  useEffect(() => {
    const niches = brandData?.niche;
    if (nicheQuery.trim()) return;
    if (Array.isArray(niches) && niches.length > 0) {
      setNicheQuery(niches.join(', '));
      return;
    }
    if (typeof niches === 'string' && niches.trim()) {
      setNicheQuery(niches);
    }
  }, [brandData?.niche, nicheQuery]);

  const handleAnalyze = async () => {
    if (!canGenerate) {
      addToast('You\'ve reached your monthly Niche Intel limit. Resets on the 1st.', 'warning');
      return;
    }

    const resolvedQuery = nicheQuery.trim() || brandData?.niche || 'small business';

    setLoading(true);
    setAnalysis(null);

    try {
      const researchRes = await researchNicheContent(resolvedQuery, platform, brandData);
      if (!researchRes.success) {
        addToast('Research failed. Try again.', 'error');
        setLoading(false);
        return;
      }

      const analysisRes = await analyzeNiche(researchRes.research, brandData, platform);
      if (analysisRes.success && analysisRes.analysis) {
        const usage = await trackFeatureUsage({
          query: resolvedQuery,
          platform,
          cachedResearch: Boolean(researchRes.cached),
        });

        if (!usage.allowed) {
          addToast('You\'ve reached your monthly Niche Intel limit. Resets on the 1st.', 'warning');
          return;
        }

        setAnalysis(analysisRes.analysis);
      } else {
        addToast('Analysis failed. Try again.', 'error');
      }
    } catch {
      addToast('Something went wrong. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildPost = (idea) => {
    const searchParams = new URLSearchParams({
      topic: idea.title || idea.hook || '',
      platform: String(idea.platformFit || platform || 'instagram').toLowerCase(),
    });

    navigate(`/dashboard/full-post-builder?${searchParams.toString()}`);
  };

  const handleSaveIdeaToVault = async (idea, ideaIndex) => {
    if (!user?.id) {
      addToast('Please log in to save', 'error');
      return;
    }
    const lines = [
      idea.title,
      idea.hook && `Hook: ${idea.hook}`,
      idea.whyThisWorks && idea.whyThisWorks,
      Array.isArray(idea.hashtags) && idea.hashtags.length > 0 ? idea.hashtags.join(' ') : '',
      idea.platformFit && `Best on: ${idea.platformFit}`,
    ].filter(Boolean);
    const contentText = lines.join('\n\n');
    if (!contentText.trim()) return;

    try {
      const result = await saveContentLibraryItem(user.id, buildContentVaultPayload({
        name: `Niche idea - ${String(idea.title || '').slice(0, 48)}`,
        contentText,
        contentType: 'caption',
        toolSource: 'niche_intel',
        toolLabel: 'Niche Intel',
        topic: String(idea.title || nicheQuery).slice(0, 120),
        platform: String(idea.platformFit || platform || 'instagram').toLowerCase(),
        description: 'Saved from Niche Intel',
        metadata: { idea_format: idea.format, idea_momentum: idea.momentum },
      }));

      if (!result.success) throw new Error(result.error || 'Save failed');
      setSavedIdeaId(ideaIndex);
      setTimeout(() => setSavedIdeaId(null), 2500);
      addToast('Saved to vault ✓', 'success');
    } catch (e) {
      console.error(e);
      addToast('Could not save idea', 'error');
    }
  };

  const handleCopyHook = async (hook, idx) => {
    try {
      await navigator.clipboard.writeText(hook);
      setCopiedIdea(idx);
      setTimeout(() => setCopiedIdea(null), 2000);
    } catch { /* silent */ }
  };

  // Upgrade prompt for non-Pro users
  if (!hasAccess) {
    return (
      <div className="flex-1 ml-0 md:ml-64 pt-16 md:pt-20 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20 border border-black" style={{ background: 'linear-gradient(135deg, rgba(1, 186, 210, 1) 0%, rgba(59, 130, 246, 1) 100%)' }}>
              <Search className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Niche Content Intelligence</h2>
            <p className="text-gray-600 mb-4 max-w-lg mx-auto">
              Discover what content formats, hooks, and topics are currently performing best in your niche — then generate 5 original content ideas inspired by what&rsquo;s working.
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left mb-6 max-w-lg mx-auto">
              <h3 className="font-semibold text-gray-900 mb-3">What you get:</h3>
              <ul className="space-y-2">
                {[
                  'Trending themes in your niche with momentum indicators',
                  'Top hook patterns working right now as fillable templates',
                  'Content gap opportunities your competitors are missing',
                  '5 original content ideas tailored to your brand voice',
                  'One-click "Build This Post" into Full Post Builder',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-huttle-primary flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#01bad2] to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2 mx-auto"
            >
              <Lock className="w-4 h-4" />
              Upgrade to Pro to Unlock
            </button>
            <p className="text-xs text-gray-400 mt-3">Pro: 5 analyses/month &bull; Founders: 10 analyses/month</p>
          </Motion.div>
          <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="nicheIntel" featureName="Niche Content Intelligence" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-14 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <Search className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Niche Intel</h1>
              <p className="text-sm md:text-base text-gray-500">Discover what&rsquo;s working in your niche</p>
            </div>
          </div>
          <div className="mt-3">
            <AIUsageMeter
              used={featureUsed}
              limit={featureLimit}
              label="Analyses this month"
              compact
            />
          </div>
        </div>

        {/* Input Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6 animate-fadeIn mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-huttle-primary/10 flex items-center justify-center text-sm font-bold text-huttle-primary">1</span>
            Enter your niche or competitor handles
          </h2>
          <p className="text-sm text-gray-500 mb-4 ml-10">
            Niches, keywords, or @handles to analyze.
          </p>
          <div className="space-y-4">
            <textarea
              value={nicheQuery}
              onChange={(e) => setNicheQuery(e.target.value)}
              placeholder="@fitcoachsarah, fitness transformation, med spa"
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary transition-all outline-none resize-none"
            />
            <PlatformSelector value={platform} onChange={setPlatform} showTips={false} />
            {!isBrandLoading && !isBrandVoiceComplete && (
              <a href="/dashboard/brand-voice" className="inline-block text-xs text-amber-600 hover:text-amber-700 font-medium">
                Add your Brand Voice for more personalized results →
              </a>
            )}
            <button
              onClick={handleAnalyze}
              disabled={loading || !canGenerate || isBrandLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-huttle-primary text-white rounded-xl font-semibold text-sm hover:bg-huttle-primary-dark hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing your niche...</>
              ) : (
                <><Search className="w-4 h-4" /> {isBrandLoading ? 'Loading Brand Voice...' : 'Analyze Now'}</>
              )}
            </button>
          </div>
        </div>

        {/* Brand Context */}
        {!analysis && !loading && brandData?.niche && (
          <div className="mb-6 bg-huttle-50 rounded-xl border border-huttle-100 p-4">
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

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {analysis && !loading && (
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Section 1: Trending Themes */}
              {analysis.trendingThemes?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <TrendingUp className="w-5 h-5 text-teal-500" /> What&rsquo;s Trending in Your Niche
                  </h3>
                  <div className="space-y-3">
                    {analysis.trendingThemes.map((theme, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 text-sm">{sanitizeAIOutput(theme.name)}</span>
                          <div className="flex items-center gap-2">
                            {theme.bestFormat && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{sanitizeAIOutput(theme.bestFormat)}</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${MOMENTUM_COLORS[theme.momentum] || 'bg-gray-100 text-gray-600'}`}>
                              {sanitizeAIOutput(theme.momentum)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{sanitizeAIOutput(theme.why)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Hook Patterns */}
              {analysis.hookPatterns?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Lightbulb className="w-5 h-5 text-amber-500" /> Top Hook Patterns
                  </h3>
                  <div className="space-y-2">
                    {analysis.hookPatterns.map((hook, i) => (
                      <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <p className="text-sm text-amber-900 font-medium flex-1">{sanitizeAIOutput(hook)}</p>
                        <button
                          onClick={() => handleCopyHook(hook, `hook-${i}`)}
                          className="ml-2 text-amber-500 hover:text-amber-600 flex-shrink-0"
                        >
                          {copiedIdea === `hook-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Content Gaps */}
              {analysis.contentGaps?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Target className="w-5 h-5 text-emerald-500" /> Content Gap Opportunities
                  </h3>
                  <div className="space-y-3">
                    {analysis.contentGaps.map((gap, i) => (
                      <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">{sanitizeAIOutput(gap.topic)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-medium">
                            {sanitizeAIOutput(gap.label) || 'Untapped Opportunity'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{sanitizeAIOutput(gap.reason)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Content Ideas */}
              {analysis.contentIdeas?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Sparkles className="w-5 h-5 text-indigo-500" /> Your 5 Content Ideas
                  </h3>
                  <div className="space-y-3">
                    {analysis.contentIdeas.map((idea, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">{sanitizeAIOutput(idea.title)}</span>
                              {idea.format && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{sanitizeAIOutput(idea.format)}</span>
                              )}
                              {idea.momentum && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${MOMENTUM_COLORS[idea.momentum] || 'bg-gray-100 text-gray-600'}`}>
                                  {sanitizeAIOutput(idea.momentum)}
                                </span>
                              )}
                            </div>
                            {idea.hook && <p className="text-xs text-gray-600 italic">&ldquo;{sanitizeAIOutput(idea.hook)}&rdquo;</p>}
                            {idea.whyThisWorks && <p className="text-xs text-gray-500 mt-2">{sanitizeAIOutput(idea.whyThisWorks)}</p>}
                            {Array.isArray(idea.hashtags) && idea.hashtags.length > 0 && (
                              <p className="text-[10px] text-indigo-500 mt-2">{sanitizeAIOutput(idea.hashtags.join(' '))}</p>
                            )}
                            {idea.platformFit && <span className="text-[10px] text-gray-400 mt-1 inline-block">Best on {sanitizeAIOutput(idea.platformFit)}</span>}
                          </div>
                          <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSaveIdeaToVault(idea, i)}
                              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                              data-testid="niche-intel-save-vault"
                            >
                              {savedIdeaId === i ? <Check className="w-3 h-3 text-green-600" /> : <FolderPlus className="w-3 h-3 text-huttle-primary" />}
                              {savedIdeaId === i ? 'Saved ✓' : 'Save to Vault'}
                            </button>
                            <button
                              onClick={() => handleBuildPost(idea)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-huttle-primary text-white rounded-lg text-xs font-medium hover:bg-huttle-primary-dark transition-colors"
                            >
                              <Zap className="w-3 h-3" /> Build Post
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AIDisclaimerFooter />
            </Motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!analysis && !loading && (
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter your niche and hit Analyze to discover content intelligence</p>
          </Motion.div>
        )}
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="nicheIntel" featureName="Niche Content Intelligence" />
    </div>
  );
}
