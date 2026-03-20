-- Post Kits: platform-specific content containers
-- Run manually in Supabase SQL Editor when deploying this migration.

CREATE TABLE IF NOT EXISTS post_kits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook')),
  content_type TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Kit Slots: individual content pieces within a kit
CREATE TABLE IF NOT EXISTS post_kit_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID REFERENCES post_kits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slot_key TEXT NOT NULL,
  content TEXT NOT NULL,
  source_tool TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kit_id, slot_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_kits_user_id ON post_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_post_kits_platform ON post_kits(platform);
CREATE INDEX IF NOT EXISTS idx_post_kit_slots_kit_id ON post_kit_slots(kit_id);

-- RLS
ALTER TABLE post_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_kit_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own post kits" ON post_kits;
DROP POLICY IF EXISTS "Users can manage their own post kit slots" ON post_kit_slots;

CREATE POLICY "Users can manage their own post kits"
  ON post_kits FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their own post kit slots"
  ON post_kit_slots FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Updated_at trigger (idempotent: replaces function body if it already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_post_kits_updated_at ON post_kits;
CREATE TRIGGER update_post_kits_updated_at
  BEFORE UPDATE ON post_kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_kit_slots_updated_at ON post_kit_slots;
CREATE TRIGGER update_post_kit_slots_updated_at
  BEFORE UPDATE ON post_kit_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
