-- Production cache-schema reconciliation baseline.
--
-- Source of truth: read-only public-schema column snapshot supplied from the
-- production Supabase project on 2026-07-18. The snapshot includes columns,
-- types, nullability, and defaults, but not complete constraints, indexes,
-- policies, triggers, array element types, or column comments.
--
-- This migration intentionally makes a schema built from historical migrations
-- converge on the two confirmed production cache tables. It is idempotent and
-- logically a no-op on the already-current production schema. A broader
-- 37-table CREATE baseline would be misleading without the omitted constraint,
-- index, policy, trigger, and array element-type metadata.

-- Add columns that exist in production but are absent from migration history.
ALTER TABLE IF EXISTS public.daily_dashboard_cache
  ADD COLUMN IF NOT EXISTS niche text;

ALTER TABLE IF EXISTS public.niche_content_cache
  ADD COLUMN IF NOT EXISTS cache_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS generated_date date DEFAULT CURRENT_DATE;

-- These columns were introduced by historical migrations but are confirmed
-- absent from production. Their guarded removal is intentional baseline
-- reconciliation, not an attempt to preserve an obsolete cross-environment
-- extension.
ALTER TABLE IF EXISTS public.daily_dashboard_cache
  DROP COLUMN IF EXISTS dashboard_metadata;

ALTER TABLE IF EXISTS public.niche_content_cache
  DROP COLUMN IF EXISTS generated_at;

-- ALTER TABLE IF EXISTS does not protect ALTER COLUMN from a missing column.
-- Check each confirmed column before normalizing its production attributes.
DO $$
BEGIN
  IF to_regclass('public.daily_dashboard_cache') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_dashboard_cache'
      AND column_name = 'generated_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.daily_dashboard_cache
      ALTER COLUMN generated_date DROP DEFAULT,
      ALTER COLUMN generated_date SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_dashboard_cache'
      AND column_name = 'daily_alerts'
  ) THEN
    EXECUTE 'ALTER TABLE public.daily_dashboard_cache
      ALTER COLUMN daily_alerts DROP DEFAULT,
      ALTER COLUMN daily_alerts DROP NOT NULL';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.niche_content_cache') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'niche'
  ) THEN
    EXECUTE 'ALTER TABLE public.niche_content_cache
      ALTER COLUMN niche DROP DEFAULT,
      ALTER COLUMN niche DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'platform'
  ) THEN
    EXECUTE 'ALTER TABLE public.niche_content_cache
      ALTER COLUMN platform DROP DEFAULT,
      ALTER COLUMN platform DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'result_data'
  ) THEN
    EXECUTE 'ALTER TABLE public.niche_content_cache
      ALTER COLUMN result_data DROP DEFAULT,
      ALTER COLUMN result_data DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'hit_count'
  ) THEN
    EXECUTE 'ALTER TABLE public.niche_content_cache
      ALTER COLUMN hit_count SET DEFAULT 1,
      ALTER COLUMN hit_count DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'expires_at'
  ) THEN
    EXECUTE $sql$ALTER TABLE public.niche_content_cache
      ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours'),
      ALTER COLUMN expires_at DROP NOT NULL$sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'cache_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.niche_content_cache
      ALTER COLUMN cache_date SET DEFAULT CURRENT_DATE,
      ALTER COLUMN cache_date SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.niche_content_cache
      ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN created_at DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'niche_content_cache'
      AND column_name = 'generated_date'
  ) THEN
    EXECUTE 'ALTER TABLE public.niche_content_cache
      ALTER COLUMN generated_date SET DEFAULT CURRENT_DATE,
      ALTER COLUMN generated_date DROP NOT NULL';
  END IF;
END
$$;
