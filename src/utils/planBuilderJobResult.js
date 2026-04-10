/**
 * Normalizes n8n / Supabase `jobs.result` payloads for AI Plan Builder.
 */

function safeParse(value) {
  if (typeof value === 'object' && value !== null) return value;

  if (typeof value === 'string') {
    let s = value.trim();
    if (s.startsWith('```')) {
      s = s
        .replace(/^```[a-zA-Z]*\r?\n?/, '')
        .replace(/\n?```\s*$/, '')
        .trim();
    }
    return JSON.parse(s);
  }

  throw new Error('string_parse');
}

/** Strip ``` / ```json (etc.) fences so JSON.parse succeeds; no-op if not fenced. */
function stripCodeFencesFromPlanString(str) {
  if (typeof str !== 'string') return str;
  const s = str.trim();
  if (!s.startsWith('```')) return s;
  return s
    .replace(/^```[a-zA-Z]*\r?\n?/, '')
    .replace(/\r?\n?```\s*$/, '')
    .trim();
}

export function coercePlanJobResult(raw) {
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = safeParse(v);
    } catch {
      return null;
    }
  }
  if (v == null || typeof v !== 'object') return null;
  if (Array.isArray(v) && v.length) v = v[0];
  if (typeof v !== 'object' || v == null) return null;

  const nestedKeys = ['plan', 'output', 'result', 'data', 'body', 'payload', 'response'];
  for (let depth = 0; depth < 5; depth += 1) {
    const hasSchedule = Array.isArray(v.schedule) || Array.isArray(v.calendar) || Array.isArray(v.daily_posts);
    const hasPlatforms = Array.isArray(v.platforms) || Array.isArray(v.platform_focus);
    if (hasSchedule || hasPlatforms || v.content_mix || v.contentMix) return v;
    const inner = nestedKeys.map((k) => v[k]).find((x) => x != null);
    if (!inner) return v;
    if (typeof inner === 'string') {
      try {
        v = safeParse(inner);
      } catch {
        v = inner;
      }
    } else {
      v = inner;
    }
    if (Array.isArray(v) && v.length) v = v[0];
    if (typeof v !== 'object' || v == null) return null;
  }
  return v;
}

/**
 * Legacy validator (schedule + platforms) — used by offline QA and older callers.
 */
export function normalizePlanResultShape(result) {
  const r = coercePlanJobResult(result);
  if (!r || typeof r !== 'object') {
    return { isValid: false, error: 'No plan data was returned from the workflow.' };
  }

  const platforms = Array.isArray(r.platforms)
    ? r.platforms.filter(Boolean)
    : Array.isArray(r.platform_focus)
      ? r.platform_focus.filter(Boolean)
      : [];

  const rawContentMix = (r.contentMix && typeof r.contentMix === 'object')
    ? r.contentMix
    : (r.content_mix && typeof r.content_mix === 'object')
      ? r.content_mix
      : null;

  const cm = rawContentMix || {};
  const edu = Number(cm.educational ?? cm.education);
  const contentMix = Number.isFinite(edu) && edu >= 0
    ? {
        educational: edu,
        entertaining: Number(cm.entertaining ?? cm.fun ?? 0) || 0,
        promotional: Number(cm.promotional ?? cm.promo ?? 0) || 0,
      }
    : { educational: 60, entertaining: 30, promotional: 10 };

  const rawSchedule = Array.isArray(r.schedule)
    ? r.schedule
    : Array.isArray(r.calendar)
      ? r.calendar
      : Array.isArray(r.daily_posts)
        ? r.daily_posts
        : [];

  const schedule = rawSchedule
    .map((dayItem, index) => ({
      day: Number(dayItem?.day) || index + 1,
      posts: Array.isArray(dayItem?.posts) ? dayItem.posts : [],
    }))
    .filter((dayItem) => dayItem.posts.length > 0);

  if (platforms.length === 0) {
    return { isValid: false, error: 'Generated plan is missing platform details.' };
  }

  if (schedule.length === 0) {
    return { isValid: false, error: 'Generated plan is missing a valid posting schedule.' };
  }

  const totalPosts = schedule.reduce((sum, dayItem) => sum + dayItem.posts.length, 0);
  return {
    isValid: true,
    plan: {
      ...r,
      platforms,
      contentMix,
      schedule,
      totalPosts: r.totalPosts || r.total_posts || totalPosts,
    },
  };
}

function unwrapPlanPayload(raw) {
  let v;
  try {
    v = sanitizePlanJSON(raw);
  } catch {
    return { error: 'string_parse' };
  }
  if (v == null) return { error: 'null' };
  if (typeof v !== 'object') return { error: 'not_object' };

  const nestedKeys = ['plan', 'output', 'result', 'data', 'body', 'payload', 'response'];
  if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.days) && v.overview) {
    return { value: v };
  }

  let depth = 0;
  while (depth < 6) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const innerPlan = v.plan;
      if (innerPlan && typeof innerPlan === 'object' && Array.isArray(innerPlan.days)) {
        return { value: innerPlan };
      }
    }
    const inner = nestedKeys.map((k) => (v && typeof v === 'object' ? v[k] : undefined)).find((x) => x != null);
    if (inner == null) break;
    if (typeof inner === 'string') {
      try {
        v = safeParse(inner);
      } catch {
        return { error: 'nested_parse', raw: inner };
      }
    } else {
      v = inner;
    }
    if (Array.isArray(v) && v.length) v = v[0];
    depth += 1;
  }

  return { value: v };
}

function isNewPlanShape(planObj) {
  if (!planObj || typeof planObj !== 'object') return false;
  if (!planObj.overview || typeof planObj.overview !== 'object') return false;
  if (!Array.isArray(planObj.days) || planObj.days.length === 0) return false;
  return true;
}

function normalizeContentMixFromSummary(mix) {
  if (!mix || typeof mix !== 'object') return {};
  const out = {};
  for (const [k, val] of Object.entries(mix)) {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) continue;
    out[String(k)] = n;
  }
  return out;
}

function flattenHashtags(h) {
  if (!h) return [];
  if (Array.isArray(h)) return h.filter(Boolean);
  if (typeof h === 'object') {
    const primary = Array.isArray(h.primary) ? h.primary : [];
    const secondary = Array.isArray(h.secondary) ? h.secondary : [];
    return [...primary, ...secondary].filter(Boolean);
  }
  return [];
}

function sanitizePlanJSON(raw) {
  if (typeof raw === 'object' && raw !== null) return raw;
  if (typeof raw === 'string') {
    return safeParse(raw);
  }
  return safeParse(String(raw));
}

/**
 * Normalizes n8n "planTitle + summary + days[].dayNumber" shape into the v2 overview + days format.
 */
export function normalizeN8nAlternatePlanToV2(raw) {
  let sanitized;
  try {
    sanitized = sanitizePlanJSON(raw);
  } catch {
    return null;
  }
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) return null;
  if (sanitized.overview && typeof sanitized.overview === 'object') return null;
  if (!Array.isArray(sanitized.days) || sanitized.days.length === 0) return null;

  const summary = sanitized.summary && typeof sanitized.summary === 'object' ? sanitized.summary : {};

  const days = sanitized.days.map((d, idx) => {
    const posts = Array.isArray(d.posts) ? d.posts : [];
    const mappedPosts = posts.map((p) => {
      const hashtags = flattenHashtags(p.hashtags);
      const captionAngle = p.captionAngle ?? p.caption_angle ?? '';
      return {
        platform: p.platform,
        contentType: p.contentType ?? p.content_type,
        format: p.format,
        postTime: p.bestTime ?? p.postTime ?? p.best_time ?? '',
        hook: p.hook ?? '',
        topic: p.topic ?? '',
        caption: typeof captionAngle === 'string' && captionAngle.trim() ? captionAngle : (p.caption ?? ''),
        hashtags,
        pillar: p.pillar,
        why_this_works: p.why_this_works,
        notes: p.visualDirection ?? p.visual_direction ?? p.notes ?? '',
        cta: p.cta,
      };
    });
    return {
      day: Number(d.dayNumber ?? d.day ?? idx + 1) || idx + 1,
      date: d.date != null ? String(d.date) : (d.dayName != null ? String(d.dayName) : ''),
      theme: d.theme != null ? String(d.theme) : '',
      posts: mappedPosts,
    };
  });

  const platformsFromPosts = [
    ...new Set(
      days.flatMap((dd) => (dd.posts || []).map((pp) => pp.platform).filter(Boolean))
    ),
  ];

  const mix = normalizeContentMixFromSummary(summary.contentMix ?? summary.content_mix);
  const optimalTimes = summary.optimalTimes ?? summary.optimal_times;
  let strategyNotes = '';
  if (optimalTimes && typeof optimalTimes === 'object') {
    strategyNotes = Object.entries(optimalTimes)
      .map(([plat, times]) => {
        const t = Array.isArray(times) ? times.join(', ') : String(times ?? '');
        return `${plat}: ${t}`;
      })
      .join('\n');
  }
  if (Array.isArray(summary.keyThemes) && summary.keyThemes.length) {
    const kt = `Key themes: ${summary.keyThemes.join(', ')}`;
    strategyNotes = strategyNotes ? `${strategyNotes}\n${kt}` : kt;
  }

  const overview = {
    goal: sanitized.goal || '',
    duration: `${days.length} days`,
    strategy: typeof sanitized.planTitle === 'string' ? sanitized.planTitle : '',
    strategy_notes: strategyNotes,
    platforms: platformsFromPosts.length ? platformsFromPosts : [],
    postFrequency: summary.postFrequency != null ? String(summary.postFrequency) : '',
    contentMix: Object.keys(mix).length ? mix : {},
  };

  return {
    overview,
    days,
    weeklyTips: Array.isArray(sanitized.weeklyTips) ? sanitized.weeklyTips : [],
  };
}

function fallbackTextFromAnything(raw, coerced) {
  if (typeof raw === 'string') return raw;
  if (coerced && typeof coerced === 'object') {
    if (typeof coerced.rawPlan === 'string') return coerced.rawPlan;
    try {
      return JSON.stringify(coerced, null, 2);
    } catch {
      return String(coerced);
    }
  }
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

/**
 * Parser for Plan Builder results: v2 structured plan, or legacy/malformed → fallback body text.
 * @returns {{ kind: 'v2', plan: object } | { kind: 'fallback', rawText: string }}
 */
export function parsePlanBuilderDisplayResult(result) {
  const raw = typeof result === 'string' ? stripCodeFencesFromPlanString(result) : result;
  const unwrapped = unwrapPlanPayload(raw);

  if (unwrapped.error) {
    const rawText = typeof result === 'string'
      ? result
      : typeof unwrapped.raw === 'string'
        ? unwrapped.raw
        : fallbackTextFromAnything(result, null);
    console.warn('[PlanBuilder] Malformed plan payload:', unwrapped.error);
    return { kind: 'fallback', rawText: rawText.trim() || 'No plan content returned.' };
  }

  const v = unwrapped.value;
  if (v && typeof v === 'object') {
    const alternate = normalizeN8nAlternatePlanToV2(v);
    if (alternate && isNewPlanShape(alternate)) {
      return { kind: 'v2', plan: alternate };
    }
  }
  if (v && typeof v === 'object' && isNewPlanShape(v)) {
    return { kind: 'v2', plan: v };
  }

  const coerced = coercePlanJobResult(result);
  if (coerced && typeof coerced === 'object' && typeof coerced.rawPlan === 'string' && coerced.rawPlan.trim()) {
    return { kind: 'fallback', rawText: coerced.rawPlan.trim() };
  }

  const legacy = normalizePlanResultShape(result);
  if (legacy.isValid && legacy.plan) {
    const rawText = fallbackTextFromAnything(result, legacy.plan);
    console.warn('[PlanBuilder] Legacy plan format — showing fallback viewer');
    return { kind: 'fallback', rawText };
  }

  const rawText = fallbackTextFromAnything(result, coerced);
  if (!rawText || !String(rawText).trim()) {
    console.warn('[PlanBuilder] Empty plan result');
    return { kind: 'fallback', rawText: 'No plan content returned.' };
  }
  console.warn('[PlanBuilder] Unrecognized plan shape — fallback viewer');
  return { kind: 'fallback', rawText: String(rawText).trim() };
}
