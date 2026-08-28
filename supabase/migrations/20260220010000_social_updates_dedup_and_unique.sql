-- ============================================================================
-- Social Updates: Remove duplicates and prevent future duplicates
-- Run SELECT count(*) FROM social_updates first to verify row count before and after
-- ============================================================================

-- GUARDED 2026-08-26: both statements below reference social_updates.title, but
-- production names that column update_title, so on production (and on any
-- database built from the 00000000000000 baseline) the column does not exist and
-- these statements abort the replay with 42703. The guard runs them unchanged
-- wherever a `title` column is present and skips them otherwise. Intent is
-- unchanged; the equivalent unique index on update_title already exists in
-- production and is created by the baseline.
DO $$
BEGIN
  IF to_regclass('public.social_updates') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'social_updates'
      AND column_name = 'title'
  ) THEN
    RETURN;
  END IF;

  -- Step 1: Remove duplicate social_updates rows, keeping the most recent per title+platform
  -- NOTE: The column is named 'title' (not 'update_title') per the social_updates schema
  EXECUTE $sql$
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
    )
  $sql$;

  -- Step 2: Prevent future duplicates with a unique index on normalized title + platform
  -- NOTE: The existing UNIQUE(platform, date_month, title) constraint handles exact matches.
  -- This index adds case-insensitive deduplication for near-duplicates.
  EXECUTE $sql$
    CREATE UNIQUE INDEX IF NOT EXISTS idx_social_updates_unique_title_platform
      ON social_updates (LOWER(TRIM(COALESCE(title, ''))), LOWER(TRIM(COALESCE(platform, ''))))
  $sql$;
END
$$;
