import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookmarkCheck, ExternalLink, Info, Newspaper, SlidersHorizontal, Zap } from 'lucide-react';
import { getPlatformIcon } from '../components/SocialIcons';
import { supabase } from '../config/supabase';

const PLATFORM_FILTERS = [
  'All',
  'Instagram',
  'TikTok',
  'X',
  'YouTube',
  'Facebook',
];

const IMPACT_FILTERS = ['All', 'High', 'Medium', 'Low'];
const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'impact', label: 'Highest Impact' },
];

const READ_STORAGE_KEY = 'huttleSocialUpdatesRead';

function getReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '[]'));
  } catch { return new Set(); }
}

function markRead(id) {
  const ids = getReadIds();
  ids.add(id);
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
}

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 };

function normalizePlatformName(platform) {
  const value = String(platform || '').trim();
  const lower = value.toLowerCase();

  if (lower === 'x' || lower === 'twitter' || lower.includes('twitter')) return 'X';
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('tiktok')) return 'TikTok';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('facebook')) return 'Facebook';
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('pinterest')) return 'Pinterest';
  if (lower.includes('threads')) return 'Threads';

  return value || 'Unknown';
}

function getUpdateTypeStyles(updateType) {
  const normalized = String(updateType || '').toLowerCase().trim();

  if (normalized === 'algorithm change') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (normalized === 'new feature') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized === 'policy update') return 'bg-red-100 text-red-700 border-red-200';
  if (normalized === 'ui change') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (normalized === 'monetization update') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (normalized === 'api change') return 'bg-gray-100 text-gray-700 border-gray-300';
  if (normalized === 'bug fix') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (normalized === 'beta feature') return 'bg-teal-100 text-teal-700 border-teal-200';

  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function getImpactMeta(impactLevel) {
  const normalized = String(impactLevel || '').toLowerCase().trim();

  if (normalized === 'high') {
    return {
      label: 'High Impact',
      dotClass: 'bg-red-500',
      badgeClass: 'bg-red-50 text-red-700 border-red-200'
    };
  }

  if (normalized === 'medium') {
    return {
      label: 'Medium Impact',
      dotClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }

  return {
    label: 'Low Impact',
    dotClass: 'bg-gray-400',
    badgeClass: 'bg-gray-50 text-gray-700 border-gray-200'
  };
}

function parsePublishedDate(value) {
  const dateValue = String(value || '').trim();
  if (!dateValue) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getRelativePublishedDate(value) {
  const parsedDate = parsePublishedDate(value);
  if (!parsedDate) return 'Unknown date';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const published = new Date(parsedDate);
  published.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - published.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatLastUpdated(value) {
  const timestamp = String(value || '').trim();
  if (!timestamp) return 'Not available';

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'Not available';

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function SocialUpdates() {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedImpact, setSelectedImpact] = useState('All');
  const [sortOrder, setSortOrder] = useState('recent');
  const [readIds, setReadIds] = useState(() => getReadIds());
  const [expandedId, setExpandedId] = useState(null);

  const loadSocialUpdates = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('social_updates')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('[SocialUpdates] Supabase query failed:', error);
        setUpdates([]);
        setErrorMessage('Unable to load social updates right now. Please try again later.');
        return;
      }

      setUpdates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[SocialUpdates] Unexpected load error:', error);
      setUpdates([]);
      setErrorMessage('Unable to load social updates right now. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSocialUpdates();
  }, [loadSocialUpdates]);

  const filteredUpdates = useMemo(() => {
    const now = new Date();

    let result = updates.filter((update) => {
      // Respect expiration
      if (update.expires_at && new Date(update.expires_at) < now) return false;
      // Platform filter
      if (selectedPlatform !== 'All' && normalizePlatformName(update.platform) !== selectedPlatform) return false;
      // Impact filter (support both column naming conventions)
      if (selectedImpact !== 'All') {
        const imp = String(update.impact_level || update.impact || '').toLowerCase();
        if (imp !== selectedImpact.toLowerCase()) return false;
      }
      return true;
    });

    // High Impact updates always bubble to top (pinned), then sort the rest
    result.sort((a, b) => {
      const aImp = String(a.impact_level || a.impact || '').toLowerCase();
      const bImp = String(b.impact_level || b.impact || '').toLowerCase();
      const aHigh = aImp === 'high';
      const bHigh = bImp === 'high';
      if (aHigh && !bHigh) return -1;
      if (!aHigh && bHigh) return 1;

      if (sortOrder === 'impact') {
        const aOrder = IMPACT_ORDER[aImp] ?? 2;
        const bOrder = IMPACT_ORDER[bImp] ?? 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
      }

      // Default: most recent first
      return new Date(b.fetched_at || 0) - new Date(a.fetched_at || 0);
    });

    return result;
  }, [updates, selectedPlatform, selectedImpact, sortOrder]);

  const latestFetchedAt = useMemo(() => {
    if (updates.length === 0) return '';
    return updates[0]?.fetched_at || updates[0]?.created_at || '';
  }, [updates]);

  return (
    <div className="flex-1 bg-gray-50 ml-0 lg:ml-64 pt-24 lg:pt-20 px-4 md:px-8 pb-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <Newspaper className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Social Updates</h1>
        </div>
        <p className="text-gray-600">Stay in the loop on the latest changes across social media</p>
        <p className="mt-2 text-xs text-gray-500">
          Last updated: {formatLastUpdated(latestFetchedAt)}
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-5 space-y-3">
        {/* Platform filters */}
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2 pb-1">
            {PLATFORM_FILTERS.map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedPlatform === platform
                    ? 'border-huttle-primary bg-huttle-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>

        {/* Impact + sort row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Impact:</span>
            {IMPACT_FILTERS.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedImpact(level)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  selectedImpact === level
                    ? 'border-huttle-primary bg-huttle-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-gray-500 font-medium">Sort:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortOrder(opt.value)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  sortOrder === opt.value
                    ? 'border-huttle-primary bg-huttle-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
              </div>
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
              <div className="mb-2 h-3 w-full rounded bg-gray-100" />
              <div className="h-3 w-5/6 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
          <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          <button
            onClick={loadSocialUpdates}
            className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && filteredUpdates.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-800">
            No platform updates yet. Check back soon — we scan for updates daily.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Info
              className="h-4 w-4"
              title="Updates are automatically gathered daily from official platform announcements."
            />
            <span>Updates are automatically gathered daily from official platform announcements.</span>
          </div>
        </div>
      )}

      {!isLoading && !errorMessage && filteredUpdates.length > 0 && (
        <div className="space-y-3">
          {filteredUpdates.map((update) => {
            const platformName = normalizePlatformName(update.platform);
            // Support both new enriched column names and legacy column names
            const typeLabel = String(update.update_type || 'Update').trim() || 'Update';
            const impactValue = update.impact_level || update.impact || 'low';
            const impact = getImpactMeta(impactValue);
            const summary = String(update.update_summary || update.description || '').trim();
            const sourceUrl = String(update.source_url || update.link || '').trim();
            const titleText = String(update.update_title || update.title || 'Platform update').trim();
            const publishedDate = update.published_date || update.date_month || '';
            const isUnread = !readIds.has(update.id);
            const isActionRequired = Boolean(update.action_required);
            const whatItMeans = String(update.what_it_means || '').trim();
            const isExpanded = expandedId === update.id;

            return (
              <article
                key={update.id}
                className={`rounded-xl border bg-white transition-all ${
                  isUnread ? 'border-huttle-200' : 'border-gray-200'
                }`}
              >
                <div
                  className="p-4 md:p-5 cursor-pointer"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : update.id);
                    if (isUnread) {
                      markRead(update.id);
                      setReadIds(getReadIds());
                    }
                  }}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-huttle-primary flex-shrink-0" />
                      )}
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
                        {getPlatformIcon(platformName, 'h-4 w-4 text-gray-700') || <Newspaper className="h-4 w-4 text-gray-500" />}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{platformName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isActionRequired && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                          <Zap className="h-3 w-3" />
                          Action Required
                        </span>
                      )}
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getUpdateTypeStyles(typeLabel)}`}>
                        {typeLabel}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${impact.badgeClass}`}>
                        <span className={`h-2 w-2 rounded-full ${impact.dotClass}`} />
                        {impact.label}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-base font-bold text-gray-900 md:text-lg">{titleText}</h2>
                  {summary && <p className="mt-2 text-sm leading-relaxed text-gray-700">{summary}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>{getRelativePublishedDate(publishedDate)}</span>
                    {sourceUrl ? (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-semibold text-huttle-primary hover:text-huttle-primary-dark"
                      >
                        Source
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">No source available</span>
                    )}
                  </div>
                </div>

                {isExpanded && whatItMeans && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-huttle-50/40 rounded-b-xl">
                    <div className="flex items-start gap-2">
                      <BookmarkCheck className="w-4 h-4 text-huttle-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-huttle-primary uppercase tracking-wide mb-1">What this means for you</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{whatItMeans}</p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
