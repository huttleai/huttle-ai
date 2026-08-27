-- HUTTLE AI: updated 4
-- GUARDED 2026-08-26: public.brand_voice does not exist in production, so an
-- unguarded ALTER TABLE aborts replay on an empty database. ALTER TABLE IF
-- EXISTS keeps the intent (add `handle` wherever brand_voice exists).
ALTER TABLE IF EXISTS brand_voice ADD COLUMN IF NOT EXISTS handle TEXT;
