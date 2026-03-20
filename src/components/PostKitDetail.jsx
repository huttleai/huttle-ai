import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Check,
  X,
  Copy,
  Loader2,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { getSlotsForPlatform } from '../data/postKitSlots';
import { formatKitForCopy } from '../utils/formatKitForCopy';
import {
  getKitWithSlots,
  toggleKitUsed,
  deleteSlot,
  upsertSlot,
  updateKitTitle,
} from '../services/postKitService';

const PLATFORM_BADGE = {
  instagram: { abbr: 'IG', className: 'bg-gradient-to-br from-[#F77737] to-[#E1306C] text-white' },
  tiktok: { abbr: 'TT', className: 'bg-black text-white' },
  youtube: { abbr: 'YT', className: 'bg-[#FF0000] text-white' },
  twitter: { abbr: 'X', className: 'bg-[#1DA1F2] text-white' },
  linkedin: { abbr: 'LI', className: 'bg-[#0A66C2] text-white' },
  facebook: { abbr: 'FB', className: 'bg-[#1877F2] text-white' },
};

const PLATFORM_LABEL = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

function formatDetailDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatSlotDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function rowsToSlotContentMap(rows) {
  const map = {};
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    if (row?.slot_key) map[row.slot_key] = typeof row.content === 'string' ? row.content : '';
  }
  return map;
}

/**
 * @param {Object} props
 * @param {string} props.kitId
 * @param {function(): void} props.onBack
 */
export function PostKitDetail({ kitId, onBack }) {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [kit, setKit] = useState(null);

  const [usedLocal, setUsedLocal] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleSaving, setTitleSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [slotSaveBusy, setSlotSaveBusy] = useState(false);

  const [copyBusy, setCopyBusy] = useState(false);

  const loadKit = useCallback(async () => {
    if (!kitId) return;
    setLoading(true);
    setLoadError(null);
    const res = await getKitWithSlots(kitId);
    if (!res.success) {
      setLoadError(res.error || 'Could not load kit.');
      setKit(null);
      setLoading(false);
      return;
    }
    setKit(res.data);
    setUsedLocal(Boolean(res.data?.is_used));
    setTitleDraft(res.data?.title || '');
    setLoading(false);
  }, [kitId]);

  useEffect(() => {
    loadKit();
  }, [loadKit]);

  const platformSlots = useMemo(
    () => getSlotsForPlatform(kit?.platform),
    [kit?.platform]
  );

  const slotsByKey = useMemo(() => {
    const rows = kit?.post_kit_slots;
    const map = {};
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
      if (row?.slot_key) map[row.slot_key] = row;
    }
    return map;
  }, [kit]);

  const platformLabel = PLATFORM_LABEL[kit?.platform] || kit?.platform || 'Post';

  const badge = PLATFORM_BADGE[kit?.platform] || {
    abbr: '?',
    className: 'bg-gray-400 text-white',
  };

  const handleToggleUsed = async (next) => {
    if (!kitId || toggleBusy) return;
    setUsedLocal(next);
    setToggleBusy(true);
    const res = await toggleKitUsed(kitId, next);
    setToggleBusy(false);
    if (!res.success) {
      setUsedLocal(!next);
      addToast(res.error || 'Could not update status.', 'error');
      return;
    }
    if (res.data) {
      setKit((k) => (k ? { ...k, ...res.data } : k));
    }
  };

  const handleSaveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed || !kitId || titleSaving) return;
    setTitleSaving(true);
    const res = await updateKitTitle(kitId, trimmed);
    setTitleSaving(false);
    if (!res.success) {
      addToast(res.error || 'Could not update title.', 'error');
      return;
    }
    setKit((k) => (k ? { ...k, ...(res.data || {}), title: trimmed } : k));
    setEditingTitle(false);
    addToast('Title updated', 'success');
  };

  const startEditSlot = (row) => {
    setEditingSlotId(row?.id || null);
    setEditDraft(row?.content ?? '');
  };

  const cancelEditSlot = () => {
    setEditingSlotId(null);
    setEditDraft('');
  };

  const saveEditSlot = async (slotKey) => {
    if (!userId || !kitId || slotSaveBusy) return;
    setSlotSaveBusy(true);
    const existing = slotsByKey[slotKey];
    const res = await upsertSlot({
      kitId,
      userId,
      slotKey,
      content: editDraft,
      sourceTool: existing?.source_tool ?? null,
      metadata:
        existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {},
    });
    setSlotSaveBusy(false);
    if (!res.success) {
      addToast(res.error || 'Could not save slot.', 'error');
      return;
    }
    await loadKit();
    setEditingSlotId(null);
    setEditDraft('');
    addToast('Slot saved', 'success');
  };

  const confirmDeleteSlot = async () => {
    if (!deleteTarget?.id || deleteBusy) return;
    setDeleteBusy(true);
    const res = await deleteSlot(deleteTarget.id);
    setDeleteBusy(false);
    if (!res.success) {
      addToast(res.error || 'Could not delete slot.', 'error');
      return;
    }
    setDeleteTarget(null);
    await loadKit();
    addToast('Slot cleared', 'success');
  };

  const copyAll = async () => {
    if (!kit?.platform || copyBusy) return;
    const slotMap = rowsToSlotContentMap(kit.post_kit_slots);
    const text = formatKitForCopy(kit.platform, slotMap);
    if (!text.trim()) {
      addToast('Nothing to copy yet.', 'info');
      return;
    }
    setCopyBusy(true);
    try {
      await navigator.clipboard.writeText(text);
      addToast('Copied!', 'success');
    } catch (e) {
      console.error(e);
      addToast('Could not copy to clipboard.', 'error');
    }
    setCopyBusy(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-8">
        <Loader2 className="h-8 w-8 animate-spin text-huttle-primary" />
        <p className="text-sm text-gray-500">Loading kit…</p>
      </div>
    );
  }

  if (loadError || !kit) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-6">
        <p className="text-sm font-medium text-red-800">{loadError || 'Kit not found.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-sm font-semibold text-huttle-primary hover:underline"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-huttle-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${badge.className}`}
            aria-hidden
          >
            {badge.abbr}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl line-clamp-2">
              {kit.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {platformLabel}
              {kit.content_type ? ` ${kit.content_type}` : ''}
              {kit.created_at ? ` · Created ${formatDetailDate(kit.created_at)}` : ''}
            </p>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm sm:shrink-0">
          <span className="relative inline-flex h-6 w-6 items-center justify-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={usedLocal}
              disabled={toggleBusy}
              onChange={(e) => handleToggleUsed(e.target.checked)}
            />
            <span className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-gray-300 bg-white transition peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-huttle-primary/30">
              {usedLocal && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
            </span>
          </span>
          <span
            className={`text-sm font-medium ${usedLocal ? 'text-emerald-800' : 'text-gray-600'}`}
          >
            I used this post kit
          </span>
        </label>
      </header>

      <section className="space-y-4">
        {platformSlots.map((slot) => {
          const row = slotsByKey[slot.key];
          const hasContent =
            row && typeof row.content === 'string' && row.content.trim() !== '';
          const isEditing = Boolean(row?.id && editingSlotId === row.id);

          return (
            <article
              key={slot.key}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <h2 className="font-display text-sm font-bold text-gray-900">{slot.label}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{slot.helper}</p>

              {hasContent && row && !isEditing && (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg bg-surface-100 px-3 py-3 text-sm leading-relaxed text-gray-900 whitespace-pre-wrap break-words">
                    {row.content}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex max-w-full items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      From {row.source_tool || 'Huttle'}
                      {row.created_at ? ` · ${formatSlotDate(row.created_at)}` : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditSlot(row)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-huttle-primary hover:bg-huttle-primary-light/50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({ id: row.id, label: slot.label })
                        }
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {hasContent && row && isEditing && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-gray-200 bg-surface-50 px-3 py-2.5 text-sm leading-relaxed text-gray-900 focus:border-huttle-primary focus:outline-none focus:ring-2 focus:ring-huttle-primary/20"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={slotSaveBusy}
                      onClick={() => saveEditSlot(slot.key)}
                      className="inline-flex items-center gap-1 rounded-lg bg-huttle-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-huttle-primary-dark disabled:opacity-50"
                    >
                      {slotSaveBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditSlot}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!hasContent && (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-surface-50 px-3 py-8 text-center">
                  <p className="text-sm italic text-gray-400">Not yet added</p>
                  <Link
                    to="/dashboard/ai-tools"
                    className="mt-2 inline-block text-xs font-semibold text-huttle-primary hover:underline"
                    data-testid="post-kit-generate-ai-tools"
                  >
                    Generate in AI Tools
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={copyAll}
          disabled={copyBusy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-huttle-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-huttle-primary-dark disabled:opacity-50 min-h-[44px]"
        >
          {copyBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy all for {platformLabel}
        </button>

        {!editingTitle ? (
          <button
            type="button"
            onClick={() => {
              setEditingTitle(true);
              setTitleDraft(kit.title || '');
            }}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-huttle-primary/40 min-h-[44px]"
          >
            Edit title
          </button>
        ) : (
          <div className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="min-h-[44px] flex-1 rounded-xl border border-gray-200 px-3 text-sm focus:border-huttle-primary focus:outline-none focus:ring-2 focus:ring-huttle-primary/20"
              placeholder="Kit title"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={titleSaving || !titleDraft.trim()}
                onClick={handleSaveTitle}
                className="min-h-[44px] rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTitle(false);
                  setTitleDraft(kit.title || '');
                }}
                className="min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        onConfirm={confirmDeleteSlot}
        title="Remove slot content?"
        message="This clears this slot from the kit. You can add new content later."
        itemName={deleteTarget?.label || ''}
        type="content"
        isDeleting={deleteBusy}
      />
    </div>
  );
}

export default PostKitDetail;
