import { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, AlertTriangle, Sparkles, RefreshCw, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { scoreHumanness, autoImprovePhrase } from '../services/grokAPI';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';

const scoreColorMap = (score) => {
  if (score >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', bar: 'bg-emerald-500', label: 'Sounds like you' };
  if (score >= 60) return { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', bar: 'bg-teal-500', label: 'Mostly natural' };
  if (score >= 40) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', bar: 'bg-amber-500', label: 'Slightly robotic' };
  return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', bar: 'bg-red-500', label: 'AI detectable' };
};

const dimensionLabels = {
  sentenceVariety: 'Sentence Variety',
  naturalVocabulary: 'Natural Vocabulary',
  voiceConsistency: 'Voice Consistency',
  conversationalFlow: 'Conversational Flow',
};

export default function HumanizerScore({
  content: externalContent,
  onContentUpdate,
  onScoreChange,
  onTrackUsage,
  compact = false,
  hideInput = false,
}) {
  const { brandData } = useContext(BrandContext);
  const { addToast } = useToast();

  const [localContent, setLocalContent] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [improvingPhrase, setImprovingPhrase] = useState(null);
  const [expandedDim, setExpandedDim] = useState(null);

  const content = externalContent ?? localContent;

  const runAnalysis = async () => {
    if (!content?.trim()) {
      addToast('Enter content to analyze', 'warning');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (onTrackUsage) {
        const { allowed } = await onTrackUsage({ feature: 'humanizerScore' });
        if (!allowed) {
          addToast('AI generation limit reached', 'warning');
          setLoading(false);
          return;
        }
      }

      const res = await scoreHumanness(content, brandData);
      if (res.success && res.score) {
        setResult(res.score);
        onScoreChange?.(res.score.overall);
      } else {
        addToast('Could not analyze content. Try again.', 'error');
      }
    } catch {
      addToast('Analysis failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoImprove = async (flaggedPhrase) => {
    setImprovingPhrase(flaggedPhrase.original);
    try {
      const res = await autoImprovePhrase(content, flaggedPhrase.original, brandData);
      if (res.success && res.improvedContent) {
        onContentUpdate?.(res.improvedContent);
        if (!externalContent) setLocalContent(res.improvedContent);
        addToast('Phrase improved!', 'success');
        setTimeout(() => runAnalysis(), 300);
      }
    } catch {
      addToast('Could not improve phrase.', 'error');
    } finally {
      setImprovingPhrase(null);
    }
  };

  if (compact && result) {
    const color = scoreColorMap(result.overall);
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${color.bg} ${color.border}`}>
        <User className={`w-4 h-4 ${color.text}`} />
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-none">Human</span>
          <span className={`text-lg font-bold leading-tight ${color.text}`}>{result.overall}</span>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Content to analyze</label>
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            placeholder="Paste your AI-generated content here..."
            rows={5}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
        </div>
      )}

      {!hideInput && (
        <button
          onClick={runAnalysis}
          disabled={loading || !content?.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:shadow-lg disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <User className="w-4 h-4" /> Score Humanness
            </>
          )}
        </button>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
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
            className="space-y-4"
          >
            {/* Overall Score */}
            <div className={`rounded-xl border p-4 ${scoreColorMap(result.overall).bg} ${scoreColorMap(result.overall).border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className={`w-5 h-5 ${scoreColorMap(result.overall).text}`} />
                  <span className="font-semibold text-gray-900">Human Score</span>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${scoreColorMap(result.overall).text}`}>{result.overall}</span>
                  <span className={`block text-xs font-medium ${scoreColorMap(result.overall).text}`}>{result.label}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.overall}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-2.5 rounded-full ${scoreColorMap(result.overall).bar}`}
                />
              </div>
            </div>

            {/* Dimension Scores */}
            {result.dimensions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(result.dimensions).map(([key, dim]) => {
                  const color = scoreColorMap(dim.score);
                  const isExpanded = expandedDim === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setExpandedDim(isExpanded ? null : key)}
                      className={`text-left rounded-xl border p-3 transition-all hover:shadow-sm ${color.bg} ${color.border}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">{dimensionLabels[key] || key}</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-bold ${color.text}`}>{dim.score}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-xs text-gray-600 mt-2"
                          >
                            {dim.feedback}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Flagged Phrases */}
            {result.flaggedPhrases?.length > 0 && (
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Flagged Phrases
                </h4>
                {result.flaggedPhrases.map((phrase, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-red-500 line-through mb-1">&ldquo;{phrase.original}&rdquo;</p>
                        <p className="text-xs text-emerald-600 font-medium">&ldquo;{phrase.suggestion}&rdquo;</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoImprove(phrase);
                        }}
                        disabled={improvingPhrase === phrase.original}
                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-50 transition-colors"
                      >
                        {improvingPhrase === phrase.original ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Auto-improve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={runAnalysis}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && !hideInput && (
        <div className="text-center py-8 text-gray-400">
          <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Paste content and click Score to check how human it sounds</p>
        </div>
      )}
    </motion.div>
  );
}
