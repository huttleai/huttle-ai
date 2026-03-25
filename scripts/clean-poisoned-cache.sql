-- ============================================================
-- Huttle AI — Poisoned Cache Cleanup
-- Run ONCE in Supabase SQL Editor after deploying the trending fix.
-- Safe to re-run. All deletes target bad/empty rows only.
-- If Trending Now gets stuck on samples again in the future,
-- run this script first before investigating further.
-- ============================================================

-- 1. Delete niche_content_cache rows where payload is empty.
--    Uses `payload` (canonical column after cache schema fix). Older
--    migrations had `result_data`; if your DB still only has result_data,
--    replace `payload` below with `result_data` in this DELETE.
--    These rows cause warm cache hits that return [] and collapse the merge.
DELETE FROM niche_content_cache
WHERE (
    feature = 'trending_v2_global'
    OR feature = 'trending_v2_niche'
    OR feature = 'trending'
  )
  AND (
    payload IS NULL
    OR payload::text = 'null'
    OR payload::text = '[]'
    OR payload::text = '{}'
    OR jsonb_array_length(payload) = 0
  );

-- 2. Delete today's daily_dashboard_cache rows for all users.
--    Forces a fresh regeneration on next dashboard load.
--    Data regenerates automatically — this is safe.
DELETE FROM daily_dashboard_cache
WHERE generated_date = CURRENT_DATE;

-- 3. Retroactive cleanup — delete daily cache rows where
--    trending_topics is null or empty.
DELETE FROM daily_dashboard_cache
WHERE trending_topics IS NULL
   OR jsonb_array_length(trending_topics) = 0;
