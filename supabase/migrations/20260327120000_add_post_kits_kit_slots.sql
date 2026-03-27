-- Canonical Post Kit slot payloads live on post_kits.kit_slots (JSONB merge updates from the app).
ALTER TABLE post_kits
  ADD COLUMN IF NOT EXISTS kit_slots JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN post_kits.kit_slots IS 'Per-slot content: caption, hook, hashtags, cta, visuals — each { content, savedAt }';
