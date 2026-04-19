import { Zap } from 'lucide-react';
import {
  FEATURE_RUN_CAPS,
  FEATURE_CREDIT_COSTS,
  getResetDateLabel,
} from '../config/creditConfig';
import useAIUsage from '../hooks/useAIUsage';

/**
 * RunCapMeter — shared run-cap meter shown above the input area of every
 * capped AI feature.
 *
 * Matches the Full Post Builder meter style exactly:
 *   ⚡  X/Y <featureLabel> this month   ●━━━━━━━━━━
 *   Each run uses N credits
 *
 * Progress bar states:
 *   - <75% used   → teal/blue  (default)
 *   - 75-99% used → amber      (warning)
 *   - ≥100% used  → red        (maxed) — label switches to
 *                                "You've used all Y runs this month · Resets <date>"
 *
 * Renders nothing when the feature has no run cap for the given tier
 * (`null`) or when the cap is 0 / missing (e.g. Essentials 14-day, which
 * is gated by the upgrade CTA, not this meter).
 *
 * All cap / credit numbers and the reset date come from creditConfig.js —
 * no values are hardcoded here.
 *
 * @param {Object} props
 * @param {string} props.featureKey   Key matching FEATURE_RUN_CAPS & FEATURE_CREDIT_COSTS.
 * @param {'essentials'|'pro'|'founder'|'builder'|string} props.tier
 *                                     User's current subscription tier.
 * @param {string} props.featureLabel  Short label, e.g. "Niche Intel runs".
 * @param {string} [props.className]   Optional extra classes on the wrapper.
 */
export default function RunCapMeter({
  featureKey,
  tier,
  featureLabel,
  className = '',
}) {
  const cap = FEATURE_RUN_CAPS[featureKey]?.[tier];
  const creditsPerRun = FEATURE_CREDIT_COSTS[featureKey] ?? 0;

  // No cap for this (featureKey, tier) pair, or the feature is not available
  // to this tier at all (cap = 0). Both mean: render nothing — other UI
  // (upgrade CTA, credit-pool meter) handles those cases.
  const hasCap = typeof cap === 'number' && cap > 0;

  // runsThisMonth comes from the same query Full Post Builder uses:
  // SELECT count(*) FROM user_activity WHERE feature = featureKey
  //   AND user_id = <uid> AND created_at >= start-of-month.
  // useAIUsage keeps that state fresh and updates it after trackFeatureUsage.
  const { featureUsed: runsThisMonth = 0 } = useAIUsage(hasCap ? featureKey : null);

  if (!hasCap) return null;

  const pct = Math.min(100, Math.round((runsThisMonth / cap) * 100));
  const isMaxed = runsThisMonth >= cap;
  const isWarning = !isMaxed && pct >= 75;
  const resetLabel = getResetDateLabel();

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
  const barColor = isMaxed
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-[#01BAD2]';

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
