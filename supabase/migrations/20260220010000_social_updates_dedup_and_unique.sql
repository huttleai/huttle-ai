-- ============================================================================
-- Social Updates: Remove duplicates and prevent future duplicates
-- Run SELECT count(*) FROM social_updates first to verify row count before and after
-- ============================================================================

-- Step 1: Remove duplicate social_updates rows, keeping the most recent per title+platform+date_month
-- NOTE: The column is named 'title' (not 'update_title') per the social_updates schema
DELETE FROM social_updates
WHERE id NOT IN (
  SELECT DISTINCT ON (
    LOWER(TRIM(COALESCE(title, ''))),
    LOWER(TRIM(COALESCE(platform, ''))),
    COALESCE(date_month, '')
  ) id
  FROM social_updates
  ORDER BY
    LOWER(TRIM(COALESCE(title, ''))),
    LOWER(TRIM(COALESCE(platform, ''))),
    COALESCE(date_month, ''),
    fetched_at DESC NULLS LAST
);

-- Step 2: Add lookup index for normalized title + platform + date_month.
-- IMPORTANT: Do NOT add a unique index on only title+platform because updates repeat
-- across months and that would delete historical records and block future inserts.
CREATE INDEX IF NOT EXISTS idx_social_updates_lookup_title_platform_month
  ON social_updates (
    LOWER(TRIM(COALESCE(title, ''))),
    LOWER(TRIM(COALESCE(platform, ''))),
    date_month
  );
