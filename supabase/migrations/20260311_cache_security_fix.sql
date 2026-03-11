ALTER TABLE public.niche_content_cache
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.niche_content_cache
DROP CONSTRAINT IF EXISTS niche_content_cache_cache_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS niche_content_cache_shared_cache_key_idx
  ON public.niche_content_cache (cache_key)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS niche_content_cache_user_cache_key_idx
  ON public.niche_content_cache (cache_key, user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can write cache"
  ON public.niche_content_cache;
DROP POLICY IF EXISTS "Authenticated users can update cache"
  ON public.niche_content_cache;

DROP POLICY IF EXISTS "Anyone can read cache"
  ON public.niche_content_cache;
DROP POLICY IF EXISTS "Authenticated users can read cache"
  ON public.niche_content_cache;

CREATE POLICY "Authenticated users can read cache"
  ON public.niche_content_cache
  FOR SELECT
  TO authenticated
  USING (
    user_id IS NULL
    OR user_id = (select auth.uid())
  );
