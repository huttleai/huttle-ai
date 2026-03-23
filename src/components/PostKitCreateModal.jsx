import { useContext, useEffect, useMemo, useState } from 'react';
import {
  Instagram,
  Music,
  Youtube,
  Twitter,
  Linkedin,
  Facebook,
  X,
  Loader2,
  Check,
  PenLine,
  Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PLATFORM_CONTENT_TYPES } from '../data/postKitSlots';
import { createKit } from '../services/postKitService';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, ring: 'ring-pink-500/30' },
  { id: 'tiktok', name: 'TikTok', icon: Music, ring: 'ring-gray-900/20' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, ring: 'ring-red-500/30' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, ring: 'ring-sky-500/30' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, ring: 'ring-blue-700/30' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, ring: 'ring-blue-600/30' },
];

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function(): void} props.onClose
 * @param {function(Object): void} props.onCreated — receives new kit row
 */
export function PostKitCreateModal({ isOpen, onClose, onCreated }) {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const userId = user?.id;

  const [platform, setPlatform] = useState('');
  const [contentType, setContentType] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const contentOptions = useMemo(
    () => (platform ? PLATFORM_CONTENT_TYPES[platform] || [] : []),
    [platform]
  );

  useEffect(() => {
    if (!isOpen) return;
    setPlatform('');
    setContentType('');
    setTitle('');
    setSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    if (!platform) {
      setContentType('');
      return;
    }
    const opts = PLATFORM_CONTENT_TYPES[platform];
    setContentType(Array.isArray(opts) && opts.length ? opts[0] : '');
  }, [platform]);

  if (!isOpen) return null;

  const canSubmit =
    Boolean(userId) &&
    Boolean(platform) &&
    title.trim() !== '' &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await createKit({
      userId,
      title: title.trim(),
      platform,
      contentType: contentType || null,
    });
    setSubmitting(false);
    if (!res.success || !res.data) {
      addToast(res.error || 'Could not create kit.', 'error');
      return;
    }
    addToast('Post kit created', 'success');
    onCreated?.(res.data);
    onClose?.();
  };

  const handleBackdrop = () => {
    if (!submitting) onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4 animate-fadeIn">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdrop}
      />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-100 bg-white shadow-2xl sm:rounded-2xl">
        <div className="relative flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="font-display text-lg font-bold text-gray-900">New post kit</h2>
          <button
            type="button"
            onClick={handleBackdrop}
            disabled={submitting}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-5">
          <div className="rounded-xl border border-huttle-primary/15 bg-gradient-to-br from-huttle-primary/5 to-white p-4">
            <p className="text-sm font-semibold text-gray-900">How do you want to build this kit?</p>
            <p className="mt-1 text-xs text-gray-600">
              Start empty and fill slots yourself, or generate captions, hooks, and more in AI Tools and save them here.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3">
                <PenLine className="h-5 w-5 shrink-0 text-huttle-primary" aria-hidden />
                <div>
                  <p className="text-xs font-bold text-gray-900">Manual</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">Create the shell now, add assets from the vault as you go.</p>
                </div>
              </div>
              <Link
                to="/dashboard/ai-tools"
                onClick={() => onClose?.()}
                className="flex items-start gap-2 rounded-lg border border-huttle-primary/30 bg-white p-3 transition hover:border-huttle-primary/50 hover:bg-huttle-primary/5"
              >
                <Wand2 className="h-5 w-5 shrink-0 text-huttle-primary" aria-hidden />
                <div>
                  <p className="text-xs font-bold text-gray-900">Generate in AI tools</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">Open AI Tools, then use &quot;Add to post kit&quot; on anything you create.</p>
                </div>
              </Link>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Platform
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const selected = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                      selected
                        ? `border-huttle-primary bg-huttle-primary-light/60 text-gray-900 ring-2 ring-huttle-primary/40 ${p.ring}`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-huttle-primary/30'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        selected ? 'bg-white text-huttle-primary' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate">{p.name}</span>
                    {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-huttle-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {platform && contentOptions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Content type
              </p>
              <div className="flex flex-wrap gap-2">
                {contentOptions.map((opt) => {
                  const active = contentType === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setContentType(opt)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? 'border-huttle-primary bg-huttle-primary-light/80 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-huttle-primary/40'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="post-kit-title" className="mb-1.5 block text-xs font-semibold text-gray-700">
              Title
            </label>
            <input
              id="post-kit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's this post about?"
              disabled={submitting}
              className="min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm focus:border-huttle-primary focus:outline-none focus:ring-2 focus:ring-huttle-primary/20"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleBackdrop}
              disabled={submitting}
              className="min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-huttle-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create kit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PostKitCreateModal;
