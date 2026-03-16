import ViralScoreGauge from '../ViralScoreGauge';
import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function ViralScoreSection({ score, breakdown, weights, whatMakesThisViral, improvementTips }) {
  const breakdownEntries = breakdown && typeof breakdown === 'object' ? Object.entries(breakdown) : [];
  const weightEntries = weights && typeof weights === 'object' ? Object.entries(weights) : [];

  const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/60 to-gray-50/40 border border-white/60 shadow-lg p-6 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-transparent to-purple-50/20 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-center mb-6">
          <ViralScoreGauge score={score} />
        </div>

        {whatMakesThisViral && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60">
            <p className="text-sm font-medium text-amber-900 leading-relaxed">
              <span className="font-bold">Why this works:</span> {whatMakesThisViral}
            </p>
          </div>
        )}

        {breakdownEntries.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Score Breakdown</h4>
            <div className="space-y-2.5">
              {breakdownEntries.map(([key, value]) => {
                const maxWeight = weightEntries.find(([wk]) => wk === key)?.[1] || 100;
                const pct = Math.min(100, Math.round((Number(value) / maxWeight) * 100));
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{formatLabel(key)}</span>
                      <span className="text-xs font-bold text-gray-900">{value}/{maxWeight}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {improvementTips && improvementTips.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">How to Boost Your Score</h4>
            {improvementTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-white/80 rounded-lg border border-gray-100">
                <span className="text-sm flex-shrink-0">💡</span>
                <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
