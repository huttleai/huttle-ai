import { Zap, Info } from 'lucide-react';
import {
  FEATURE_RUN_CAPS,
  FEATURE_CREDIT_COSTS,
  getResetDateLabel,
} from '../config/creditConfig';
import useAIUsage from '../hooks/useAIUsage';

/**
 * RunCapMeter — shared run-cap meter for capped AI features.
 *
 * Two visual variants:
 *
 *   compact={true}  (preferred for page headers)
 *     → Slim inline pill: muted gray text with a tiny progress bar and an
 *       info icon that reveals "Each run uses N credits" on hover.
 *       Example: "4/10 Niche Intel runs  ━━━━  ⓘ"
 *
 *   compact={false} or omitted (legacy / full meter)
 *     → Original block style with ⚡ icon, wider progress bar, and a
 *       second line describing credit cost.
 *
 * Progress-bar colour states are identical in both variants:
 *   <75% used   → teal (huttle primary)
 *   75-99% used → amber
 *   ≥100% used  → red (label switches to "All Y used · Resets <date>")
 *
 * Renders nothing when the feature has no run cap for the given tier
 * (cap === null) or when the cap is 0 / missing (handled by upgrade CTAs
 * elsewhere).
 *
 * @param {Object} props
 * @param {string}  props.featureKey    Key matching FEATURE_RUN_CAPS & FEATURE_CREDIT_COSTS.
 * @param {string}  props.tier          User's current subscription tier.
 * @param {string}  props.featureLabel  Short label, e.g. "Niche Intel runs".
 * @param {boolean} [props.compact]     Render the slim inline pill (default false).
 * @param {string}  [props.className]   Optional extra classes on the wrapper.
 */
export default function RunCapMeter({
  featureKey,
  tier,
  featureLabel,
  compact = false,
  className = '',
}) {
  const cap = FEATURE_RUN_CAPS[featureKey]?.[tier];
  const creditsPerRun = FEATURE_CREDIT_COSTS[featureKey] ?? 0;
  const hasCap = typeof cap === 'number' && cap > 0;

  const { featureUsed: runsThisMonth = 0 } = useAIUsage(hasCap ? featureKey : null);

  if (!hasCap) return null;

  const pct = Math.min(100, Math.round((runsThisMonth / cap) * 100));
  const isMaxed = runsThisMonth >= cap;
  const isWarning = !isMaxed && pct >= 75;
  const resetLabel = getResetDateLabel();

  const barColor = isMaxed
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-[#01BAD2]';

  const creditTooltip = `Each run uses ${creditsPerRun} credit${creditsPerRun === 1 ? '' : 's'}`;

  if (compact) {
    const textColor = isMaxed
      ? 'text-red-500'
      : isWarning
        ? 'text-amber-600'
        : 'text-gray-500';

    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs leading-none ${textColor} ${className}`}
      >
        {isMaxed ? (
          <span className="whitespace-nowrap">
            All {cap} {featureLabel} used &middot; Resets {resetLabel}
          </span>
        ) : (
          <>
            <span className="whitespace-nowrap">
              {runsThisMonth}/{cap} {featureLabel}
            </span>
            <div
              className="w-14 h-1 bg-gray-200 rounded-full overflow-hidden flex-shrink-0"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${runsThisMonth} of ${cap} ${featureLabel} used this month`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
        <span
          title={creditTooltip}
          aria-label={creditTooltip}
          className="inline-flex items-center cursor-help text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Info className="w-3 h-3" />
        </span>
      </div>
    );
  }

  const iconColor = isMaxed
    ? 'text-red-500'
    : isWarning
      ? 'text-amber-500'
      : 'text-huttle-primary';
  const textColor = isMaxed
    ? 'text-red-600'
    : isWarning
      ? 'text-amber-600'
      : 'text-gray-600';

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-xs">
        <Zap className={`w-3 h-3 flex-shrink-0 ${iconColor}`} />
        {isMaxed ? (
          <span className={`font-medium ${textColor}`}>
            You&rsquo;ve used all {cap} runs this month &middot; Resets {resetLabel}
          </span>
        ) : (
          <>
            <span className={`font-medium ${textColor}`}>
              {runsThisMonth}/{cap} {featureLabel} this month
            </span>
            <div
              className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${runsThisMonth} of ${cap} ${featureLabel} used this month`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Each run uses {creditsPerRun} credit{creditsPerRun === 1 ? '' : 's'}
      </p>
    </div>
  );
}
