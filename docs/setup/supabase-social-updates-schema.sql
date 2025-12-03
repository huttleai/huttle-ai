-- Social Updates Table
-- Stores social media platform updates fetched biweekly from Perplexity API
-- This table is populated by a serverless function running every 2 weeks
-- All users read from this shared table (no per-user data)

CREATE TABLE IF NOT EXISTS public.social_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('Facebook', 'Instagram', 'TikTok', 'X', 'Twitter', 'YouTube')),
  date_month TEXT NOT NULL, -- Format: "YYYY-MM" (e.g., "2025-10")
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  link TEXT,
  impact TEXT NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  key_takeaways JSONB DEFAULT '[]'::jsonb, -- Array of strings
  action_items JSONB DEFAULT '[]'::jsonb, -- Array of strings
  affected_users TEXT,
  timeline TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, date_month, title) -- Prevent duplicate entries
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_updates_date_month ON public.social_updates(date_month DESC);
CREATE INDEX IF NOT EXISTS idx_social_updates_platform ON public.social_updates(platform);
CREATE INDEX IF NOT EXISTS idx_social_updates_created ON public.social_updates(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.social_updates ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read social updates (it's shared data)
CREATE POLICY "Anyone can read social updates" ON public.social_updates
  FOR SELECT USING (true);

-- Policy: Only service role can insert/update (via serverless function)
-- Note: This requires the serverless function to use service_role key, not anon key
CREATE POLICY "Service can manage social updates" ON public.social_updates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_updates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_social_updates_timestamp
  BEFORE UPDATE ON public.social_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_social_updates_updated_at();

-- Optional: Add a comment explaining the table
COMMENT ON TABLE public.social_updates IS 'Stores social media platform updates fetched biweekly. Populated by serverless function, read by all users.';

