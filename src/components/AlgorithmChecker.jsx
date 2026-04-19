import {
  useState,
  useContext,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { HUMAN_WRITING_RULES } from '../utils/humanWritingRules';
import {
  Check,
  Copy,
  Facebook,
  Instagram,
  Loader2,
  Minus,
  Music,
  Shield,
  Sparkles,
  Twitter,
  Wrench,
  X,
  Youtube,
  BarChart3,
} from 'lucide-react';
import {
  checkAlgorithmAlignment,
  lastUpdated,
  DEFAULT_CONTENT_TYPE_BY_PLATFORM,
} from '../data/algorithmSignals';
import { sanitizeAIOutput } from '../utils/textHelpers';
import { BrandContext } from '../context/BrandContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { callClaudeAPI } from '../services/claudeAPI';
import { saveToVault, CONTENT_VAULT_UPDATED_EVENT } from '../services/contentService';
import { buildContentVaultPayload } from '../utils/contentVault';

const PLATFORM_ROWS = [
  { id: 'instagram', label: 'Instagram', Icon: Instagram },
  { id: 'tiktok', label: 'TikTok', Icon: Music },
  { id: 'twitter', label: 'X/Twitter', Icon: Twitter },
  { id: 'youtube', label: 'YouTube', Icon: Youtube },
  { id: 'facebook', label: 'Facebook', Icon: Facebook },
];

const CONTENT_TYPES_BY_PLATFORM = {
  instagram: [
    { id: 'static_post', label: 'Static Post' },
    { id: 'reel', label: 'Reel' },
    { id: 'carousel', label: 'Carousel' },
    { id: 'story', label: 'Story' },
  ],
  tiktok: [
    { id: 'short', label: 'Short (under 60s)' },
    { id: 'long_form', label: 'Long-form (60s+)' },
  ],
  twitter: [],
  youtube: [
    { id: 'short', label: 'Short' },
    { id: 'long_form', label: 'Long-form' },
  ],
  facebook: [
    { id: 'post', label: 'Post' },
    { id: 'reel', label: 'Reel' },
    { id: 'story', label: 'Story' },
  ],
};

const PLACEHOLDERS = {
  instagram_static_post:
    'Paste your caption here. Include hashtags if you have them.',
  instagram_reel:
    'Paste your Reel script, hook line, or caption. Include any audio notes, text overlays, or voiceover copy you have.',
  instagram_carousel:
    'Paste your carousel copy — slide by slide if possible. Example: Slide 1: [hook text] | Slide 2: [body] | Slide 3: [CTA]',
  instagram_story:
    'Paste your story text, overlay copy, or sequence notes.',
  tiktok_short:
    'Paste your script, hook, caption, or any combination. The more context you give, the sharper the analysis.',
  tiktok_long_form:
    'Paste your script, hook, caption, or any combination. The more context you give, the sharper the analysis.',
  twitter_post: 'Paste your tweet or thread opening.',
  youtube_short:
    'Paste your hook, script, or description copy.',
  youtube_long_form:
    'Paste your title, description, or video script outline.',
  facebook_post: 'Paste your post copy, script, or caption.',
  facebook_reel: 'Paste your post copy, script, or caption.',
  facebook_story: 'Paste your post copy, script, or caption.',
};

function placeholderKey(platform, contentType) {
  return `${platform}_${contentType}`;
}

function formatContentTypeTitle(platform, contentType) {
  const list = CONTENT_TYPES_BY_PLATFORM[platform] || [];
  const found = list.find((x) => x.id === contentType);
  if (found) return found.label;
  if (platform === 'twitter') return 'Post';
  return contentType?.replace(/_/g, ' ') || '';
}

function scoreTier(score) {
  if (score >= 85)
    return {
      stroke: '#22c55e',
      text: 'text-[#22c55e]',
      label: 'Elite',
      bar: 'bg-[#22c55e]',
    };
  if (score >= 75)
    return {
      stroke: '#01BAD2',
      text: 'text-[#01BAD2]',
      label: 'Strong',
      bar: 'bg-[#01BAD2]',
    };
  if (score >= 60)
    return {
      stroke: '#01BAD2',
      text: 'text-[#01BAD2]',
      label: 'Good',
      bar: 'bg-[#01BAD2]',
    };
  if (score >= 40)
    return {
      stroke: '#f59e0b',
      text: 'text-[#f59e0b]',
      label: 'Developing',
      bar: 'bg-[#f59e0b]',
    };
  return {
    stroke: '#ef4444',
    text: 'text-[#ef4444]',
    label: 'Needs Work',
    bar: 'bg-[#ef4444]',
  };
}

function parseClaudeJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeTriScore(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  if (n === 0.5 || n === 1) return n;
  if (n === 0) return 0;
  return fallback;
}

function computeMergedOverall(layer1Results, layer2) {
  if (!layer1Results?.length) return 0;
  const ovr = layer2?.semanticOverride;
  return Math.round(
    layer1Results.reduce((acc, r) => {
      const adj = ovr?.[r.id]?.adjustedScore;
      const sc = normalizeTriScore(adj, r.score);
      const safe = sc === 0.5 || sc === 1 ? sc : 0;
      return acc + r.weight * safe;
    }, 0),
  );
}

function buildOptimizedDiffSpans(original, optimized) {
  const otrim = String(original || '').trim();
  const ntrim = String(optimized || '').trim();
  if (!ntrim) return [];
  const a = otrim.split(/\s+/).filter(Boolean);
  const b = ntrim.split(/\s+/).filter(Boolean);
  let pre = 0;
  while (
    pre < a.length &&
    pre < b.length &&
    a[pre].toLowerCase() === b[pre].toLowerCase()
  ) {
    pre += 1;
  }
  let suf = 0;
  while (
    suf < a.length - pre &&
    suf < b.length - pre &&
    a[a.length - 1 - suf].toLowerCase() === b[b.length - 1 - suf].toLowerCase()
  ) {
    suf += 1;
  }
  const lo = pre;
  const hi = b.length - suf;
  const tokens = ntrim.split(/(\s+)/);
  let wi = 0;
  return tokens.map((tok, i) => {
    if (!tok) return { key: `e${i}`, type: 'raw', text: '' };
    if (/^\s[\s\u00a0]*$/.test(tok) || /^\s+$/.test(tok)) {
      return { key: `w${i}`, type: 'raw', text: tok };
    }
    const highlight = wi >= lo && wi < hi;
    wi += 1;
    return {
      key: `t${i}`,
      type: highlight ? 'hl' : 'n',
      text: tok,
    };
  });
}

function SignalStateIcon({ score }) {
  if (score >= 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-[#01BAD2] flex items-center justify-center flex-shrink-0 shadow-sm">
        <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
      </div>
    );
  }
  if (score >= 0.5) {
    return (
      <div className="relative w-8 h-8 rounded-full border-2 border-amber-400 flex items-center justify-center flex-shrink-0 overflow-hidden bg-amber-50">
        <div
          className="absolute left-0 top-0 bottom-0 w-1/2 bg-amber-200/90"
          aria-hidden
        />
        <Minus className="relative w-4 h-4 text-amber-800" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full border-2 border-red-400 bg-red-50 flex items-center justify-center flex-shrink-0">
      <X className="w-4 h-4 text-red-500" strokeWidth={2.5} />
    </div>
  );
}

function AnimatedScoreRing({ value, tierStroke, size = 96, strokeWidth = 7 }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = c - (pct / 100) * c;

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tierStroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );
}

function ScorePanelLoadingSkeleton({ icon: Icon = Shield }) {
  return (
    <div className="flex min-h-[52px] items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm min-w-[140px]">
      <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" aria-hidden />
      <div className="flex flex-col items-start min-w-0">
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
      </div>
    </div>
  );
}

export default function AlgorithmChecker({
  content: externalContent,
  platform: externalPlatform,
  onScoreChange,
  compact = false,
  hideInput = false,
  /** When true with compact + hideInput, shows the shared score loading skeleton (e.g. while parent awaits async scores). */
  loading = false,
}) {
  const { brandData } = useContext(BrandContext);
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();

  const nicheDisplay = useMemo(() => {
    const n = brandData?.niche;
    if (Array.isArray(n)) return n.filter(Boolean).join(', ').trim();
    return String(n || '').trim();
  }, [brandData?.niche]);

  const targetAudienceDisplay = useMemo(() => {
    const t = brandData?.targetAudience;
    if (Array.isArray(t)) return t.filter(Boolean).join(', ').trim();
    return String(t || '').trim();
  }, [brandData?.targetAudience]);

  const brandVoiceTone = useMemo(() => {
    const base = String(brandData?.brandVoice || '').trim();
    const chips = Array.isArray(brandData?.toneChips)
      ? brandData.toneChips.filter(Boolean).join(', ')
      : '';
    return [base, chips].filter(Boolean).join(', ') || 'authentic';
  }, [brandData?.brandVoice, brandData?.toneChips]);

  const [platform, setPlatform] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [contentTypeConfirmed, setContentTypeConfirmed] = useState(false);
  const [localContent, setLocalContent] = useState('');

  const [layer1Results, setLayer1Results] = useState(null);
  const [layer2Results, setLayer2Results] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [showAutoFix, setShowAutoFix] = useState(false);
  const [error, setError] = useState(null);
  const [claudeUnavailable, setClaudeUnavailable] = useState(false);
  const [bannerPhase, setBannerPhase] = useState('reading');
  const [copiedFixId, setCopiedFixId] = useState(null);
  const [copiedOptimized, setCopiedOptimized] = useState(false);

  const rafRef = useRef(null);
  const liveScoreRef = useRef(0);

  /** Local platform selection overrides parent when user picks a different network. */
  const effectivePlatform = platform ?? externalPlatform ?? null;
  const effectiveContent = (
    hideInput ? externalContent ?? '' : localContent
  ).trim();

  const resolvedContentType = useMemo(() => {
    if (effectivePlatform === 'twitter') return 'post';
    return contentType;
  }, [effectivePlatform, contentType]);

  const mergedOverall = useMemo(
    () => computeMergedOverall(layer1Results, layer2Results),
    [layer1Results, layer2Results],
  );

  const displayedSignals = useMemo(() => {
    if (!layer1Results?.length) return [];
    const ovr = layer2Results?.semanticOverride || {};
    return layer1Results.map((r) => {
      const o = ovr[r.id];
      const score = normalizeTriScore(o?.adjustedScore, r.score);
      const safeScore = score === 0.5 || score === 1 ? score : 0;
      const reason = (o && o.semanticReason) || r.reason || r.detail;
      const semanticFix = o?.quickFix;
      const fixChip =
        safeScore < 1 ? semanticFix || r.fixTemplate || r.fix : null;
      return {
        ...r,
        score: safeScore,
        reason,
        fixChip,
      };
    });
  }, [layer1Results, layer2Results]);

  const tier = scoreTier(mergedOverall);
  const autoFixedCaption =
    !claudeUnavailable && layer2Results?.autoFixedCaption
      ? String(layer2Results.autoFixedCaption).trim()
      : '';

  const optimizedSpans = useMemo(
    () => buildOptimizedDiffSpans(effectiveContent, autoFixedCaption),
    [effectiveContent, autoFixedCaption],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (layer1Results == null) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const duration = 1200;
    const from = liveScoreRef.current;
    const to = mergedOverall;
    let start = 0;
    const step = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 2;
      const v = Math.round(from + (to - from) * eased);
      liveScoreRef.current = v;
      setDisplayScore(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayScore(to);
        liveScoreRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [mergedOverall, layer1Results]);

  useEffect(() => {
    if (!onScoreChange) return;
    onScoreChange(layer1Results == null ? null : mergedOverall);
  }, [onScoreChange, mergedOverall, layer1Results]);

  useEffect(() => {
    if (!isEnhancing) return;
    setBannerPhase('reading');
    const t = setTimeout(() => setBannerPhase('benchmark'), 1000);
    return () => clearTimeout(t);
  }, [isEnhancing]);

  const compactResult = useMemo(() => {
    if (!effectiveContent.trim() || !effectivePlatform) return null;
    return checkAlgorithmAlignment(effectiveContent, effectivePlatform);
  }, [effectiveContent, effectivePlatform]);

  if (compact && hideInput) {
    if (loading) {
      return <ScorePanelLoadingSkeleton icon={Shield} />;
    }
    if (!compactResult) {
      return (
        <div className="flex min-h-[52px] items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm min-w-[140px]">
          <Shield className="w-4 h-4 text-gray-400" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-none">
              Algorithm Score
            </span>
            <span className="text-lg font-bold leading-tight text-gray-400">—</span>
          </div>
        </div>
      );
    }
    const t = scoreTier(compactResult.overallScore);
    return (
      <div
        className={`flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2 shadow-sm min-w-[140px] ${
          compactResult.overallScore >= 60
            ? 'bg-cyan-50/50 border-cyan-100'
            : compactResult.overallScore >= 40
              ? 'bg-amber-50/80 border-amber-100'
              : 'bg-red-50/80 border-red-100'
        }`}
      >
        <Shield className={`w-4 h-4 flex-shrink-0 ${t.text}`} />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-none">
            {compactResult.platformName} Score
          </span>
          <span
            className={`text-lg font-bold leading-tight tabular-nums ${t.text}`}
          >
            {compactResult.overallScore}
          </span>
        </div>
      </div>
    );
  }

  const analyzeLayer2 = async (contentText, layer1Snapshot, platKey, ctKey) => {
    const nicheLine = nicheDisplay || 'a general content creator';
    const platformLabel =
      PLATFORM_ROWS.find((p) => p.id === platKey)?.label || platKey;
    const ctTitle = formatContentTypeTitle(platKey, ctKey);

    const rulesPayload = layer1Snapshot.map((r) => ({
      id: r.id,
      label: r.label,
      score: r.score,
      reason: r.reason || r.detail,
    }));

    const system = `You are an elite social media strategist specializing in ${nicheLine} content on ${platformLabel}. You analyze content with the precision of someone who has studied thousands of top-performing posts in this niche and knows exactly what the algorithm rewards right now.

When you rewrite or expand copy, it must read like a real human wrote it in one sitting—natural rhythm, contractions where appropriate, and the same rough edges as strong organic posts. Never sound like generic AI or corporate marketing boilerplate.

${HUMAN_WRITING_RULES}`;

    const userMsg = `Analyze this ${platformLabel} ${ctTitle} content for a ${nicheLine} brand targeting ${
      targetAudienceDisplay || 'a broad engaged audience'
    } with a ${brandVoiceTone} tone.

Content submitted by user:
${contentText}

Rules engine preliminary scores:
${JSON.stringify(rulesPayload)}

Return ONLY valid JSON, no markdown, no preamble:
{
  "semanticOverride": {
    "[signalId]": {
      "adjustedScore": 0,
      "semanticReason": "one sentence — what you actually see in the content",
      "quickFix": "a ready-to-use rewrite or addition, max 20 words"
    }
  },
  "nicheContext": "one sentence on how this performs vs top ${nicheLine} posts on ${platformLabel} right now",
  "overallVerdict": "one punchy sentence — the single most important thing this content needs",
  "autoFixedCaption": "string — full optimized version of the user's content (see human-voice rules below)"
}

Human-voice rules for autoFixedCaption (critical):
- Preserve the user's personality: keep their vocabulary level, humor, and pacing unless a small change fixes a failing signal.
- Write the way a skilled creator or in-house social manager would type—direct, specific, and conversational for ${platformLabel}. Use varied sentence lengths; avoid perfectly parallel "rule of three" structures unless the original had them.
- Do NOT use AI clichés or filler such as: "In today's fast-paced world", "Let's dive in", "game-changer", "unlock", "elevate your", "whether you're X or Y", "look no further", "here's the thing", or overly polished sign-offs. No fake enthusiasm stacks.
- Do NOT add markdown, emojis the user didn't use, or bullet lists unless the original format clearly used them.
- Prefer tightening and one sharp addition (hook, CTA, hashtag block) over rewriting everything into bland marketing speak.
- quickFix lines in semanticOverride must also sound like something a human would paste—not robotic fragments.

Only include signals in semanticOverride where your assessment differs from or adds nuance to the rules engine. Omit signals where the rules engine assessment is already accurate.

adjustedScore must be 0, 0.5, or 1 only.`;

    try {
      const data = await callClaudeAPI(
        [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        0.35,
        { max_tokens: 700 },
      );
      const parsed = parseClaudeJson(data.content);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON from Claude');
      }
      setLayer2Results(parsed);
      setClaudeUnavailable(false);
    } catch {
      console.log('AlgorithmChecker: Claude enhancement unavailable');
      setClaudeUnavailable(true);
      setLayer2Results(null);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAnalyze = () => {
    if (!effectivePlatform || !resolvedContentType) return;
    const text = (hideInput ? externalContent ?? '' : localContent).trim();
    if (text.length < 20) return;

    setError(null);
    setLayer2Results(null);
    setClaudeUnavailable(false);
    setShowAutoFix(false);
    liveScoreRef.current = 0;
    setDisplayScore(0);
    setIsAnalyzing(true);

    const r = checkAlgorithmAlignment(text, effectivePlatform, resolvedContentType);
    setLayer1Results(r.results);
    setIsAnalyzing(false);

    if (compact) {
      return;
    }

    setIsEnhancing(true);
    void analyzeLayer2(text, r.results, effectivePlatform, resolvedContentType);
  };

  const handlePlatformSelect = (pid) => {
    setPlatform(pid);
    setLayer1Results(null);
    setLayer2Results(null);
    setClaudeUnavailable(false);
    setShowAutoFix(false);
    if (pid === 'twitter') {
      setContentType('post');
      setContentTypeConfirmed(true);
    } else {
      const first = CONTENT_TYPES_BY_PLATFORM[pid]?.[0]?.id || null;
      setContentType(first);
      setContentTypeConfirmed(false);
    }
  };

  const handleContentTypePick = (cid) => {
    setContentType(cid);
    setContentTypeConfirmed(true);
    setLayer1Results(null);
    setLayer2Results(null);
    setClaudeUnavailable(false);
    setShowAutoFix(false);
  };

  const canAnalyze =
    Boolean(effectivePlatform) &&
    Boolean(resolvedContentType) &&
    (effectivePlatform === 'twitter' || contentTypeConfirmed) &&
    effectiveContent.length >= 20 &&
    !isAnalyzing;

  const ctOptions =
    effectivePlatform && effectivePlatform !== 'twitter'
      ? CONTENT_TYPES_BY_PLATFORM[effectivePlatform] || []
      : [];

  const showResults = Boolean(layer1Results?.length);
  const nicheContextLine =
    nicheDisplay && layer2Results?.nicheContext && !claudeUnavailable
      ? String(layer2Results.nicheContext).trim()
      : '';

  const overallVerdictText =
    !claudeUnavailable && layer2Results?.overallVerdict
      ? String(layer2Results.overallVerdict).trim()
      : '';

  const bannerMessage =
    !isEnhancing || claudeUnavailable
      ? ''
      : bannerPhase === 'reading'
        ? 'Reading your content...'
        : nicheDisplay
          ? `Checking against ${nicheDisplay} benchmarks...`
          : 'Running semantic analysis...';

  const handleCopyFix = (id, txt) => {
    void navigator.clipboard?.writeText(txt);
    setCopiedFixId(id);
    setTimeout(() => setCopiedFixId(null), 1600);
  };

  const handleCopyOptimized = () => {
    if (!autoFixedCaption) return;
    void navigator.clipboard?.writeText(autoFixedCaption);
    setCopiedOptimized(true);
    setTimeout(() => setCopiedOptimized(false), 1600);
    addToast('Optimized copy copied', 'success');
  };

  const handleSaveLibrary = async () => {
    if (!autoFixedCaption || !user?.id) {
      addToast('Log in to save to your library', 'error');
      return;
    }
    const payload = buildContentVaultPayload({
      contentText: autoFixedCaption,
      contentType: 'caption',
      toolSource: 'algorithm_checker',
      toolLabel: 'Algorithm Alignment',
      topic: `${effectivePlatform} ${resolvedContentType}`,
      platform: effectivePlatform,
      metadata: {
        original_excerpt: effectiveContent.slice(0, 500),
        scores_at_save: mergedOverall,
      },
    });
    const result = await saveToVault(user.id, payload);
    if (result?.success) {
      window.dispatchEvent(new CustomEvent(CONTENT_VAULT_UPDATED_EVENT));
      addToast('Saved to library', 'success');
    } else {
      addToast(result?.error || 'Could not save', 'error');
    }
  };

  const headerTitle =
    effectivePlatform && resolvedContentType
      ? `${PLATFORM_ROWS.find((p) => p.id === effectivePlatform)?.label || ''} ${formatContentTypeTitle(effectivePlatform, resolvedContentType)} Score`.trim()
      : 'Content Score';

  return (
    <Motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 min-w-[375px] max-w-full"
    >
      {!hideInput && (
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900">
              Will the algorithm show this to people?
            </h3>
            <span className="relative group cursor-help">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                <path strokeLinecap="round" d="M12 16v-1m0-3a2 2 0 10-2-2" strokeWidth="1.5" />
              </svg>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                Algorithm Alignment scores how well your content matches each
                platform's ranking signals. Layer 1 is instant rules; Layer 2
                adds niche-aware semantic review.
              </span>
            </span>
          </div>
          <a
            href="/dashboard/ai-tools?tool=scorer"
            className="text-xs text-huttle-primary hover:underline font-medium"
          >
            Want to check writing quality first? → Quality Scorer
          </a>
        </div>
      )}

      {/* Step 1 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Step 1 · Platform
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_ROWS.map(({ id, label, Icon }) => {
            const active = effectivePlatform === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handlePlatformSelect(id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all min-h-[44px] ${
                  active
                    ? 'border-huttle-primary bg-huttle-primary/10 text-huttle-primary shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-huttle-primary' : 'text-gray-500'}`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 */}
      <AnimatePresence>
        {effectivePlatform && effectivePlatform !== 'twitter' && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Step 2 · Content type
            </p>
            <div className="flex flex-wrap gap-2">
              {ctOptions.map((opt, idx) => {
                const selected =
                  contentType === opt.id ||
                  (!contentTypeConfirmed && idx === 0);
                const dimmed = !contentTypeConfirmed && idx === 0;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleContentTypePick(opt.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border min-h-[40px] ${
                      selected
                        ? 'border-huttle-primary bg-huttle-primary text-white shadow-md'
                        : 'border-gray-200 bg-gray-100 text-gray-600'
                    } ${dimmed ? 'opacity-55' : ''}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {effectivePlatform === 'twitter' && (
        <p className="text-xs text-gray-500">
          Step 2 skipped — X/Twitter uses a single post format.
        </p>
      )}

      {/* Step 3 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Step 3 · Your content
        </p>
        {!hideInput ? (
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            placeholder={
              effectivePlatform && resolvedContentType
                ? PLACEHOLDERS[
                    placeholderKey(effectivePlatform, resolvedContentType)
                  ] || 'Paste your content...'
                : 'Select platform and content type first.'
            }
            rows={7}
            disabled={!effectivePlatform || !resolvedContentType || (effectivePlatform !== 'twitter' && !contentTypeConfirmed)}
            className="w-full min-h-[160px] rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-huttle-primary/30 focus:border-huttle-primary resize-y disabled:bg-gray-50 disabled:text-gray-400"
          />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-600">
            Using the content from the Quality Scorer field above (
            {effectiveContent.length} characters).
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-2">
          The more you paste, the better the analysis. Scripts, captions,
          hashtags, and slide copy all welcome.
        </p>
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-huttle-primary text-white text-sm font-semibold shadow-md shadow-huttle-primary/20 hover:bg-huttle-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[48px]"
      >
        {isAnalyzing || isEnhancing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : null}
        Analyze Content →
      </button>

      {showResults && (
        <button
          type="button"
          onClick={handleAnalyze}
          className="text-xs font-medium text-huttle-primary hover:underline"
        >
          Re-analyze
        </button>
      )}

      <AnimatePresence mode="wait">
        {showResults && (
          <Motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pt-2"
          >
            {isEnhancing && bannerMessage && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-50/80 border border-cyan-100/80 text-xs text-cyan-900">
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-[#01BAD2]" />
                <span className="animate-pulse">{bannerMessage}</span>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="relative flex items-center justify-center w-[104px] h-[104px] mx-auto sm:mx-0">
                  <AnimatedScoreRing
                    value={displayScore}
                    tierStroke={tier.stroke}
                    size={104}
                    strokeWidth={8}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span
                      className={`text-2xl font-bold tabular-nums leading-none ${tier.text}`}
                    >
                      {displayScore}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500 mt-1">
                      {tier.label}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`w-5 h-5 ${tier.text}`} />
                    <span className="font-semibold text-gray-900">
                      {headerTitle}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <Motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${displayScore}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-2 rounded-full ${tier.bar}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {nicheContextLine && (
              <p className="text-xs text-gray-500 flex gap-1.5 items-start">
                <BarChart3 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{sanitizeAIOutput(nicheContextLine)}</span>
              </p>
            )}

            {overallVerdictText && (
              <p className="text-sm font-medium text-slate-800 leading-snug">
                {sanitizeAIOutput(overallVerdictText)}
              </p>
            )}

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {displayedSignals.map((signal) => (
                <div key={signal.id} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <SignalStateIcon score={signal.score} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {signal.label}
                        </span>
                        <span className="text-xs text-gray-400 tabular-nums">
                          {signal.weight}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                        {sanitizeAIOutput(signal.reason)}
                      </p>
                      {signal.score < 1 && signal.fixChip && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-800 border border-gray-200/80">
                            <Wrench className="w-3 h-3 text-gray-500 flex-shrink-0" />
                            <span className="max-w-[240px] sm:max-w-md truncate">
                              {sanitizeAIOutput(signal.fixChip)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyFix(signal.id, signal.fixChip)
                              }
                              className="p-1 rounded-md hover:bg-gray-200/80 text-gray-600"
                              aria-label="Copy quick fix"
                            >
                              {copiedFixId === signal.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={claudeUnavailable}
                title={
                  claudeUnavailable
                    ? 'AI enhancement unavailable — try again shortly'
                    : undefined
                }
                onClick={() =>
                  !claudeUnavailable && setShowAutoFix((s) => !s)
                }
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-huttle-primary/30 bg-gradient-to-r from-cyan-50/80 to-white text-huttle-primary font-semibold text-sm hover:border-huttle-primary/50 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
              >
                <Sparkles className="w-4 h-4" />✨ Auto-Fix My Content
              </button>

              <AnimatePresence>
                {showAutoFix && !claudeUnavailable && (
                  <Motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50"
                  >
                    <div className="relative p-4 sm:p-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => setShowAutoFix(false)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:bg-gray-200/60"
                        aria-label="Close auto-fix panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-8">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                            Original
                          </p>
                          <textarea
                            readOnly
                            value={effectiveContent}
                            rows={10}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 resize-none"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                            Optimized
                          </p>
                          {autoFixedCaption ? (
                            <>
                              <div className="w-full min-h-[240px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {optimizedSpans.map((span) => {
                                  if (span.type === 'hl') {
                                    return (
                                      <span
                                        key={span.key}
                                        className="bg-[#01BAD2]/20 rounded px-0.5"
                                      >
                                        {span.text}
                                      </span>
                                    );
                                  }
                                  if (span.type === 'raw') {
                                    return (
                                      <span key={span.key}>{span.text}</span>
                                    );
                                  }
                                  return (
                                    <span key={span.key}>{span.text}</span>
                                  );
                                })}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={handleCopyOptimized}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-huttle-primary text-white text-xs font-semibold hover:bg-huttle-primary-dark"
                                >
                                  {copiedOptimized ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  Copy Optimized
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveLibrary()}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50"
                                >
                                  Save to Library
                                </button>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-gray-500 min-h-[120px] py-4">
                              No full rewrite was returned — use the Quick Fix chips
                              on each signal, or run Re-analyze.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <p className="text-xs text-red-600">{sanitizeAIOutput(error)}</p>
            )}

            <p className="text-[11px] text-gray-400">Signals last updated: {lastUpdated}</p>

            <p className="text-xs text-gray-400">
              AI-generated analysis. Platform algorithms change frequently — treat as guidance, not a guarantee.
            </p>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
