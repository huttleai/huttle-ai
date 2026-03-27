import { Plus, PenSquare, MessageSquare, RefreshCw, Wand2, LayoutTemplate } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { POSTKIT_PENDING_STORAGE_KEY } from '../services/postKitService';

const POST_KIT_PLATFORM_CHIPS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter', label: 'X' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
];

/**
 * Quick action items for the FAB menu
 * @type {Array<{id: string, label: string, icon: JSX.Element, color: string, hoverColor: string, action?: string, isPostKit?: boolean}>}
 */
const QUICK_ACTIONS = [
  {
    id: 'create-content',
    label: 'Create Content',
    icon: PenSquare,
    color: 'bg-huttle-primary',
    hoverColor: 'hover:bg-huttle-primary-dark',
    action: '/dashboard/ai-tools',
  },
  {
    id: 'quick-caption',
    label: 'Quick Caption',
    icon: MessageSquare,
    color: 'bg-violet-500',
    hoverColor: 'hover:bg-violet-600',
    action: '/dashboard/ai-tools',
  },
  {
    id: 'remix-content',
    label: 'Remix Content',
    icon: RefreshCw,
    color: 'bg-amber-500',
    hoverColor: 'hover:bg-amber-600',
    action: '/dashboard/content-remix',
  },
  {
    id: 'generate-plan',
    label: 'Generate Plan',
    icon: Wand2,
    color: 'bg-emerald-500',
    hoverColor: 'hover:bg-emerald-600',
    action: '/dashboard/plan-builder',
  },
  {
    id: 'post-kit',
    label: 'New Post Kit',
    icon: LayoutTemplate,
    color: 'bg-sky-500',
    hoverColor: 'hover:bg-sky-600',
    isPostKit: true,
  },
];

export default function FloatingActionButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [postKitOpen, setPostKitOpen] = useState(false);
  const [pkPlatform, setPkPlatform] = useState('instagram');
  const [pkTopic, setPkTopic] = useState('');
  const popoverRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!postKitOpen) return;
    const onDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPostKitOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [postKitOpen]);

  const handleAction = useCallback((action) => {
    setIsExpanded(false);
    navigate(action);
  }, [navigate]);

  const close = () => {
    setIsExpanded(false);
    setPostKitOpen(false);
  };

  const confirmPostKit = () => {
    const platform = String(pkPlatform || '').trim().toLowerCase();
    const topic = String(pkTopic || '').trim();
    if (!platform) return;
    try {
      localStorage.setItem(POSTKIT_PENDING_STORAGE_KEY, JSON.stringify({ platform, topic }));
    } catch {
      /* ignore */
    }
    setPostKitOpen(false);
    setIsExpanded(false);
    navigate('/dashboard/post-kit/new');
  };

  return (
    <>
      {isExpanded && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
          data-testid="fab-backdrop"
        />
      )}

      <div
        className="fixed z-50 flex flex-col-reverse items-end gap-3"
        style={{
          bottom: 'max(6rem, calc(env(safe-area-inset-bottom, 0px) + 4.5rem))',
          right: 'max(1.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {postKitOpen && (
          <div
            ref={popoverRef}
            className="mb-2 w-[min(100vw-2rem,320px)] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl"
          >
            <p className="text-sm font-semibold text-gray-900">New Post Kit</p>
            <p className="mt-1 text-xs text-gray-500">Choose platform and topic, then continue.</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-gray-500">Platform</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POST_KIT_PLATFORM_CHIPS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPkPlatform(p.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                    pkPlatform === p.id
                      ? 'border-huttle-primary bg-huttle-primary text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-huttle-primary/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Topic
            </label>
            <input
              value={pkTopic}
              onChange={(e) => setPkTopic(e.target.value)}
              placeholder="What is this post about?"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPostKitOpen(false)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPostKit}
                className="rounded-xl bg-huttle-primary px-4 py-2 text-xs font-semibold text-white hover:bg-huttle-primary-dark"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {QUICK_ACTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 transition-all duration-200 ${
                isExpanded
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
              style={{
                transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
              }}
            >
              <span className="text-sm font-medium text-gray-800 bg-white px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap">
                {item.label}
              </span>
              <button
                onClick={() => {
                  if (item.isPostKit) {
                    setIsExpanded(false);
                    setPostKitOpen(true);
                    return;
                  }
                  if (item.action) handleAction(item.action);
                }}
                className={`w-11 h-11 rounded-full ${item.color} ${item.hoverColor} text-white shadow-lg flex items-center justify-center transition-all duration-150 active:scale-95`}
                aria-label={item.label}
                data-testid={`fab-action-${item.id}`}
              >
                <Icon className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          setPostKitOpen(false);
          setIsExpanded(!isExpanded);
        }}
        className={`fixed z-50 flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full shadow-xl shadow-black/15 transition-all duration-200 active:scale-95 ${
          isExpanded
            ? 'bg-gray-900 hover:bg-gray-800 rotate-45'
            : 'bg-huttle-cyan hover:bg-huttle-cyan-dark rotate-0'
        }`}
        style={{
          bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
          right: 'max(1.5rem, env(safe-area-inset-right, 0px))',
        }}
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
        data-testid="floating-action-button"
      >
        <Plus className="w-6 h-6 text-white transition-transform duration-200" />
      </button>
    </>
  );
}
