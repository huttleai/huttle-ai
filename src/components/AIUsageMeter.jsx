import { Zap, Lock } from 'lucide-react';
import { getResetDateLabel } from '../config/creditConfig';

/**
 * Feature-level AI Usage Meter.
 *
 * Primary row: run-cap progress ("X / Y runs used this month") for capped
 * features, or the generic `used / limit` otherwise.
 *
 * Optional secondary row: overall credit pool status when `poolUsed` /
 * `poolLimit` are provided. This lets a page show both its per-feature cap
 * and the shared monthly credit pool from TIER_CREDIT_POOLS (see creditConfig).
 *
 * All reset-date copy is driven by getResetDateLabel() from creditConfig —
 * no numbers or dates are hardcoded here.
 *
 * @param {Object} props
 * @param {number} props.used
 * @param {number|null} props.limit - null / Infinity = unlimited (meter hidden)
 * @param {string} [props.label='Generations']
 * @param {boolean} [props.compact]
 * @param {boolean} [props.polished] - Full-width thin bar + Plan Builder copy
 * @param {number} [props.poolUsed] - Optional: shared credit pool usage
 * @param {number} [props.poolLimit] - Optional: shared credit pool limit
 * @param {number} [props.creditsPerRun] - Optional: credits this feature costs per run
 * @param {string} [props.resetDate] - Optional override; defaults to 1st of next month
 */
export default function AIUsageMeter({
  used = 0,
  limit = null,
  label = 'Generations',
  compact = false,
  polished = false,
  poolUsed,
  poolLimit,
  creditsPerRun,
  resetDate,
}) {
  // Hide entirely when there is neither a per-feature cap nor a pool to show.
  const hasFeatureCap = limit !== null && limit !== Infinity;
  const hasPool = typeof poolLimit === 'number' && poolLimit > 0;
  if (!hasFeatureCap && !hasPool) return null;

  const percentage = hasFeatureCap && limit > 0 ? Math.round((used / limit) * 100) : 0;
  const isAmber = hasFeatureCap && percentage >= 80 && percentage < 100;
  const isRed = hasFeatureCap && percentage >= 100;
  const resetLabel = resetDate || getResetDateLabel();

  const barColor = isRed
    ? 'bg-red-500'
    : isAmber
      ? 'bg-amber-500'
      : 'bg-[#01BAD2]';

  // Pool sub-meter (only rendered when pool data is provided).
  const poolRemaining = hasPool ? Math.max(0, poolLimit - (poolUsed ?? 0)) : null;
  const poolPct = hasPool ? Math.round(((poolUsed ?? 0) / poolLimit) * 100) : 0;
  const poolAmber = hasPool && poolLimit > 0 && poolRemaining < poolLimit * 0.2 && poolRemaining > 0;
  const poolRed = hasPool && poolRemaining <= 0;

  if (compact && polished) {
    const usagePhrase = hasFeatureCap
      ? `${used} of ${limit} ${label.charAt(0).toLowerCase()}${label.slice(1)}`
      : `${poolUsed ?? 0} of ${poolLimit} credits`;
    return (
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className={`text-xs ${isRed ? 'text-red-600 font-medium' : isAmber ? 'text-amber-600' : 'text-gray-500'}`}
          >
            {usagePhrase}
          </span>
          <span className={`text-xs tabular-nums ${isRed ? 'text-red-600' : isAmber ? 'text-amber-600' : 'text-gray-400'}`}>
            {hasFeatureCap ? Math.min(percentage, 100) : Math.min(poolPct, 100)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${hasFeatureCap ? barColor : poolRed ? 'bg-red-500' : poolAmber ? 'bg-amber-500' : 'bg-[#01BAD2]'}`}
            style={{ width: `${hasFeatureCap ? Math.min(percentage, 100) : Math.min(poolPct, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Zap className={`w-3 h-3 ${isRed ? 'text-red-500' : isAmber ? 'text-amber-500' : 'text-huttle-primary'}`} />
        <span className={`font-medium ${isRed ? 'text-red-600' : isAmber ? 'text-amber-600' : 'text-gray-600'}`}>
          {hasFeatureCap ? `${used}/${limit} ${label}` : `${poolUsed ?? 0}/${poolLimit} credits`}
        </span>
        {hasFeatureCap && (
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        isRed
          ? 'bg-red-50 border-red-200'
          : isAmber
            ? 'bg-amber-50 border-amber-200'
            : 'bg-gray-50 border-gray-200'
      }`}
    >
      {hasFeatureCap && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {isRed ? (
                <Lock className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Zap className={`w-3.5 h-3.5 ${isAmber ? 'text-amber-500' : 'text-huttle-primary'}`} />
              )}
              <span className="text-xs font-semibold text-gray-700">
                {label}
                {typeof creditsPerRun === 'number' && creditsPerRun > 1 ? (
                  <span className="ml-1 text-[10px] font-normal text-gray-500">
                    ({creditsPerRun} credits / run)
                  </span>
                ) : null}
              </span>
            </div>
            <span className={`text-xs font-bold ${isRed ? 'text-red-700' : isAmber ? 'text-amber-700' : 'text-gray-700'}`}>
              {used} / {limit}
              <span className="ml-1 font-normal text-gray-500">runs used</span>
            </span>
          </div>

          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </>
      )}

      {hasPool && (
        <div className={hasFeatureCap ? 'mt-3 pt-3 border-t border-gray-200' : ''}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Monthly Credit Pool
            </span>
            <span
              className={`text-[11px] font-semibold tabular-nums ${
                poolRed ? 'text-red-600' : poolAmber ? 'text-amber-600' : 'text-gray-600'
              }`}
            >
              {poolRemaining} / {poolLimit} left
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                poolRed ? 'bg-red-500' : poolAmber ? 'bg-amber-500' : 'bg-[#01BAD2]'
              }`}
              style={{ width: `${Math.min(poolPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {isRed && (
        <p className="text-xs text-red-600 font-medium mt-2">
          Monthly limit reached. Resets on {resetLabel}.
        </p>
      )}
      {isAmber && !isRed && (
        <p className="text-xs text-amber-600 mt-1.5">
          {limit - used} runs remaining — resets {resetLabel}.
        </p>
      )}
      {poolRed && (
        <p className="text-xs text-red-600 font-medium mt-2">
          Credit pool exhausted. Resets on {resetLabel}.
        </p>
      )}
    </div>
  );
}
