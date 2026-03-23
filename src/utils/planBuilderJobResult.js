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
