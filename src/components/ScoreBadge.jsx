import { motion } from 'framer-motion';

const colorRanges = {
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-500' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', ring: 'ring-teal-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'ring-amber-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', ring: 'ring-red-500' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', ring: 'ring-gray-300' },
};

function getScoreColor(score, thresholds) {
  if (score == null) return colorRanges.gray;
  const t = thresholds || { green: 85, teal: 70, amber: 50 };
  if (score >= t.green) return colorRanges.green;
  if (score >= t.teal) return colorRanges.teal;
  if (score >= t.amber) return colorRanges.amber;
  return colorRanges.red;
}

export default function ScoreBadge({ label, score, icon: Icon, thresholds, loading, onClick, className = '' }) {
  const color = getScoreColor(score, thresholds);
  const displayScore = score != null ? Math.round(score) : '—';
  const surface = loading ? 'bg-gray-50 border-gray-200' : `${color.bg} ${color.border}`;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-busy={loading || undefined}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2 shadow-sm ${surface}
        ${onClick ? 'cursor-pointer hover:shadow-md active:scale-95' : 'cursor-default'}
        transition-all duration-200 ${className}`}
    >
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${loading ? 'text-gray-400' : color.text}`} />}
      <div className="flex flex-col items-start min-w-0">
        {loading ? (
          <>
            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse mt-1" aria-hidden />
            <div className="flex flex-col items-center gap-2 mt-2">
              <div className="relative w-14 h-14">
                <div className="w-14 h-14 rounded-full border-4 border-gray-100" aria-hidden />
                <div
                  className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-teal-500 animate-spin"
                  aria-hidden
                />
              </div>
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" aria-hidden />
            </div>
          </>
        ) : (
          <>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-none">{label}</span>
            <span className={`text-lg font-bold leading-tight ${color.text}`}>{displayScore}</span>
          </>
        )}
      </div>
    </motion.button>
  );
}
