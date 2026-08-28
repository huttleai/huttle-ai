import { useContext, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { useNotifications } from '../context/NotificationContext';

const BANNER_SESSION_KEY = 'huttle_brand_voice_banner_dismissed';

function readSessionDismissed() {
  try {
    return sessionStorage.getItem(BANNER_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function BrandVoiceUpdateBanner() {
  const { user } = useContext(AuthContext);
  const { hasExplicitBrandType } = useBrand();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const [sessionDismissed, setSessionDismissed] = useState(readSessionDismissed);

  const hasUnreadBrandVoiceNotification = useMemo(
    () =>
      notifications.some(
        (n) =>
          n._source === 'supabase'
          && n.type === 'brand_voice_update'
          && !n.read,
      ),
    [notifications],
  );

  const shouldShow =
    Boolean(user)
    && !hasExplicitBrandType
    && hasUnreadBrandVoiceNotification
    && !sessionDismissed;

  const onRemindLater = useCallback(() => {
    try {
      sessionStorage.setItem(BANNER_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setSessionDismissed(true);
  }, []);

  const onUpdateClick = useCallback(() => {
    navigate('/dashboard/brand-voice');
  }, [navigate]);

  if (!shouldShow) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/80 to-amber-50 p-4 sm:p-5 shadow-sm"
      role="region"
      aria-label="Brand Voice update"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
              Huttle AI just got smarter
            </h2>
            <p className="mt-1 text-xs text-gray-600 sm:text-sm leading-relaxed">
              Update your Brand Voice to unlock better AI content across every tool. Takes 60 seconds.
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={onUpdateClick}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-huttle-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-huttle-primary-dark"
          >
            Update Brand Voice
          </button>
          <button
            type="button"
            onClick={onRemindLater}
            className="text-center text-xs font-medium text-gray-500 hover:text-gray-700 sm:text-left"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
