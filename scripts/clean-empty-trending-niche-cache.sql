-- One-off maintenance (dev/staging/prod): remove poisoned shared trending rows that stored an empty JSON array.
-- Run in Supabase SQL editor after deploying perplexity + dashboard cache fixes.
-- Requires: niche_content_cache.payload as jsonb.

DELETE FROM public.niche_content_cache
WHERE user_id IS NULL
  AND feature = 'trending'
  AND jsonb_typeof(payload) = 'array'
  AND jsonb_array_length(payload) = 0;
