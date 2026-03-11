ALTER TABLE public.niche_content_cache
ADD COLUMN IF NOT EXISTS hit_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Authenticated users can write cache"
  ON public.niche_content_cache;
CREATE POLICY "Authenticated users can write cache"
ON public.niche_content_cache FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update cache"
  ON public.niche_content_cache;
CREATE POLICY "Authenticated users can update cache"
ON public.niche_content_cache FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
