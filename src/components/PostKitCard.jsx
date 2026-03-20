import { useMemo } from 'react';
import { getSlotsForPlatform, getKitStatus } from '../data/postKitSlots';

const PLATFORM_BADGE = {
  instagram: { abbr: 'IG', className: 'bg-gradient-to-br from-[#F77737] to-[#E1306C] text-white' },
  tiktok: { abbr: 'TT', className: 'bg-black text-white' },
  youtube: { abbr: 'YT', className: 'bg-[#FF0000] text-white' },
  twitter: { abbr: 'X', className: 'bg-[#1DA1F2] text-white' },
  linkedin: { abbr: 'LI', className: 'bg-[#0A66C2] text-white' },
  facebook: { abbr: 'FB', className: 'bg-[#1877F2] text-white' },
};

function buildSlotContentsMap(kit) {
  const rows = kit?.post_kit_slots;
  if (!Array.isArray(rows)) return null;
  const map = {};
  for (const row of rows) {
    if (row?.slot_key != null) {
      map[row.slot_key] = typeof row.content === 'string' ? row.content : '';
    }
  }
  return map;
}

function getCardStatus(kit, platformSlots, slotContentsMap) {
  if (kit?.is_used) return 'used';
  const total = platformSlots.length;
  const filled = Number(kit?.filled_slot_count) || 0;

  if (slotContentsMap && Object.keys(slotContentsMap).length > 0) {
    const s = getKitStatus(kit, slotContentsMap);
    if (s === 'used') return 'used';
    if (s === 'ready') return 'ready';
    return 'draft';
  }

  if (total > 0 && filled === total) return 'ready';
  return 'draft';
}

function formatKitDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Grid card for a post kit in the Content Vault.
 *
 * @param {Object} props
 * @param {Object} props.kit — id, title, platform, content_type, is_used, created_at, filled_slot_count; optional post_kit_slots for accurate status
 * @param {function(string): void} [props.onSelect] — called with kit id
 * @param {function(): void} [props.onClick] — legacy; invoked after onSelect when provided
 */
export function PostKitCard({ kit, onSelect, onClick }) {
  const platformSlots = useMemo(
    () => getSlotsForPlatform(kit?.platform),
    [kit?.platform]
  );
  const slotContentsMap = useMemo(() => buildSlotContentsMap(kit), [kit]);
  const status = useMemo(
    () => getCardStatus(kit, platformSlots, slotContentsMap),
    [kit, platformSlots, slotContentsMap]
  );

  const totalSlots = platformSlots.length;
  const filledCount = Number(kit?.filled_slot_count) || 0;

  const filledKeys = useMemo(() => {
    if (slotContentsMap) {
      return new Set(
        Object.entries(slotContentsMap)
          .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
          .map(([k]) => k)
      );
    }
    return null;
  }, [slotContentsMap]);

  const pipFilled = useMemo(() => {
    if (!totalSlots) return [];
    if (filledKeys) {
      return platformSlots.map((s) => filledKeys.has(s.key));
    }
    return platformSlots.map((_, i) => i < filledCount);
  }, [totalSlots, platformSlots, filledKeys, filledCount]);

  const tagFilled = useMemo(() => {
    if (filledKeys) {
      return platformSlots.map((s) => filledKeys.has(s.key));
    }
    return platformSlots.map((_, i) => i < filledCount);
  }, [platformSlots, filledKeys, filledCount]);

  const badge = PLATFORM_BADGE[kit?.platform] || {
    abbr: '?',
    className: 'bg-gray-400 text-white',
  };

  const statusBadge =
    status === 'used'
      ? { label: 'Used', className: 'bg-sky-100 text-sky-800 border border-sky-200' }
      : status === 'ready'
        ? {
            label: 'Ready to post',
            className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
          }
        : {
            label: 'In progress',
            className: 'bg-gray-100 text-gray-700 border border-gray-200',
          };

  const dateLine = [formatKitDate(kit?.created_at), kit?.content_type].filter(Boolean).join(' · ');

  const handleActivate = () => {
    if (kit?.id) onSelect?.(kit.id);
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleActivate}
      className="w-full min-w-0 text-left rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm transition-all hover:border-huttle-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-huttle-primary/30"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold tracking-tight ${badge.className}`}
          aria-hidden
        >
          {badge.abbr}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-sm font-bold text-gray-900 line-clamp-2">
                {kit?.title || 'Untitled kit'}
              </h3>
              {dateLine && <p className="mt-0.5 text-xs text-gray-500">{dateLine}</p>}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>

          {totalSlots > 0 && (
            <div className="flex gap-1" aria-label="Slot progress">
              {pipFilled.map((on, i) => (
                <span
                  key={platformSlots[i]?.key || i}
                  className={`h-1 min-w-[6px] flex-1 rounded-full ${on ? 'bg-emerald-500' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {platformSlots.map((slot, i) => (
              <span
                key={slot.key}
                className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  tagFilled[i]
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {slot.label}
              </span>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            {filledCount} / {totalSlots}
          </p>
        </div>
      </div>
    </button>
  );
}

export default PostKitCard;
