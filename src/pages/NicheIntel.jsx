import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Lightbulb, Target, Zap, ArrowRight, RefreshCw,
  Copy, Check, Sparkles, Lock,
} from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useToast } from '../context/ToastContext';
import useAIUsage from '../hooks/useAIUsage';
import PlatformSelector from '../components/PlatformSelector';
import UpgradeModal from '../components/UpgradeModal';
import { AIDisclaimerFooter } from '../components/AIDisclaimer';
import { researchNicheContent } from '../services/perplexityAPI';
import { analyzeNiche } from '../services/grokAPI';
import { useNavigate } from 'react-router-dom';

const MOMENTUM_COLORS = {
  Rising: 'bg-emerald-100 text-emerald-700',
  Peaking: 'bg-amber-100 text-amber-700',
  Declining: 'bg-red-100 text-red-700',
};

export default function NicheIntel() {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { checkFeatureAccess, userTier, getFeatureLimit } = useSubscription();
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

  const hasAccess = checkFeatureAccess('niche-intel');

  const handleAnalyze = async () => {
    if (!nicheQuery.trim()) {
      addToast('Enter your niche or competitor handles', 'warning');
      return;
    }

    if (!canGenerate) {
      addToast('Monthly analysis limit reached', 'warning');
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const usage = await trackFeatureUsage({ query: nicheQuery, platform });
      if (!usage.allowed) {
        addToast('Analysis limit reached for this month', 'warning');
        setLoading(false);
        return;
      }

      const researchRes = await researchNicheContent(nicheQuery, platform, brandData);
      if (!researchRes.success) {
        addToast('Research failed. Try again.', 'error');
        setLoading(false);
        return;
      }

      const analysisRes = await analyzeNiche(researchRes.research, brandData, platform);
      if (analysisRes.success && analysisRes.analysis) {
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
    const topicParam = encodeURIComponent(idea.title || idea.hook || '');
    navigate(`/dashboard/full-post-builder?topic=${topicParam}`);
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
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
                    <Check className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <Lock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Upgrade to Pro to Unlock
            </button>
            <p className="text-xs text-gray-400 mt-2">Pro: 5 analyses/month &bull; Founders: 10 analyses/month</p>
          </motion.div>
          <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="nicheIntel" featureName="Niche Content Intelligence" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-6 lg:px-8 pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                <Search className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-huttle-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl lg:text-3xl font-display font-bold text-gray-900">Niche Intel</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Discover what&rsquo;s working in your niche</p>
              </div>
            </div>
            {featureLimit != null && (
              <div className="text-right">
                <span className="text-xs text-gray-500">{featureUsed} / {featureLimit} analyses</span>
                <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full bg-huttle-primary transition-all"
                    style={{ width: `${Math.min((featureUsed / (featureLimit || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Input Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter your niche or competitor handles</label>
              <textarea
                value={nicheQuery}
                onChange={(e) => setNicheQuery(e.target.value)}
                placeholder="@fitcoachsarah, fitness transformation, med spa"
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <PlatformSelector value={platform} onChange={setPlatform} showTips={false} />
            <button
              onClick={handleAnalyze}
              disabled={loading || !nicheQuery.trim() || !canGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-huttle-primary text-white rounded-xl font-medium text-sm hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing your niche...</>
              ) : (
                <><Search className="w-4 h-4" /> Analyze Now</>
              )}
            </button>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Section 1: Trending Themes */}
              {analysis.trendingThemes?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <TrendingUp className="w-5 h-5 text-teal-500" /> What&rsquo;s Trending in Your Niche
                  </h3>
                  <div className="space-y-3">
                    {analysis.trendingThemes.map((theme, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 text-sm">{theme.name}</span>
                          <div className="flex items-center gap-2">
                            {theme.bestFormat && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{theme.bestFormat}</span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${MOMENTUM_COLORS[theme.momentum] || 'bg-gray-100 text-gray-600'}`}>
                              {theme.momentum}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{theme.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Hook Patterns */}
              {analysis.hookPatterns?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Lightbulb className="w-5 h-5 text-amber-500" /> Top Hook Patterns
                  </h3>
                  <div className="space-y-2">
                    {analysis.hookPatterns.map((hook, i) => (
                      <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                        <p className="text-sm text-amber-900 font-medium flex-1">{hook}</p>
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
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Target className="w-5 h-5 text-emerald-500" /> Content Gap Opportunities
                  </h3>
                  <div className="space-y-3">
                    {analysis.contentGaps.map((gap, i) => (
                      <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">{gap.topic}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-medium">
                            {gap.label || 'Untapped Opportunity'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{gap.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Content Ideas */}
              {analysis.contentIdeas?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Sparkles className="w-5 h-5 text-indigo-500" /> Your 5 Content Ideas
                  </h3>
                  <div className="space-y-3">
                    {analysis.contentIdeas.map((idea, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">{idea.title}</span>
                              {idea.format && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{idea.format}</span>
                              )}
                            </div>
                            {idea.hook && <p className="text-xs text-gray-600 italic">&ldquo;{idea.hook}&rdquo;</p>}
                            {idea.platformFit && <span className="text-[10px] text-gray-400 mt-1 inline-block">Best on {idea.platformFit}</span>}
                          </div>
                          <button
                            onClick={() => handleBuildPost(idea)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 transition-colors flex-shrink-0"
                          >
                            <Zap className="w-3 h-3" /> Build Post
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AIDisclaimerFooter />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!analysis && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Enter your niche and hit Analyze to discover content intelligence</p>
          </motion.div>
        )}
      </div>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature="nicheIntel" featureName="Niche Content Intelligence" />
    </div>
  );
}
