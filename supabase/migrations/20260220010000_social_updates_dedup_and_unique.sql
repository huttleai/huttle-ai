-- ============================================================================
-- Social Updates: Remove duplicates and prevent future duplicates
-- Run SELECT count(*) FROM social_updates first to verify row count before and after
-- ============================================================================

-- Step 1: Remove duplicate social_updates rows, keeping the most recent per title+platform
-- NOTE: The column is named 'title' (not 'update_title') per the social_updates schema
DELETE FROM social_updates
WHERE id NOT IN (
  SELECT DISTINCT ON (
    LOWER(TRIM(COALESCE(title, ''))),
    LOWER(TRIM(COALESCE(platform, '')))
  ) id
  FROM social_updates
  ORDER BY
    LOWER(TRIM(COALESCE(title, ''))),
    LOWER(TRIM(COALESCE(platform, ''))),
    fetched_at DESC NULLS LAST
);

-- Step 2: Prevent future duplicates with a unique index on normalized title + platform
-- NOTE: The existing UNIQUE(platform, date_month, title) constraint handles exact matches.
-- This index adds case-insensitive deduplication for near-duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_updates_unique_title_platform
  ON social_updates (LOWER(TRIM(COALESCE(title, ''))), LOWER(TRIM(COALESCE(platform, ''))));
