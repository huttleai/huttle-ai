import { Plus, PenSquare, MessageSquare, RefreshCw, CalendarPlus } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Quick action items for the FAB menu
 * @type {Array<{id: string, label: string, icon: JSX.Element, color: string, action: string}>}
 */
const QUICK_ACTIONS = [
  {
    id: 'create-post',
    label: 'Create Post',
    icon: PenSquare,
    color: 'bg-huttle-primary',
    hoverColor: 'hover:bg-huttle-primary-dark',
    action: 'createPost',
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
    icon: CalendarPlus,
    color: 'bg-emerald-500',
    hoverColor: 'hover:bg-emerald-600',
    action: '/dashboard/plan-builder',
  },
];

export default function FloatingActionButton({ onCreatePost }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const handleAction = useCallback((action) => {
    setIsExpanded(false);
    if (action === 'createPost') {
      onCreatePost();
    } else {
      navigate(action);
    }
  }, [onCreatePost, navigate]);

  const close = () => setIsExpanded(false);

  return (
    <>
      {/* Overlay backdrop */}
      {isExpanded && (
        <div
          onClick={close}
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
        />
      )}

      {/* Quick Actions Menu — fan out above the FAB */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-3 items-end">
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
              {/* Label */}
              <span className="text-sm font-medium text-gray-800 bg-white px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap">
                {item.label}
              </span>

              {/* Circular icon button */}
              <button
                onClick={() => handleAction(item.action)}
                className={`w-11 h-11 rounded-full ${item.color} ${item.hoverColor} text-white shadow-lg flex items-center justify-center transition-all duration-150 active:scale-95`}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center active:scale-95 ${
          isExpanded
            ? 'bg-gray-900 hover:bg-gray-800 rotate-45'
            : 'bg-huttle-cyan hover:bg-huttle-cyan-dark rotate-0'
        }`}
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
      >
        <Plus className="w-6 h-6 text-white transition-transform duration-200" />
      </button>
    </>
  );
}
