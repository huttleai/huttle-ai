/**
 * Normalizes n8n / Supabase `jobs.result` payloads for AI Plan Builder.
 */

export function coercePlanJobResult(raw) {
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
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
        v = JSON.parse(inner);
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
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return { error: 'string_parse' };
    }
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
        v = JSON.parse(inner);
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
  const unwrapped = unwrapPlanPayload(result);

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
