import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  FolderPlus,
  Trash2,
  Loader2,
  Instagram,
  Music,
  Youtube,
  Twitter,
  Facebook,
  MessageSquare,
  Hash,
  Type,
  Target,
  Image as ImageIcon,
  Wand2,
  MessageCircle,
  DollarSign,
  Mail,
  Lightbulb,
  Bot,
  Camera,
  Clapperboard,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { BrandContext } from '../context/BrandContext';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import PlatformSelector from '../components/PlatformSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import { AIDisclaimerFooter, getToastDisclaimer } from '../components/AIDisclaimer';
import { sanitizeAIOutput } from '../utils/textHelpers';
import { getPlatform } from '../utils/platformGuidelines';
import { buildContentVaultPayload } from '../utils/contentVault';
import { saveToVault } from '../services/contentService';
import { shouldResetAIUsage } from '../utils/aiUsageHelpers';
import {
  generateCaption,
  generateHashtags,
  generateHooks,
  generateStyledCTAs,
  generateVisualBrainstorm,
} from '../services/grokAPI';
import { fetchVisualBrainstormTrendContext } from '../services/perplexityAPI';
import humanizeContent, {
  mapBrandVoiceToHumanizeType,
  normalizeHumanizePlatform,
} from '../services/humanizeContent';
import { normalizeAIPowerToolsCaptionText } from '../utils/aiPowerToolCaptionNormalize';
import {
  PLATFORM_CONTENT_RULES,
  getHashtagMaxForPlatform,
  normalizePlatformRulesKey,
} from '../data/platformContentRules';
import { POSTKIT_PAGE_SLOTS } from '../data/postKitSlots';
import {
  getKitWithSlots,
  mergeKitCanonicalSlot,
  removeKitCanonicalSlot,
  updateKitTitle,
  createKit,
  POSTKIT_PENDING_STORAGE_KEY,
  normalizeKitCanonicalSlots,
} from '../services/postKitService';
import { getFormatsForVisualPlatformId } from '../utils/postKitVisualHelpers';

const PLATFORM_ICONS = {
  instagram: Instagram,
  tiktok: Music,
  youtube: Youtube,
  twitter: Twitter,
  facebook: Facebook,
};

const TAB_IDS = /** @type {const} */ (['caption', 'hook', 'hashtags', 'cta', 'visuals']);

function uniqueNonEmpty(items) {
  return [...new Set((items || []).map((item) => item?.trim()).filter(Boolean))];
}

function parseCaptionFallbackBlocks(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const t = raw.trim();
  if (!t) return [];
  const hasNumberedVariants = /^\d+\.\s/m.test(t);
  if (!hasNumberedVariants) {
    return uniqueNonEmpty([t]);
  }
  const blocks = t
    .split(/(?=^\d+\.\s)/m)
    .map((part) =>
      part
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-*]\s*/, '')
        .replace(/^["']|["']$/g, '')
        .trim()
    )
    .filter(Boolean);
  return uniqueNonEmpty(blocks);
}

function buildCaptionFallbacks(topic, platformLabel, tone) {
  const normalizedTopic = topic?.trim() || 'this idea';
  const platform = platformLabel || 'social media';
  const toneLabel = tone || 'engaging';
  return uniqueNonEmpty([
    `${normalizedTopic}: the version most people overlook. Save this and test it on ${platform}.`,
    `Quick ${toneLabel} take on ${normalizedTopic} -> what worked, what did not, and what to do next.`,
    `If you're working on ${normalizedTopic}, start here: one action today beats ten ideas tomorrow.`,
    `${normalizedTopic} can feel overwhelming. Break it into one clear step and share your result below.`,
  ]);
}

function getVisualPlatformTrendLabel(platformId) {
  const key = normalizePlatformRulesKey(platformId);
  const row = PLATFORM_CONTENT_RULES[key];
  return row?.displayName || PLATFORM_CONTENT_RULES.instagram.displayName;
}

function getVisualBrainstormOutputTypes(platformId) {
  const p = String(platformId || '').toLowerCase();
  if (p === 'tiktok' || p === 'youtube') {
    return [
      { id: 'shot-list', title: 'Shot List', Icon: Camera },
      { id: 'video-script-brief', title: 'Video Script Brief', Icon: Clapperboard },
    ];
  }
  if (p === 'instagram' || p === 'facebook') {
    return [
      { id: 'ai-prompt', title: 'AI Image Prompt', Icon: Bot },
      { id: 'shoot-guide', title: 'Manual Shoot Guide', Icon: Camera },
      { id: 'shot-list', title: 'Shot List', Icon: Clapperboard },
    ];
  }
  if (p === 'twitter') {
    return [
      { id: 'ai-prompt', title: 'AI Image Prompt', Icon: Bot },
      { id: 'shoot-guide', title: 'Manual Shoot Guide', Icon: Camera },
    ];
  }
  return [
    { id: 'ai-prompt', title: 'AI Image Prompt', Icon: Bot },
    { id: 'shoot-guide', title: 'Manual Shoot Guide', Icon: Camera },
    { id: 'shot-list', title: 'Shot List', Icon: Clapperboard },
  ];
}

function kitPlatformToCalendarPlatforms(platform) {
  const p = String(platform || '').toLowerCase();
  if (p === 'instagram') return ['Instagram'];
  if (p === 'tiktok') return ['TikTok'];
  if (p === 'youtube') return ['YouTube'];
  if (p === 'twitter') return ['X'];
  if (p === 'facebook') return ['Facebook'];
  return ['Instagram'];
}

function renderAi(value) {
  return sanitizeAIOutput(value);
}

/**
 * Bootstrap: /dashboard/post-kit/new
 */
export function PostKitNew() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { addToast: showToast } = useToast();
  const [phase, setPhase] = useState('loading');
  const [setupPlatform, setSetupPlatform] = useState('instagram');
  const [setupTopic, setSetupTopic] = useState('');
  const [creating, setCreating] = useState(false);

  const clearPending = () => {
    try {
      localStorage.removeItem(POSTKIT_PENDING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const runCreate = useCallback(
    async (platform, topic, prefill) => {
      if (!user?.id) {
        showToast('Sign in required', 'error');
        navigate('/dashboard/library', { replace: true });
        return;
      }
      const plat = String(platform || '').trim().toLowerCase();
      if (!plat) {
        setPhase('setup');
        return;
      }
      const title = String(topic || '').trim() || 'Untitled Kit';
      setCreating(true);
      const res = await createKit({
        userId: user.id,
        title,
        platform: plat,
        contentType: null,
      });
      if (!res.success || !res.data?.id) {
        showToast(res.error || 'Could not create kit', 'error');
        setCreating(false);
        setPhase('setup');
        return;
      }
      const kitId = res.data.id;
      if (prefill && typeof prefill === 'object') {
        const cap = typeof prefill.caption === 'string' ? prefill.caption.trim() : '';
        const tags = typeof prefill.hashtags === 'string' ? prefill.hashtags.trim() : '';
        if (cap) await mergeKitCanonicalSlot({ kitId, userId: user.id, slotKey: 'caption', content: cap });
        if (tags) await mergeKitCanonicalSlot({ kitId, userId: user.id, slotKey: 'hashtags', content: tags });
      }
      clearPending();
      setCreating(false);
      navigate(`/dashboard/post-kit/${kitId}`, { replace: true });
    },
    [user?.id, navigate, showToast]
  );

  useEffect(() => {
    if (!user?.id) return;
    let parsed = null;
    try {
      const raw = localStorage.getItem(POSTKIT_PENDING_STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    if (!parsed || typeof parsed !== 'object') {
      setPhase('setup');
      return;
    }

    const platform = parsed.platform != null ? String(parsed.platform).trim().toLowerCase() : '';
    const topic = parsed.topic != null ? String(parsed.topic) : '';

    if (!platform) {
      setPhase('setup');
      return;
    }

    void runCreate(platform, topic, parsed.prefill);
  }, [user?.id, runCreate]);

  const submitSetup = async () => {
    const plat = String(setupPlatform || '').trim().toLowerCase();
    if (!plat) {
      showToast('Choose a platform', 'warning');
      return;
    }
    await runCreate(plat, setupTopic, null);
  };

  if (phase === 'loading' || creating) {
    return (
      <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center pt-14 md:ml-12 lg:ml-64">
        <Loader2 className="h-10 w-10 animate-spin text-huttle-primary" />
        <p className="mt-4 text-sm text-gray-500">{creating ? 'Creating your kit…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex-1 bg-[#f7f8fa] px-4 pb-12 pt-20 md:ml-12 lg:ml-64 lg:px-8">
      <div className="mx-auto max-w-lg rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">New Post Kit</h1>
        <p className="mt-2 text-sm text-gray-500">
          Pick a platform and topic to open the kit builder.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Platform</p>
            <PlatformSelector value={setupPlatform} onChange={setSetupPlatform} contentType="general" showTips={false} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Topic / title
            </label>
            <input
              value={setupTopic}
              onChange={(e) => setSetupTopic(e.target.value)}
              placeholder="What is this post about?"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={() => void submitSetup()}
            disabled={creating}
            className="w-full rounded-2xl bg-huttle-primary py-3 text-sm font-semibold text-white hover:bg-huttle-primary-dark disabled:opacity-50"
          >
            Create kit
          </button>
          <Link
            to="/dashboard/library"
            className="block text-center text-sm font-medium text-huttle-primary hover:underline"
          >
            Cancel — back to Content Vault
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Main editor: /dashboard/post-kit/:kitId
 */
export default function PostKitPage() {
  const { kitId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  const { brandData, loading: isBrandLoading } = useContext(BrandContext);
  const { addToast: showToast } = useToast();
  const { getFeatureLimit } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [kit, setKit] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('caption');
  const [titleDraft, setTitleDraft] = useState('');
  const [titleSaving, setTitleSaving] = useState(false);
  const [replaceConfirm, setReplaceConfirm] = useState(null);
  const [pendingMerge, setPendingMerge] = useState(null);

  const [slots, setSlots] = useState({});

  const platform = kit?.platform || 'instagram';
  const PlatformIcon = PLATFORM_ICONS[platform] || Instagram;

  const [aiGensUsed, setAiGensUsed] = useState(0);
  const [aiGensLimit, setAiGensLimit] = useState(Infinity);

  useEffect(() => {
    const aiLimit = getFeatureLimit('aiGenerations');
    setAiGensLimit(aiLimit === -1 ? Infinity : aiLimit);
    const savedUsage = localStorage.getItem('aiGensUsed');
    if (savedUsage) setAiGensUsed(parseInt(savedUsage, 10) || 0);
  }, [getFeatureLimit]);

  useEffect(() => {
    const lastResetDate = localStorage.getItem('aiUsageLastReset');
    const subscriptionStartDate = user?.subscriptionStartDate;
    if (shouldResetAIUsage(subscriptionStartDate, lastResetDate)) {
      setAiGensUsed(0);
      localStorage.setItem('aiGensUsed', '0');
      localStorage.setItem('aiUsageLastReset', new Date().toISOString());
    }
  }, [user]);

  const checkAIUsage = () => {
    if (aiGensLimit !== Infinity && aiGensUsed >= aiGensLimit) {
      showToast('AI generation limit reached. Please upgrade to continue.', 'error');
      return false;
    }
    return true;
  };

  const incrementAIUsage = () => {
    const next = aiGensUsed + 1;
    setAiGensUsed(next);
    localStorage.setItem('aiGensUsed', String(next));
  };

  const applyBrandVoice = true;

  const loadKit = useCallback(async () => {
    if (!kitId) return;
    setLoading(true);
    setLoadError(null);
    const res = await getKitWithSlots(kitId);
    if (!res.success || !res.data) {
      setLoadError(res.error || 'Kit not found');
      setKit(null);
      setLoading(false);
      return;
    }
    setKit(res.data);
    setTitleDraft(res.data.title || '');
    setSlots(normalizeKitCanonicalSlots(res.data));
    setLoading(false);
  }, [kitId]);

  useEffect(() => {
    void loadKit();
  }, [loadKit]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TAB_IDS.includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  const refreshSlotsFromKit = (row) => {
    setKit(row);
    setSlots(normalizeKitCanonicalSlots(row));
  };

  const scheduleEnabled = useMemo(() => {
    const c = slots.caption?.content?.trim();
    const h = slots.hashtags?.content?.trim();
    return Boolean(c && h);
  }, [slots]);

  const assembledForCalendar = useMemo(() => {
    const parts = [];
    if (slots.hook?.content?.trim()) parts.push(slots.hook.content.trim());
    if (slots.caption?.content?.trim()) parts.push(slots.caption.content.trim());
    if (slots.hashtags?.content?.trim()) parts.push(slots.hashtags.content.trim());
    if (slots.cta?.content?.trim()) parts.push(slots.cta.content.trim());
    if (slots.visuals?.content?.trim()) parts.push(`\n${slots.visuals.content.trim()}`);
    return parts.join('\n\n');
  }, [slots]);

  const handleSchedule = () => {
    if (!scheduleEnabled) return;
    navigate('/dashboard/calendar', {
      replace: false,
      state: {
        prefillContent: {
          title: titleDraft || kit?.title || 'Post Kit',
          caption: assembledForCalendar,
          platforms: kitPlatformToCalendarPlatforms(platform),
          media: [],
        },
      },
    });
  };

  const saveTitle = async () => {
    const t = titleDraft.trim();
    if (!t || !kitId) return;
    setTitleSaving(true);
    const res = await updateKitTitle(kitId, t);
    setTitleSaving(false);
    if (!res.success) {
      showToast(res.error || 'Could not save title', 'error');
      return;
    }
    setKit((k) => (k ? { ...k, title: t } : k));
    showToast('Title updated', 'success');
  };

  const tryMergeSlot = async (slotKey, text) => {
    if (!user?.id || !kitId) return;
    const raw = typeof text === 'string' ? text.trim() : '';
    if (!raw) {
      showToast('Nothing to add', 'warning');
      return;
    }
    const existing = slots[slotKey]?.content?.trim();
    if (existing) {
      setReplaceConfirm(slotKey);
      setPendingMerge({ slotKey, text: raw });
      return;
    }
    await doMerge(slotKey, raw);
  };

  const doMerge = async (slotKey, text) => {
    if (!user?.id) return;
    const res = await mergeKitCanonicalSlot({
      kitId,
      userId: user.id,
      slotKey,
      content: text,
    });
    if (!res.success) {
      showToast(res.error || 'Could not save to kit', 'error');
      return;
    }
    refreshSlotsFromKit(res.data);
    setReplaceConfirm(null);
    setPendingMerge(null);
    showToast('Added to kit', 'success');
  };

  const removeSlot = async (slotKey) => {
    if (!user?.id || !kitId) return;
    const res = await removeKitCanonicalSlot({ kitId, userId: user.id, slotKey });
    if (!res.success) {
      showToast(res.error || 'Could not clear slot', 'error');
      return;
    }
    refreshSlotsFromKit(res.data);
    showToast('Slot cleared', 'success');
  };

  const saveToVaultLocal = async (contentText, contentType, meta = {}) => {
    if (!user?.id) return;
    const nameBase =
      POSTKIT_PAGE_SLOTS.find((s) => s.key === contentType)?.label || 'Post Kit';
    const itemData = buildContentVaultPayload({
      name: `${nameBase} — ${(titleDraft || kit?.title || '').slice(0, 24)}`,
      contentText,
      contentType,
      toolSource: 'post_kit',
      toolLabel: 'Post Kit',
      topic: titleDraft || kit?.title || '',
      platform,
      description: 'Saved from Post Kit',
      metadata: meta,
    });
    const result = await saveToVault(user.id, itemData);
    if (result.success) showToast('Saved to vault ✓', 'success');
    else showToast(result.error || 'Save failed', 'error');
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-1 items-center justify-center pt-20 md:ml-12 lg:ml-64">
        <Loader2 className="h-10 w-10 animate-spin text-huttle-primary" />
      </div>
    );
  }

  if (loadError || !kit) {
    return (
      <div className="px-4 pt-20 md:ml-12 lg:ml-64">
        <p className="text-sm text-red-600">{loadError || 'Kit not found'}</p>
        <Link to="/dashboard/library" className="mt-4 inline-block text-huttle-primary">
          Back to Content Vault
        </Link>
      </div>
    );
  }

  const createdLabel = kit.created_at
    ? new Date(kit.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="min-h-screen flex-1 bg-[#f7f8fa] px-4 pb-24 pt-16 md:ml-12 md:px-6 lg:ml-64 lg:px-8 lg:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to="/dashboard/library"
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-huttle-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Post Kits
            </Link>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
              Post Kit —
              <PlatformIcon className="h-6 w-6 text-gray-700" aria-hidden />
              <span className="min-w-0">{titleDraft || kit.title}</span>
            </h1>
            {createdLabel && (
              <p className="mt-1 text-xs text-gray-500">Created {createdLabel}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Kit details</h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <PlatformIcon className="h-5 w-5 shrink-0 text-gray-700" />
              <span className="text-sm font-medium text-gray-800">
                {getPlatform(platform)?.name || platform}
              </span>
              <span className="text-xs text-gray-400">(locked)</span>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Topic</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => void saveTitle()}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
                />
                <button
                  type="button"
                  disabled={titleSaving}
                  onClick={() => void saveTitle()}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {titleSaving ? '…' : 'Save'}
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {POSTKIT_PAGE_SLOTS.map((def) => {
                const filled = Boolean(slots[def.key]?.content?.trim());
                const preview = (slots[def.key]?.content || '').trim().slice(0, 60);
                return (
                  <div
                    key={def.key}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${
                      filled
                        ? 'border-teal-400 bg-teal-50/40'
                        : 'border-dashed border-gray-200 bg-gray-50/50 text-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          {def.label}
                        </span>
                        <p className="mt-0.5 break-words text-gray-800">
                          {filled ? `${preview}${(slots[def.key]?.content || '').length > 60 ? '…' : ''}` : def.chipEmpty}
                        </p>
                      </div>
                      {filled && (
                        <button
                          type="button"
                          onClick={() => void removeSlot(def.key)}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-600"
                          aria-label={`Clear ${def.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!scheduleEnabled}
              onClick={handleSchedule}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-huttle-primary py-3 text-sm font-semibold text-white hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              Schedule this post
            </button>
            {!scheduleEnabled && (
              <p className="mt-2 text-center text-xs text-gray-500">
                Add caption and hashtags to enable scheduling.
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
              {POSTKIT_PAGE_SLOTS.map((def) => (
                <button
                  key={def.key}
                  type="button"
                  onClick={() => setActiveTab(def.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === def.key
                      ? 'bg-huttle-primary text-white'
                      : 'border border-gray-200 text-gray-600 hover:border-huttle-primary/40'
                  }`}
                >
                  {def.label}
                </button>
              ))}
            </div>

            <div className="pt-4">
              <PostKitBuildTab
                tab={activeTab}
                topic={titleDraft || kit.title || ''}
                platform={platform}
                brandData={brandData}
                isBrandLoading={isBrandLoading}
                checkAIUsage={checkAIUsage}
                incrementAIUsage={incrementAIUsage}
                applyBrandVoice={applyBrandVoice}
                showToast={showToast}
                onAddToKit={(text) => void tryMergeSlot(activeTab, text)}
                onSaveVault={(text, type, meta) => void saveToVaultLocal(text, type, meta)}
              />
            </div>
          </div>
        </div>
      </div>

      {replaceConfirm && pendingMerge && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-medium text-gray-900">
              Replace existing {POSTKIT_PAGE_SLOTS.find((s) => s.key === replaceConfirm)?.label.toLowerCase()}?
            </p>
            <p className="mt-2 text-xs text-gray-500">This overwrites what is saved in this kit slot.</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
                onClick={() => {
                  setReplaceConfirm(null);
                  setPendingMerge(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-huttle-primary px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void doMerge(pendingMerge.slotKey, pendingMerge.text)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostKitBuildTab({
  tab,
  topic,
  platform,
  brandData,
  isBrandLoading,
  checkAIUsage,
  incrementAIUsage,
  applyBrandVoice,
  showToast,
  onAddToKit,
  onSaveVault,
}) {
  const lockedPlatform = platform;

  if (tab === 'caption') {
    return (
      <KitCaptionPanel
        topic={topic}
        platform={lockedPlatform}
        brandData={brandData}
        checkAIUsage={checkAIUsage}
        incrementAIUsage={incrementAIUsage}
        applyBrandVoice={applyBrandVoice}
        showToast={showToast}
        onAddToKit={onAddToKit}
        onSaveVault={onSaveVault}
      />
    );
  }
  if (tab === 'hashtags') {
    return (
      <KitHashtagsPanel
        topic={topic}
        platform={lockedPlatform}
        brandData={brandData}
        checkAIUsage={checkAIUsage}
        incrementAIUsage={incrementAIUsage}
        showToast={showToast}
        onAddToKit={onAddToKit}
        onSaveVault={onSaveVault}
      />
    );
  }
  if (tab === 'hook') {
    return (
      <KitHooksPanel
        topic={topic}
        platform={lockedPlatform}
        brandData={brandData}
        checkAIUsage={checkAIUsage}
        incrementAIUsage={incrementAIUsage}
        applyBrandVoice={applyBrandVoice}
        showToast={showToast}
        onAddToKit={onAddToKit}
        onSaveVault={onSaveVault}
      />
    );
  }
  if (tab === 'cta') {
    return (
      <KitCtaPanel
        topic={topic}
        platform={lockedPlatform}
        brandData={brandData}
        isBrandLoading={isBrandLoading}
        checkAIUsage={checkAIUsage}
        incrementAIUsage={incrementAIUsage}
        applyBrandVoice={applyBrandVoice}
        showToast={showToast}
        onAddToKit={onAddToKit}
        onSaveVault={onSaveVault}
      />
    );
  }
  return (
    <KitVisualsPanel
      topic={topic}
      platform={lockedPlatform}
      brandData={brandData}
      checkAIUsage={checkAIUsage}
      incrementAIUsage={incrementAIUsage}
      showToast={showToast}
      onAddToKit={onAddToKit}
      onSaveVault={onSaveVault}
    />
  );
}

function KitCaptionPanel({
  topic,
  platform,
  brandData,
  checkAIUsage,
  incrementAIUsage,
  applyBrandVoice,
  showToast,
  onAddToKit,
  onSaveVault,
}) {
  const [input, setInput] = useState(topic);
  const [tone, setTone] = useState('engaging');
  const [length, setLength] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [variants, setVariants] = useState([]);
  const polishRef = useRef(0);

  useEffect(() => {
    setInput(topic);
  }, [topic]);

  const schedulePolish = (list) => {
    if (!Array.isArray(list) || !list.length) return;
    const g = ++polishRef.current;
    setPolishing(true);
    (async () => {
      try {
        const brandVoiceType = mapBrandVoiceToHumanizeType(
          applyBrandVoice && brandData?.brandVoice ? brandData.brandVoice : tone
        );
        const plat = normalizeHumanizePlatform(platform);
        const polished = await Promise.all(
          list.map((c) => humanizeContent({ text: c, brandVoiceType, platform: plat }))
        );
        if (g !== polishRef.current) return;
        setVariants(polished);
      } finally {
        if (g === polishRef.current) setPolishing(false);
      }
    })();
  };

  const run = async () => {
    if (!input.trim()) {
      showToast('Enter a topic or idea', 'warning');
      return;
    }
    if (!checkAIUsage()) return;
    setLoading(true);
    try {
      const contentData = {
        topic: input,
        platform,
        tone: applyBrandVoice && brandData?.brandVoice ? brandData.brandVoice : tone,
        length,
      };
      const result = await generateCaption(contentData, {
        ...(brandData || {}),
        brandVoice: applyBrandVoice && brandData?.brandVoice ? brandData.brandVoice : tone,
      });
      let parsed = [];
      if (result.success && (result.caption || result.captionVariants?.length)) {
        if (Array.isArray(result.captionVariants) && result.captionVariants.length) {
          parsed = uniqueNonEmpty(
            result.captionVariants.map((v) => (typeof v?.caption === 'string' ? v.caption : '').trim()).filter(Boolean)
          );
        }
        if (!parsed.length && result.caption) parsed = parseCaptionFallbackBlocks(result.caption);
      }
      const fallbacks = buildCaptionFallbacks(input, platform, tone);
      const finalList = uniqueNonEmpty([...parsed, ...fallbacks])
        .map((c) => normalizeAIPowerToolsCaptionText(c))
        .slice(0, 4);
      setVariants(finalList);
      incrementAIUsage();
      showToast(`Captions generated! ${getToastDisclaimer('general')}`, 'success');
      schedulePolish(finalList);
    } catch (e) {
      console.error(e);
      const fb = buildCaptionFallbacks(input, platform, tone);
      setVariants(fb);
      showToast('Using fallback captions', 'warning');
      schedulePolish(fb);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Topic is synced from the kit title. Platform is fixed for this kit.</p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
        placeholder="Describe your post…"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-gray-500">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
          >
            {['engaging', 'professional', 'playful', 'bold', 'educational'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Length</label>
          <select
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-huttle-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-huttle-primary-dark disabled:opacity-50"
      >
        {loading ? <LoadingSpinner size="sm" /> : <Wand2 className="h-4 w-4" />}
        Generate captions
      </button>
      {polishing && (
        <p className="text-xs text-gray-500">
          <Loader2 className="inline h-3 w-3 animate-spin" /> Polishing with your brand voice…
        </p>
      )}
      <AIDisclaimerFooter phraseIndex={1} className="text-xs" />
      <div className="space-y-3">
        {variants.map((cap, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="whitespace-pre-wrap text-sm text-gray-800">{renderAi(cap)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAddToKit(cap)}
                className="rounded-lg bg-huttle-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Add to Kit
              </button>
              <button
                type="button"
                onClick={() => onSaveVault(cap, 'caption', { input })}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
              >
                Save to Vault
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(cap);
                  showToast('Copied', 'success');
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
              >
                <Copy className="inline h-3 w-3" /> Copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KitHashtagsPanel({ topic, platform, brandData, checkAIUsage, incrementAIUsage, showToast, onAddToKit, onSaveVault }) {
  const [input, setInput] = useState(topic);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    setInput(topic);
  }, [topic]);

  const run = async () => {
    if (!input.trim()) {
      showToast('Enter keywords or topic', 'warning');
      return;
    }
    if (!checkAIUsage()) return;
    setLoading(true);
    try {
      const result = await generateHashtags(input, brandData, platform);
      const max = getHashtagMaxForPlatform(platform);
      if (result.success && result.hashtagData && Array.isArray(result.hashtagData)) {
        setTags(result.hashtagData.slice(0, max));
      } else if (result.success && result.hashtags) {
        const re = /#[\w]+/g;
        const m = result.hashtags.match(re) || [];
        setTags(
          [...new Set(m)].slice(0, max).map((tag, i) => ({
            tag,
            score: 80 - i,
            posts: '',
          }))
        );
      }
      incrementAIUsage();
      showToast(`Hashtags ready. ${getToastDisclaimer('general')}`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Hashtag generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const bundle = tags.map((t) => t.tag).join(' ');

  return (
    <div className="space-y-4">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-gray-200 p-3 text-sm"
      />
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-huttle-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? <LoadingSpinner size="sm" /> : <Hash className="h-4 w-4" />}
        Generate hashtags
      </button>
      <AIDisclaimerFooter phraseIndex={2} className="text-xs" />
      {tags.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm text-gray-800">{tags.map((t) => renderAi(t.tag)).join(' ')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAddToKit(bundle)}
              className="rounded-lg bg-huttle-primary px-3 py-1.5 text-xs font-semibold text-white"
            >
              Add to Kit
            </button>
            <button
              type="button"
              onClick={() => onSaveVault(bundle, 'hashtag', { input })}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
            >
              Save to Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KitHooksPanel({
  topic,
  platform,
  brandData,
  checkAIUsage,
  incrementAIUsage,
  applyBrandVoice,
  showToast,
  onAddToKit,
  onSaveVault,
}) {
  const [input, setInput] = useState(topic);
  const [theme, setTheme] = useState('question');
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState([]);
  const [polishing, setPolishing] = useState(false);
  const polishRef = useRef(0);

  useEffect(() => {
    setInput(topic);
  }, [topic]);

  const run = async () => {
    if (!input.trim()) {
      showToast('Enter an idea', 'warning');
      return;
    }
    if (!checkAIUsage()) return;
    setLoading(true);
    try {
      const result = await generateHooks(input, brandData, theme, platform);
      if (result.success && result.hooks) {
        const parts = result.hooks.split(/\d+\./).filter((h) => h.trim()) || [result.hooks];
        setHooks(parts.length ? parts : [result.hooks]);
        incrementAIUsage();
        showToast(`Hooks ready. ${getToastDisclaimer('general')}`, 'success');
        const g = ++polishRef.current;
        setPolishing(true);
        (async () => {
          try {
            const brandVoiceType = mapBrandVoiceToHumanizeType(
              applyBrandVoice && brandData?.brandVoice ? brandData.brandVoice : null
            );
            const plat = normalizeHumanizePlatform(platform);
            const polished = await Promise.all(
              (parts.length ? parts : [result.hooks]).map((h) =>
                humanizeContent({ text: h, brandVoiceType, platform: plat })
              )
            );
            if (g !== polishRef.current) return;
            setHooks(polished);
          } finally {
            if (g === polishRef.current) setPolishing(false);
          }
        })();
      } else showToast(result.error || 'Failed', 'error');
    } catch (e) {
      console.error(e);
      showToast('Hook generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-gray-200 p-3 text-sm"
      />
      <div>
        <label className="text-xs font-semibold text-gray-500">Style</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
        >
          {['question', 'teaser', 'story', 'bold', 'stat'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-huttle-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? <LoadingSpinner size="sm" /> : <Type className="h-4 w-4" />}
        Generate hooks
      </button>
      {polishing && <p className="text-xs text-gray-500">Polishing…</p>}
      <AIDisclaimerFooter phraseIndex={1} className="text-xs" />
      <div className="space-y-3">
        {hooks.map((h, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm text-gray-800">{renderAi(h)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAddToKit(h.trim())}
                className="rounded-lg bg-huttle-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Add to Kit
              </button>
              <button
                type="button"
                onClick={() => onSaveVault(h.trim(), 'hook', { input })}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
              >
                Save to Vault
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KitCtaPanel({
  topic,
  platform,
  brandData,
  isBrandLoading,
  checkAIUsage,
  incrementAIUsage,
  applyBrandVoice,
  showToast,
  onAddToKit,
  onSaveVault,
}) {
  const [promoting, setPromoting] = useState(topic);
  const [goalType, setGoalType] = useState('engagement');
  const [loading, setLoading] = useState(false);
  const [styled, setStyled] = useState(null);
  const [polishing, setPolishing] = useState(false);
  const ctaPolishRef = useRef(0);

  useEffect(() => {
    setPromoting(topic);
  }, [topic]);

  const run = async () => {
    if (!promoting.trim()) {
      showToast('Describe what you are promoting', 'warning');
      return;
    }
    if (!checkAIUsage()) return;
    setLoading(true);
    setStyled(null);
    try {
      const result = await generateStyledCTAs({ promoting, goalType }, brandData, platform);
      if (result.success) {
        setStyled(result);
        incrementAIUsage();
        showToast(`CTAs ready. ${getToastDisclaimer('general')}`, 'success');
        const g = ++ctaPolishRef.current;
        setPolishing(true);
        (async () => {
          try {
            const brandVoiceType = mapBrandVoiceToHumanizeType(
              applyBrandVoice && brandData?.brandVoice ? brandData.brandVoice : null
            );
            const plat = normalizeHumanizePlatform(platform);
            const polished = await Promise.all(
              (result.ctas || []).map(async (item) => ({
                ...item,
                cta: await humanizeContent({ text: item.cta || '', brandVoiceType, platform: plat }),
              }))
            );
            if (g !== ctaPolishRef.current) return;
            setStyled((prev) => (prev ? { ...prev, ctas: polished } : prev));
          } finally {
            if (g === ctaPolishRef.current) setPolishing(false);
          }
        })();
      } else showToast('Failed to generate CTAs', 'error');
    } catch (e) {
      console.error(e);
      showToast('CTA generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={promoting}
        onChange={(e) => setPromoting(e.target.value)}
        placeholder="What are you promoting?"
        className="w-full rounded-xl border border-gray-200 p-3 text-sm"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { id: 'engagement', icon: MessageCircle, label: 'Engagement' },
          { id: 'sales', icon: DollarSign, label: 'Sales' },
          { id: 'dms', icon: Mail, label: 'DMs / Leads' },
        ].map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGoalType(g.id)}
            className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-xs font-semibold ${
              goalType === g.id
                ? 'border-huttle-primary bg-cyan-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <g.icon className="h-4 w-4" />
            {g.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={applyBrandVoice} readOnly className="rounded" />
        Apply brand voice {isBrandLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </label>
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading || !promoting.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-huttle-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? <LoadingSpinner size="sm" /> : <Target className="h-4 w-4" />}
        Generate CTAs
      </button>
      {polishing && <p className="text-xs text-gray-500">Polishing…</p>}
      <AIDisclaimerFooter phraseIndex={3} className="text-xs" />
      {styled?.ctas && (
        <div className="space-y-3">
          {styled.ctas.map((item, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-800">{renderAi(item.cta)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAddToKit(item.cta)}
                  className="rounded-lg bg-huttle-primary px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Add to Kit
                </button>
                <button
                  type="button"
                  onClick={() => onSaveVault(item.cta, 'cta', { style: item.style })}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
                >
                  Save to Vault
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KitVisualsPanel({ topic, platform, brandData, checkAIUsage, incrementAIUsage, showToast, onAddToKit, onSaveVault }) {
  const [prompt, setPrompt] = useState(topic);
  const [format, setFormat] = useState(() => getFormatsForVisualPlatformId(platform)[0]);
  const outTypes = useMemo(() => getVisualBrainstormOutputTypes(platform), [platform]);
  const [outputType, setOutputType] = useState(() => outTypes[0]?.id || '');
  const [phase, setPhase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setPrompt(topic);
  }, [topic]);

  useEffect(() => {
    const formats = getFormatsForVisualPlatformId(platform);
    setFormat(formats[0] || 'Image');
    const ot = getVisualBrainstormOutputTypes(platform);
    setOutputType(ot[0]?.id || '');
  }, [platform]);

  const run = async () => {
    if (!prompt.trim()) {
      showToast('Describe your visual idea', 'warning');
      return;
    }
    if (!outputType) {
      showToast('Pick an output type', 'warning');
      return;
    }
    if (!checkAIUsage()) return;
    setLoading(true);
    setResult(null);
    setPhase('trends');
    let trendContext = null;
    try {
      const trendRes = await Promise.race([
        fetchVisualBrainstormTrendContext({
          topic: prompt.trim(),
          platformLabel: getVisualPlatformTrendLabel(platform),
        }),
        new Promise((resolve) => setTimeout(() => resolve({ success: false }), 8000)),
      ]);
      if (trendRes?.success && String(trendRes.text || '').trim()) {
        trendContext = String(trendRes.text).trim();
      }
    } catch {
      trendContext = null;
    }
    setPhase('grok');
    try {
      const res = await generateVisualBrainstorm(
        {
          topic: prompt,
          platform,
          contentFormat: format,
          outputType,
          trendContext,
        },
        brandData
      );
      if (res.success) {
        setResult(res);
        incrementAIUsage();
        showToast(`Visuals ready. ${getToastDisclaimer('general')}`, 'success');
      } else showToast(res.error || 'Failed', 'error');
    } catch (e) {
      console.error(e);
      showToast('Visual brainstorm failed', 'error');
    } finally {
      setPhase(null);
      setLoading(false);
    }
  };

  const textBlob = result?.formattedText || result?.text || '';
  const sections = Array.isArray(result?.sections) ? result.sections : [];

  return (
    <div className="space-y-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-gray-200 p-3 text-sm"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-gray-500">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
          >
            {getFormatsForVisualPlatformId(platform).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Output</label>
          <select
            value={outputType}
            onChange={(e) => setOutputType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
          >
            {outTypes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-huttle-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? <LoadingSpinner size="sm" /> : <ImageIcon className="h-4 w-4" />}
        {phase === 'trends' ? 'Researching trends…' : loading ? 'Generating…' : 'Generate visuals'}
      </button>
      <AIDisclaimerFooter phraseIndex={1} className="text-xs" />
      {(textBlob || sections.length > 0) && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-gray-800">{renderAi(textBlob)}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAddToKit(textBlob)}
              className="rounded-lg bg-huttle-primary px-3 py-1.5 text-xs font-semibold text-white"
            >
              Add to Kit
            </button>
            <button
              type="button"
              onClick={() => onSaveVault(textBlob, 'blueprint', { input: prompt })}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
            >
              Save to Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
