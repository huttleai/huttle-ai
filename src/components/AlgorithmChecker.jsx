import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Shield, ChevronDown, ChevronUp, Wrench, Sparkles } from 'lucide-react';
import { checkAlgorithmAlignment, lastUpdated } from '../data/algorithmSignals';
import PlatformSelector from './PlatformSelector';

const scoreColor = (score) => {
  if (score >= 85) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', bar: 'bg-emerald-500', label: 'Algorithm-Ready' };
  if (score >= 70) return { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', bar: 'bg-teal-500', label: 'Good' };
  if (score >= 50) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', bar: 'bg-amber-500', label: 'Needs Work' };
  return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', bar: 'bg-red-500', label: 'Low Alignment' };
};

export default function AlgorithmChecker({
  content: externalContent,
  platform: externalPlatform,
  onScoreChange,
  compact = false,
  hideInput = false,
}) {
  const [localContent, setLocalContent] = useState('');
  const [localPlatform, setLocalPlatform] = useState('instagram');
  const [showFixes, setShowFixes] = useState(false);

  const content = externalContent ?? localContent;
  const platform = externalPlatform ?? localPlatform;

  const result = useMemo(() => {
    if (!content?.trim()) return null;
    const r = checkAlgorithmAlignment(content, platform);
    onScoreChange?.(r.overallScore);
    return r;
  }, [content, platform, onScoreChange]);

  if (compact && result) {
    const color = scoreColor(result.overallScore);
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${color.bg} ${color.border}`}>
        <Shield className={`w-4 h-4 ${color.text}`} />
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-none">Algorithm</span>
          <span className={`text-lg font-bold leading-tight ${color.text}`}>{result.overallScore}</span>
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
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900">Will the algorithm show this to people?</h3>
              <span className="relative group cursor-help">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="1.5"/><path strokeLinecap="round" d="M12 16v-1m0-3a2 2 0 10-2-2" strokeWidth="1.5"/></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  Algorithm Alignment scores how well your content matches each platform's current ranking signals — format, keywords, hooks, and engagement triggers the algorithm rewards right now. For writing quality, use Content Quality Scorer in AI Tools.
                </span>
              </span>
            </div>
            <a href="/dashboard/ai-tools?tool=scorer" className="text-xs text-huttle-primary hover:underline font-medium">
              Want to check writing quality first? → Quality Scorer
            </a>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
            <PlatformSelector value={platform} onChange={setLocalPlatform} showTips={false} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Content to check</label>
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              placeholder="Paste your post content here..."
              rows={5}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Overall Score */}
            <div className={`rounded-xl border p-4 ${scoreColor(result.overallScore).bg} ${scoreColor(result.overallScore).border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${scoreColor(result.overallScore).text}`} />
                  <span className="font-semibold text-gray-900">
                    {result.platformName} Algorithm Score
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${scoreColor(result.overallScore).text}`}>
                    {result.overallScore}
                  </span>
                  {result.algorithmReady && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <Sparkles className="w-3 h-3" /> Algorithm-Ready
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.overallScore}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-2.5 rounded-full ${scoreColor(result.overallScore).bar}`}
                />
              </div>
            </div>

            {/* Signal Checklist */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {result.results.map((signal) => (
                <div key={signal.id} className="flex items-start gap-3 px-4 py-3">
                  {signal.pass ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${signal.pass ? 'text-gray-900' : 'text-gray-700'}`}>
                        {signal.label}
                      </span>
                      <span className="text-xs text-gray-400">{signal.weight}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{signal.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Fixes */}
            {result.results.some((s) => !s.pass && s.fix) && (
              <div>
                <button
                  onClick={() => setShowFixes(!showFixes)}
                  className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  <Wrench className="w-4 h-4" />
                  Quick Fixes ({result.results.filter((s) => !s.pass && s.fix).length})
                  {showFixes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <AnimatePresence>
                  {showFixes && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-2">
                        {result.results
                          .filter((s) => !s.pass && s.fix)
                          .map((signal) => (
                            <div key={signal.id} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2">
                              <Wrench className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-800">{signal.fix}</p>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <p className="text-[11px] text-gray-400">
              Signals last updated: {lastUpdated}
            </p>
          </motion.div>
        ) : (
          !hideInput && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-400"
            >
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Paste content above to check algorithm alignment</p>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}
