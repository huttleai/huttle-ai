import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Clock, Target, BarChart3, AlertCircle, RefreshCw, Zap, Info } from 'lucide-react';
import { predictPerformance } from '../services/grokAPI';
import { getTrendContextForPrediction } from '../services/perplexityAPI';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';
import PlatformSelector from './PlatformSelector';
import { sanitizeAIOutput } from '../utils/textHelpers'; // HUTTLE: sanitized

const predictionCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function hashContent(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

const engagementColors = {
  Low: 'text-red-500 bg-red-50',
  Medium: 'text-amber-500 bg-amber-50',
  High: 'text-teal-500 bg-teal-50',
  'Viral Potential': 'text-emerald-500 bg-emerald-50',
};

const reachColors = {
  Niche: { bar: 'w-1/4', color: 'bg-gray-400' },
  Growing: { bar: 'w-2/4', color: 'bg-teal-400' },
  Breakout: { bar: 'w-3/4', color: 'bg-blue-500' },
  Trending: { bar: 'w-full', color: 'bg-emerald-500' },
};

export default function PerformancePrediction({
  content: externalContent,
  platform: externalPlatform,
  onScoreChange,
  onTrackUsage,
  compact = false,
  hideInput = false,
}) {
  const { brandData } = useContext(BrandContext);
  const { addToast } = useToast();

  const [localContent, setLocalContent] = useState('');
  const [localPlatform, setLocalPlatform] = useState('instagram');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const content = externalContent ?? localContent;
  const platform = externalPlatform ?? localPlatform;

  const runPrediction = async () => {
    if (!content?.trim()) {
      addToast('Enter content to predict', 'warning');
      return;
    }

    const cacheKey = `${platform}:${hashContent(content)}`;
    const cached = predictionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setResult(cached.prediction);
      onScoreChange?.(cached.prediction.platformFitScore);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (onTrackUsage) {
        const { allowed } = await onTrackUsage({ feature: 'performancePrediction' });
        if (!allowed) {
          addToast('AI generation limit reached', 'warning');
          setLoading(false);
          return;
        }
      }

      const trendRes = await getTrendContextForPrediction(platform, brandData);
      const trendContext = trendRes.success ? trendRes.context : '';

      const res = await predictPerformance(content, platform, trendContext, brandData);
      if (res.success && res.prediction) {
        setResult(res.prediction);
        onScoreChange?.(res.prediction.platformFitScore);
        predictionCache.set(cacheKey, { prediction: res.prediction, timestamp: Date.now() });
      } else {
        addToast('Prediction failed. Try again.', 'error');
      }
    } catch {
      addToast('Prediction failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (compact && result) {
    const fitScore = result.platformFitScore || 0;
    const color = fitScore >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
      fitScore >= 60 ? 'text-teal-600 bg-teal-50 border-teal-200' :
      fitScore >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200' :
      'text-red-600 bg-red-50 border-red-200';
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${color}`}>
        <TrendingUp className="w-4 h-4" />
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-none">Performance</span>
          <span className="text-lg font-bold leading-tight">{fitScore}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {!hideInput && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
            <PlatformSelector value={platform} onChange={setLocalPlatform} showTips={false} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Content to predict</label>
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Paste your full post content here..."
              rows={5}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>
          <button
            onClick={runPrediction}
            disabled={loading || !content?.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Predicting...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" /> Predict Performance
              </>
            )}
          </button>
        </>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {result && !loading && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-blue-700">AI Prediction — for guidance, not guarantees</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Engagement Level */}
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Engagement Level</span>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-semibold ${engagementColors[result.engagementLevel] || 'text-gray-500 bg-gray-50'}`}>
                  {sanitizeAIOutput(result.engagementLevel)}
                </span>
              </div>

              {/* Reach Potential */}
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Reach Potential</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{sanitizeAIOutput(result.reachPotential)}</span>
                <span className="text-xs text-gray-500 ml-1">({sanitizeAIOutput(result.reachRange)})</span>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className={`h-1.5 rounded-full transition-all ${reachColors[result.reachPotential]?.color || 'bg-gray-400'} ${reachColors[result.reachPotential]?.bar || 'w-1/4'}`} />
                </div>
              </div>

              {/* Platform Fit */}
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Platform Fit</span>
                </div>
                <span className={`text-xl font-bold ${(result.platformFitScore || 0) >= 60 ? 'text-teal-600' : 'text-amber-600'}`}>
                  {result.platformFitScore}%
                </span>
                <p className="text-xs text-gray-500 mt-1">{sanitizeAIOutput(result.platformFitNote)}</p>
              </div>

              {/* Trend Alignment */}
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Trend Alignment</span>
                </div>
                <span className={`text-xl font-bold ${(result.trendAlignment || 0) >= 60 ? 'text-teal-600' : 'text-amber-600'}`}>
                  {result.trendAlignment}%
                </span>
                <p className="text-xs text-gray-500 mt-1">{sanitizeAIOutput(result.trendAlignmentNote)}</p>
              </div>

              {/* Best Posting Window */}
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Best Posting Window</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{sanitizeAIOutput(result.bestPostingWindow)}</span>
              </div>

              {/* Confidence */}
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">Prediction Confidence</span>
                </div>
                <span className={`text-sm font-semibold ${result.confidence === 'Medium' ? 'text-teal-600' : 'text-amber-600'}`}>
                  {sanitizeAIOutput(result.confidence)}
                </span>
                <p className="text-xs text-gray-500 mt-1">{sanitizeAIOutput(result.confidenceNote)}</p>
              </div>
            </div>

            {result.reasoning && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-600">{sanitizeAIOutput(result.reasoning)}</p>
              </div>
            )}

            {!hideInput && (
              <button
                onClick={runPrediction}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-predict
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && !hideInput && (
        <div className="text-center py-8 text-gray-400">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Paste content above to predict performance</p>
        </div>
      )}
    </motion.div>
  );
}
