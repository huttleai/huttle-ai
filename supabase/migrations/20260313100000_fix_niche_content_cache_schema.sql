ALTER TABLE public.niche_content_cache
ADD COLUMN IF NOT EXISTS payload jsonb;

ALTER TABLE public.niche_content_cache
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.niche_content_cache
ADD COLUMN IF NOT EXISTS hit_count integer NOT NULL DEFAULT 0;

UPDATE public.niche_content_cache
SET payload = result_data
WHERE payload IS NULL
  AND result_data IS NOT NULL;

ALTER TABLE public.niche_content_cache
ALTER COLUMN payload SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS niche_content_cache_shared_cache_key_idx
  ON public.niche_content_cache (cache_key)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS niche_content_cache_user_cache_key_idx
  ON public.niche_content_cache (cache_key, user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can read cache"
  ON public.niche_content_cache;
DROP POLICY IF EXISTS "Authenticated users can read cache"
  ON public.niche_content_cache;
DROP POLICY IF EXISTS "Authenticated users can write cache"
  ON public.niche_content_cache;
DROP POLICY IF EXISTS "Authenticated users can update cache"
  ON public.niche_content_cache;
DROP POLICY IF EXISTS "Service role can insert cache"
  ON public.niche_content_cache;
DROP POLICY IF EXISTS "Service role can update cache"
  ON public.niche_content_cache;

CREATE POLICY "Authenticated users can read cache"
  ON public.niche_content_cache
  FOR SELECT
  TO authenticated
  USING (
    user_id IS NULL
    OR user_id = (select auth.uid())
  );

CREATE POLICY "Service role can insert cache"
  ON public.niche_content_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON public.niche_content_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
