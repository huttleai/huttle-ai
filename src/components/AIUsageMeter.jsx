import { Zap } from 'lucide-react';

/**
 * Feature-level AI Usage Meter.
 * Shows "X / Y [FeatureName] used this month" with a progress bar.
 *
 * @param {Object} props
 * @param {number} props.used - Current usage count
 * @param {number|null} props.limit - Monthly limit (null = unlimited)
 * @param {string} props.label - Human-readable feature name (e.g. "Deep Dives")
 * @param {boolean} [props.compact] - Compact display for inline use
 */
export default function AIUsageMeter({ used = 0, limit = null, label = 'Generations', compact = false }) {
  if (limit === null || limit === Infinity) return null;

  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const isAmber = percentage >= 80 && percentage < 100;
  const isRed = percentage >= 100;

  const barColor = isRed
    ? 'bg-red-500'
    : isAmber
      ? 'bg-amber-500'
      : 'bg-huttle-primary';

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Zap className={`w-3 h-3 ${isRed ? 'text-red-500' : isAmber ? 'text-amber-500' : 'text-huttle-primary'}`} />
        <span className={`font-medium ${isRed ? 'text-red-600' : isAmber ? 'text-amber-600' : 'text-gray-600'}`}>
          {used}/{limit} {label}
        </span>
        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3 ${
      isRed ? 'bg-red-50 border-red-200' : isAmber ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3.5 h-3.5 ${isRed ? 'text-red-500' : isAmber ? 'text-amber-500' : 'text-huttle-primary'}`} />
          <span className="text-xs font-semibold text-gray-700">{label}</span>
        </div>
        <span className={`text-xs font-bold ${isRed ? 'text-red-700' : isAmber ? 'text-amber-700' : 'text-gray-700'}`}>
          {used} / {limit}
        </span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {isRed && (
        <p className="text-xs text-red-600 font-medium mt-2">
          Monthly limit reached. Resets on the 1st of next month.
        </p>
      )}
      {isAmber && !isRed && (
        <p className="text-xs text-amber-600 mt-1.5">
          {limit - used} remaining this month.
        </p>
      )}
    </div>
  );
}
