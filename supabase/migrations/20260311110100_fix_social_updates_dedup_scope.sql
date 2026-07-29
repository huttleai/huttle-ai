-- ============================================================================
-- Fix social_updates dedupe scope (prevent cross-month data loss)
-- ============================================================================
--
-- Why this exists:
-- A previous migration deduplicated only by normalized title + platform and added
-- a unique index on those two fields. That incorrectly treated month-specific
-- updates as duplicates, deleting historical rows and causing future inserts to
-- fail when the same update title appeared in a later month.
--
-- This migration:
-- 1) Removes the unsafe unique index (if present)
-- 2) Deduplicates only within (title, platform, date_month)
-- 3) Adds a non-unique lookup index for normalized keys + date_month

-- Step 1: Drop unsafe global unique index if it exists.
DROP INDEX IF EXISTS idx_social_updates_unique_title_platform;

-- Step 2: Keep only the most recent row per normalized title+platform+date_month.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        LOWER(TRIM(COALESCE(title, ''))),
        LOWER(TRIM(COALESCE(platform, ''))),
        COALESCE(date_month, '')
      ORDER BY
        fetched_at DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS row_num
  FROM social_updates
)
DELETE FROM social_updates su
USING ranked
WHERE su.id = ranked.id
  AND ranked.row_num > 1;

-- Step 3: Add a non-unique lookup index aligned to the safe dedupe scope.
CREATE INDEX IF NOT EXISTS idx_social_updates_lookup_title_platform_month
  ON social_updates (
    LOWER(TRIM(COALESCE(title, ''))),
    LOWER(TRIM(COALESCE(platform, ''))),
    date_month
  );
