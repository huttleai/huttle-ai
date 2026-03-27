import { useContext, useEffect, useMemo, useState } from 'react';
import {
  Instagram,
  Music,
  Youtube,
  Twitter,
  Facebook,
  X,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../config/supabase';
import { PLATFORM_SLOTS, PLATFORM_CONTENT_TYPES } from '../data/postKitSlots';
import { getUserKits, createKit, upsertSlot } from '../services/postKitService';

const PLATFORM_BADGE = {
  instagram: { abbr: 'IG', className: 'bg-gradient-to-br from-[#F77737] to-[#E1306C] text-white' },
  tiktok: { abbr: 'TT', className: 'bg-black text-white' },
  youtube: { abbr: 'YT', className: 'bg-[#FF0000] text-white' },
  twitter: { abbr: 'X', className: 'bg-[#1DA1F2] text-white' },
  facebook: { abbr: 'FB', className: 'bg-[#1877F2] text-white' },
};

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram },
  { id: 'tiktok', name: 'TikTok', icon: Music },
  { id: 'youtube', name: 'YouTube', icon: Youtube },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter },
  { id: 'facebook', name: 'Facebook', icon: Facebook },
];

function getSlotLabel(slotKey) {
  for (const slots of Object.values(PLATFORM_SLOTS)) {
    const found = slots.find((s) => s.key === slotKey);
    if (found) return found.label;
  }
  return slotKey;
}

function truncate(text, max = 180) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function(): void} props.onClose
 * @param {string} props.content
 * @param {string} props.slotKey
 * @param {string} props.sourceTool
 * @param {Object} [props.metadata]
 */
export function AddToKitModal({
  isOpen,
  onClose,
  content,
  slotKey,
  sourceTool,
  metadata,
}) {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const userId = user?.id;

  const [loading, setLoading] = useState(false);
  const [kits, setKits] = useState([]);
  const [slotFillMap, setSlotFillMap] = useState({});

  const [selectedKitId, setSelectedKitId] = useState(null);
  const [createNew, setCreateNew] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContentType, setNewContentType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const platformsWithSlot = useMemo(() => {
    return Object.entries(PLATFORM_SLOTS)
      .filter(([, slots]) => slots.some((s) => s.key === slotKey))
      .map(([platform]) => platform);
  }, [slotKey]);

  const slotLabel = useMemo(() => getSlotLabel(slotKey), [slotKey]);

  const compatiblePlatforms = useMemo(
    () => PLATFORMS.filter((p) => platformsWithSlot.includes(p.id)),
    [platformsWithSlot]
  );

  const newContentOptions = useMemo(
    () => (newPlatform ? PLATFORM_CONTENT_TYPES[newPlatform] || [] : []),
    [newPlatform]
  );

  useEffect(() => {
    if (!isOpen || !userId) return;

    const platformsForSlot = Object.entries(PLATFORM_SLOTS)
      .filter(([, slots]) => slots.some((s) => s.key === slotKey))
      .map(([platform]) => platform);

    let cancelled = false;
    (async () => {
      setLoading(true);
      setSelectedKitId(null);
      setCreateNew(false);
      setNewPlatform(platformsForSlot[0] || '');
      setNewTitle('');
      setNewContentType('');
      setSubmitting(false);

      const res = await getUserKits(userId);
      if (cancelled) return;

      if (!res.success) {
        setKits([]);
        setSlotFillMap({});
        setLoading(false);
        addToast(res.error || 'Could not load kits.', 'error');
        return;
      }

      const all = res.data || [];
      const filtered = all.filter((k) => platformsForSlot.includes(k.platform));
      setKits(filtered);

      const ids = filtered.map((k) => k.id);
      const map = {};
      if (ids.length > 0) {
        const { data: rows, error } = await supabase
          .from('post_kit_slots')
          .select('kit_id, slot_key, content')
          .eq('user_id', userId)
          .in('kit_id', ids);

        if (!error && Array.isArray(rows)) {
          for (const r of rows) {
            if (!r?.kit_id) continue;
            if (!map[r.kit_id]) map[r.kit_id] = {};
            map[r.kit_id][r.slot_key] = r.content;
          }
        }
      }
      setSlotFillMap(map);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, userId, slotKey, addToast]);

  useEffect(() => {
    if (!newPlatform) {
      setNewContentType('');
      return;
    }
    const opts = PLATFORM_CONTENT_TYPES[newPlatform];
    setNewContentType(Array.isArray(opts) && opts.length ? opts[0] : '');
  }, [newPlatform]);

  if (!isOpen) return null;

  const hasSlotContentForKit = (kitId) => {
    const raw = slotFillMap[kitId]?.[slotKey];
    return typeof raw === 'string' && raw.trim() !== '';
  };

  const handleConfirm = async () => {
    if (!userId || submitting) return;
    const text = typeof content === 'string' ? content : '';
    if (!text.trim()) {
      addToast('No content to add.', 'warning');
      return;
    }

    setSubmitting(true);

    if (createNew) {
      const title = newTitle.trim();
      if (!newPlatform || !title) {
        addToast('Choose a platform and title for the new kit.', 'warning');
        setSubmitting(false);
        return;
      }
      const created = await createKit({
        userId,
        title,
        platform: newPlatform,
        contentType: newContentType || null,
      });
      if (!created.success || !created.data) {
        addToast(created.error || 'Could not create kit.', 'error');
        setSubmitting(false);
        return;
      }
      const kit = created.data;
      const up = await upsertSlot({
        kitId: kit.id,
        userId,
        slotKey,
        content: text,
        sourceTool,
        metadata,
      });
      setSubmitting(false);
      if (!up.success) {
        addToast(up.error || 'Could not add content.', 'error');
        return;
      }
      addToast(`Added to ${kit.title}`, 'success');
      onClose?.();
      return;
    }

    if (!selectedKitId) {
      addToast('Select a kit or create a new one.', 'warning');
      setSubmitting(false);
      return;
    }

    const kit = kits.find((k) => k.id === selectedKitId);
    const res = await upsertSlot({
      kitId: selectedKitId,
      userId,
      slotKey,
      content: text,
      sourceTool,
      metadata,
    });
    setSubmitting(false);
    if (!res.success) {
      addToast(res.error || 'Could not add content.', 'error');
      return;
    }
    addToast(`Added to ${kit?.title || 'kit'}`, 'success');
    onClose?.();
  };

  const close = () => {
    if (!submitting) onClose?.();
  };

  const selectKit = (id) => {
    setCreateNew(false);
    setSelectedKitId(id);
  };

  const startCreate = () => {
    setCreateNew(true);
    setSelectedKitId(null);
    if (!newPlatform && platformsWithSlot[0]) setNewPlatform(platformsWithSlot[0]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4 animate-fadeIn">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-100 bg-white shadow-2xl sm:rounded-2xl">
        <div className="relative flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="font-display text-lg font-bold text-gray-900">Add to post kit</h2>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl border border-gray-100 bg-surface-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {slotLabel}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
              {truncate(content, 220)}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-huttle-primary" />
              <p className="text-sm text-gray-500">Loading your kits…</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {kits.length === 0 && !createNew && (
                  <p className="text-sm text-gray-500">
                    No compatible kits yet. Create one below.
                  </p>
                )}
                {kits.map((kit) => {
                  const badge = PLATFORM_BADGE[kit.platform] || {
                    abbr: '?',
                    className: 'bg-gray-400 text-white',
                  };
                  const selected = !createNew && selectedKitId === kit.id;
                  const filled = kit.filled_slot_count ?? 0;
                  const willReplace = hasSlotContentForKit(kit.id);

                  return (
                    <button
                      key={kit.id}
                      type="button"
                      onClick={() => selectKit(kit.id)}
                      className={`flex w-full min-h-[56px] items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? 'border-huttle-primary bg-huttle-primary-light/50 ring-2 ring-huttle-primary/25'
                          : 'border-gray-200 bg-white hover:border-huttle-primary/30'
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${badge.className}`}
                      >
                        {badge.abbr}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {kit.title}
                          </p>
                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-huttle-primary" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {filled} slot{filled === 1 ? '' : 's'} filled
                        </p>
                        {willReplace && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            Will replace existing {slotLabel}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={startCreate}
                  className={`flex w-full min-h-[48px] items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                    createNew
                      ? 'border-huttle-primary bg-huttle-primary-light/50 ring-2 ring-huttle-primary/25'
                      : 'border-dashed border-gray-300 bg-gray-50/80 text-gray-800 hover:border-huttle-primary/40'
                  }`}
                >
                  Create new kit
                  {createNew && <Check className="h-4 w-4 text-huttle-primary" />}
                </button>

                {createNew && (
                  <div className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-surface-50 p-3">
                    <p className="text-xs font-semibold text-gray-600">New kit details</p>
                    <div className="grid grid-cols-2 gap-2">
                      {compatiblePlatforms.map((p) => {
                        const Icon = p.icon;
                        const active = newPlatform === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewPlatform(p.id)}
                            className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                              active
                                ? 'border-huttle-primary bg-white ring-1 ring-huttle-primary/30'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="truncate">{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {newContentOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {newContentOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setNewContentType(opt)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              newContentType === opt
                                ? 'border-huttle-primary bg-huttle-primary-light/80'
                                : 'border-gray-200 bg-white text-gray-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="What's this post about?"
                      className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-huttle-primary focus:outline-none focus:ring-2 focus:ring-huttle-primary/20"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              submitting ||
              loading ||
              (!createNew && !selectedKitId) ||
              (createNew && (!newPlatform || !newTitle.trim()))
            }
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-huttle-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {createNew ? 'Add & create kit' : 'Add to kit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddToKitModal;
