-- Baseline production schema.
--
-- GENERATED, not hand-written: every statement below was produced by querying
-- live production (project wpkqwstofpacynssbitc) directly via the Supabase
-- MCP execute_sql tool on 2026-08-26, using pg_catalog / information_schema
-- introspection (table columns, pg_constraint, pg_indexes, pg_extension,
-- pg_class.relrowsecurity). Nothing here was reconstructed from memory or
-- from repo context.
--
-- WHY THIS FILE EXISTS
-- Supabase Preview provisions an empty database and replays every migration
-- in filename order. The first migration, 20260116_add_creator_archetype.sql,
-- runs ALTER TABLE public.user_profile ADD COLUMN ..., but no migration in
-- this repo ever creates public.user_profile (or several other tables) --
-- they were created directly against production, outside migration history.
-- This file creates every public-schema table, constraint, index, and RLS
-- flag that existed in production as of 2026-08-26, so a fresh replay from
-- migration zero succeeds. It changes nothing on production: every statement
-- is IF NOT EXISTS / guarded, so on a database that already has these objects
-- (i.e. production) this file is a complete no-op.
--
-- Filename prefix is 00000000000000 (all zeros, digits only) so it sorts
-- before every other migration and the Supabase CLI does not skip it.
--
-- REMINDER FOR THIS REPO: production schema changes are applied via the
-- Supabase dashboard/API (apply_migration), never via `supabase db push`.
-- Zero of the repo's other migration files are recorded in
-- supabase_migrations.schema_migrations on production. This baseline is
-- purely for making preview/empty-database replay work; it is not how
-- production itself is changed.
--
-- Scope: RLS is enabled per table below (matching production's
-- relrowsecurity flag) but POLICIES are intentionally NOT included here --
-- later migrations create those, mostly via DROP POLICY IF EXISTS /
-- CREATE POLICY pairs, and duplicating them here would fight those files.
-- No seed data, no DML, no DROP, no ALTER COLUMN anywhere in this file.

-- =========================================================================
-- 1. EXTENSIONS
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgmq WITH SCHEMA pgmq;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- =========================================================================
-- 2. TABLES  (38 tables, generated from information_schema.columns)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.ai_analytics (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  content_type text NOT NULL,
  platform text,
  response_time_ms integer,
  success boolean DEFAULT false NOT NULL,
  error_type text,
  model_used text DEFAULT 'unknown'::text,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_rate_limit_counters (
  user_key text NOT NULL,
  route text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  request_count integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bonus_credit_ledger (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  event_type text NOT NULL,
  bonus_type text,
  stripe_subscription_id text,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.brand_data (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  brand_name text,
  brand_voice text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cancellation_feedback (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  subscription_tier text,
  cancellation_reason text,
  custom_feedback text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  reason_other text,
  what_would_stay text,
  recommend_likelihood text,
  additional_feedback text,
  source text DEFAULT 'feedback_form'::text,
  submitted_via text
);

CREATE TABLE IF NOT EXISTS public.content_collection_items (
  collection_id uuid NOT NULL,
  content_item_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_collections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_library (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  storage_path text,
  url text,
  content text,
  size_bytes bigint DEFAULT 0 NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  project_id uuid,
  tool_name text,
  plan_id uuid,
  post_builder_step text,
  profile_type_at_generation text,
  ai_context_snapshot jsonb
);

CREATE TABLE IF NOT EXISTS public.daily_dashboard_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  generated_date date NOT NULL,
  trending_topics jsonb,
  hashtags_of_day jsonb,
  ai_insight jsonb,
  created_at timestamp with time zone DEFAULT now(),
  ai_insights jsonb DEFAULT '[]'::jsonb,
  daily_alerts jsonb,
  niche text,
  dashboard_metadata jsonb
);

CREATE TABLE IF NOT EXISTS public.dm_leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  handle text NOT NULL,
  platform text NOT NULL,
  niche text,
  status text DEFAULT 'sent'::text NOT NULL,
  dm_sent_at timestamp with time zone DEFAULT now(),
  follow_up_at timestamp with time zone DEFAULT (now() + '3 days'::interval),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  message text NOT NULL,
  page text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generated_content (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  type text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  tool text,
  created_at timestamp with time zone DEFAULT now(),
  original_content text,
  remix_mode text,
  result jsonb
);

CREATE TABLE IF NOT EXISTS public.global_cache (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  social_platform_updates jsonb,
  general_trending_topics jsonb,
  general_trending_hashtags jsonb
);

CREATE TABLE IF NOT EXISTS public.job_notifications (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  job_id uuid NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'queued'::text NOT NULL,
  input jsonb NOT NULL,
  result jsonb,
  error text,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  progress smallint DEFAULT '0'::smallint,
  duration smallint
);

CREATE TABLE IF NOT EXISTS public.n8n_post_queue (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  post_data jsonb NOT NULL,
  status text DEFAULT 'queued'::text NOT NULL,
  platforms text[] NOT NULL,
  scheduled_for timestamp with time zone,
  n8n_workflow_id text,
  n8n_response jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.niche_content_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  cache_key text NOT NULL,
  feature text NOT NULL,
  niche text,
  platform text,
  user_type text,
  cache_date date DEFAULT CURRENT_DATE NOT NULL,
  payload jsonb NOT NULL,
  hit_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  user_id uuid,
  result_data jsonb,
  generated_date date DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  cta_label text,
  cta_url text,
  read boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.post_kit_slots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  kit_id uuid NOT NULL,
  user_id uuid NOT NULL,
  slot_key text NOT NULL,
  content text NOT NULL,
  source_tool text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_kits (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  platform text NOT NULL,
  content_type text,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  kit_slots jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name character varying(50) NOT NULL,
  description text,
  color character varying(7) DEFAULT '#6366f1'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  content text,
  platform text,
  scheduled_for timestamp with time zone,
  status text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  title text,
  caption text,
  hashtags text,
  keywords text,
  platforms text[],
  content_type text,
  image_prompt text,
  video_prompt text,
  media_urls jsonb,
  timezone text DEFAULT 'UTC'::text,
  posted_at timestamp with time zone,
  last_status_change timestamp with time zone,
  deprecated_calendar_removed boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.smart_calendar (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  post_content text,
  scheduled_date timestamp with time zone,
  status text DEFAULT 'scheduled'::text,
  platform text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_connections (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  platform text NOT NULL,
  is_connected boolean DEFAULT false NOT NULL,
  n8n_credential_id text,
  platform_username text,
  platform_user_id text,
  connected_at timestamp with time zone,
  last_verified timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_analytics_sync timestamp with time zone,
  analytics_enabled boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.social_updates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  platform text NOT NULL,
  update_title text NOT NULL,
  update_summary text NOT NULL,
  update_type text NOT NULL,
  impact_level text NOT NULL,
  source_url text,
  published_date date,
  fetched_at timestamp with time zone DEFAULT now(),
  batch_id text NOT NULL,
  expires_at timestamp with time zone,
  action_required boolean DEFAULT false,
  what_it_means text
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  tier text NOT NULL,
  status text NOT NULL,
  stripe_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  stripe_customer_id text,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamp with time zone,
  customer_name text,
  bonus_generations integer DEFAULT 0,
  bonus_granted_at timestamp with time zone,
  bonus_expires_at timestamp with time zone,
  bonus_type text,
  trial_end timestamp with time zone,
  trial_start timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.tier_feature_limits (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  tier text NOT NULL,
  feature_key text NOT NULL,
  monthly_limit integer,
  notes text,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trend_forecasts (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  niche text NOT NULL,
  forecast_data jsonb NOT NULL,
  timeline jsonb,
  post_ideas text[],
  citations text[],
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.trial_email_reminders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  stripe_subscription_id text NOT NULL,
  reminder_type text NOT NULL,
  trial_end_at timestamp with time zone NOT NULL,
  resend_email_id text,
  sent_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  feature text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_daily_insights (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  final_trending_topics jsonb,
  final_trending_hashtags jsonb
);

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid,
  feedback_type text NOT NULL,
  rating integer,
  feedback_text text NOT NULL,
  status text DEFAULT 'new'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL,
  timezone text DEFAULT 'UTC'::text,
  calendar_view text DEFAULT 'month'::text,
  notification_settings jsonb DEFAULT '{"reminders": [30, 15, 5]}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  creator_type text,
  content_focus text,
  growth_stage text,
  target_audience text,
  platforms text[],
  city text,
  user_brand_type text DEFAULT ''::text,
  brand_vibes jsonb DEFAULT '[]'::jsonb,
  content_focus_pillars jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  niche text,
  target_audience text,
  content_goals text[],
  posting_frequency text,
  quiz_completed_at timestamp with time zone,
  onboarding_step integer DEFAULT 0,
  preferred_platforms text[],
  brand_voice_preference text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  brand_name text,
  industry text,
  stripe_customer_id text,
  creator_archetype text,
  profile_type text DEFAULT 'brand_business'::text,
  biggest_challenge text,
  content_strengths text[],
  hook_style_preference text,
  emotional_triggers text[],
  first_name text,
  has_seen_tour boolean DEFAULT false NOT NULL,
  has_completed_onboarding boolean DEFAULT false NOT NULL,
  social_handle text,
  sub_niche text,
  audience_pain_point text,
  audience_action_trigger text,
  tone_chips text[],
  writing_style text,
  example_post text,
  content_to_post text[],
  content_to_avoid text,
  follower_count text,
  primary_offer text,
  conversion_goal text,
  content_persona text,
  monetization_goal text,
  show_up_style text,
  city text,
  has_seen_welcome_notification boolean DEFAULT false NOT NULL,
  onboarding_branch text,
  onboarding_total_steps integer DEFAULT 0,
  business_primary_goal text,
  creator_monetization_path text,
  content_mix jsonb DEFAULT '{}'::jsonb,
  location_state text,
  is_local_business boolean DEFAULT false,
  audience_location_type text DEFAULT 'mostly_online'::text,
  audience_stage text,
  country text DEFAULT 'US'::text
);

CREATE TABLE IF NOT EXISTS public.user_publishes (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  user_id uuid NOT NULL,
  post_id uuid,
  platform text NOT NULL,
  deep_link_used boolean DEFAULT true,
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  storage_used_bytes bigint DEFAULT 0 NOT NULL,
  onboarding_completed boolean DEFAULT false,
  creator_archetype text,
  content_focus text[],
  content_goals text[],
  content_frequency text,
  content_platforms text[],
  brand_vibe text,
  target_audience text,
  subscription_tier text DEFAULT 'free'::text,
  secure_account_email_sent boolean DEFAULT false
);

-- =========================================================================
-- 3. CONSTRAINTS  (primary keys, unique, check, foreign key)
-- Wrapped in a DO block with existence guards so re-running is a no-op.
-- =========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ai_analytics_pkey' AND conrelid=to_regclass('public.ai_analytics')) THEN
    ALTER TABLE public.ai_analytics ADD CONSTRAINT ai_analytics_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ai_analytics_content_type_check' AND conrelid=to_regclass('public.ai_analytics')) THEN
    ALTER TABLE public.ai_analytics ADD CONSTRAINT ai_analytics_content_type_check CHECK ((content_type = ANY (ARRAY['caption'::text, 'hook'::text, 'remix'::text, 'script'::text, 'trend_forecast'::text, 'audience_insight'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ai_analytics_response_time_ms_check' AND conrelid=to_regclass('public.ai_analytics')) THEN
    ALTER TABLE public.ai_analytics ADD CONSTRAINT ai_analytics_response_time_ms_check CHECK ((response_time_ms >= 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ai_analytics_user_id_fkey' AND conrelid=to_regclass('public.ai_analytics')) THEN
    ALTER TABLE public.ai_analytics ADD CONSTRAINT ai_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='api_rate_limit_counters_pkey' AND conrelid=to_regclass('public.api_rate_limit_counters')) THEN
    ALTER TABLE public.api_rate_limit_counters ADD CONSTRAINT api_rate_limit_counters_pkey PRIMARY KEY (user_key, route, window_start);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bonus_credit_ledger_pkey' AND conrelid=to_regclass('public.bonus_credit_ledger')) THEN
    ALTER TABLE public.bonus_credit_ledger ADD CONSTRAINT bonus_credit_ledger_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bonus_credit_ledger_event_type_check' AND conrelid=to_regclass('public.bonus_credit_ledger')) THEN
    ALTER TABLE public.bonus_credit_ledger ADD CONSTRAINT bonus_credit_ledger_event_type_check CHECK ((event_type = ANY (ARRAY['granted'::text, 'consumed'::text, 'expired'::text, 'refunded'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bonus_credit_ledger_user_id_fkey' AND conrelid=to_regclass('public.bonus_credit_ledger')) THEN
    ALTER TABLE public.bonus_credit_ledger ADD CONSTRAINT bonus_credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='brand_data_pkey' AND conrelid=to_regclass('public.brand_data')) THEN
    ALTER TABLE public.brand_data ADD CONSTRAINT brand_data_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='brand_data_user_id_fkey' AND conrelid=to_regclass('public.brand_data')) THEN
    ALTER TABLE public.brand_data ADD CONSTRAINT brand_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cancellation_feedback_pkey' AND conrelid=to_regclass('public.cancellation_feedback')) THEN
    ALTER TABLE public.cancellation_feedback ADD CONSTRAINT cancellation_feedback_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cancellation_feedback_recommend_check' AND conrelid=to_regclass('public.cancellation_feedback')) THEN
    ALTER TABLE public.cancellation_feedback ADD CONSTRAINT cancellation_feedback_recommend_check CHECK (((recommend_likelihood IS NULL) OR (recommend_likelihood = ANY (ARRAY['yes'::text, 'maybe'::text, 'no'::text]))));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cancellation_feedback_user_id_fkey' AND conrelid=to_regclass('public.cancellation_feedback')) THEN
    ALTER TABLE public.cancellation_feedback ADD CONSTRAINT cancellation_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_collection_items_pkey' AND conrelid=to_regclass('public.content_collection_items')) THEN
    ALTER TABLE public.content_collection_items ADD CONSTRAINT content_collection_items_pkey PRIMARY KEY (collection_id, content_item_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_collection_items_collection_id_fkey' AND conrelid=to_regclass('public.content_collection_items')) THEN
    ALTER TABLE public.content_collection_items ADD CONSTRAINT content_collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES content_collections(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_collection_items_content_item_id_fkey' AND conrelid=to_regclass('public.content_collection_items')) THEN
    ALTER TABLE public.content_collection_items ADD CONSTRAINT content_collection_items_content_item_id_fkey FOREIGN KEY (content_item_id) REFERENCES content_library(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_collections_pkey' AND conrelid=to_regclass('public.content_collections')) THEN
    ALTER TABLE public.content_collections ADD CONSTRAINT content_collections_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_collections_user_id_name_key' AND conrelid=to_regclass('public.content_collections')) THEN
    ALTER TABLE public.content_collections ADD CONSTRAINT content_collections_user_id_name_key UNIQUE (user_id, name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_collections_user_id_fkey' AND conrelid=to_regclass('public.content_collections')) THEN
    ALTER TABLE public.content_collections ADD CONSTRAINT content_collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_library_pkey' AND conrelid=to_regclass('public.content_library')) THEN
    ALTER TABLE public.content_library ADD CONSTRAINT content_library_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_library_type_check' AND conrelid=to_regclass('public.content_library')) THEN
    ALTER TABLE public.content_library ADD CONSTRAINT content_library_type_check CHECK ((type = ANY (ARRAY['image'::text, 'video'::text, 'text'::text, 'caption'::text, 'hook'::text, 'hashtag'::text, 'cta'::text, 'plan'::text, 'content_plan'::text, 'blueprint'::text, 'remix'::text, 'post'::text, 'script'::text, 'full_post'::text, 'day'::text, 'plan_day'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_library_project_id_fkey' AND conrelid=to_regclass('public.content_library')) THEN
    ALTER TABLE public.content_library ADD CONSTRAINT content_library_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='content_library_user_id_fkey' AND conrelid=to_regclass('public.content_library')) THEN
    ALTER TABLE public.content_library ADD CONSTRAINT content_library_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='daily_dashboard_cache_pkey' AND conrelid=to_regclass('public.daily_dashboard_cache')) THEN
    ALTER TABLE public.daily_dashboard_cache ADD CONSTRAINT daily_dashboard_cache_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='daily_dashboard_cache_user_id_generated_date_key' AND conrelid=to_regclass('public.daily_dashboard_cache')) THEN
    ALTER TABLE public.daily_dashboard_cache ADD CONSTRAINT daily_dashboard_cache_user_id_generated_date_key UNIQUE (user_id, generated_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='daily_dashboard_cache_user_id_fkey' AND conrelid=to_regclass('public.daily_dashboard_cache')) THEN
    ALTER TABLE public.daily_dashboard_cache ADD CONSTRAINT daily_dashboard_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dm_leads_pkey' AND conrelid=to_regclass('public.dm_leads')) THEN
    ALTER TABLE public.dm_leads ADD CONSTRAINT dm_leads_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dm_leads_platform_check' AND conrelid=to_regclass('public.dm_leads')) THEN
    ALTER TABLE public.dm_leads ADD CONSTRAINT dm_leads_platform_check CHECK ((platform = ANY (ARRAY['ig'::text, 'x'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dm_leads_status_check' AND conrelid=to_regclass('public.dm_leads')) THEN
    ALTER TABLE public.dm_leads ADD CONSTRAINT dm_leads_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'replied'::text, 'follow_up'::text, 'converted'::text, 'skip'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feedback_pkey' AND conrelid=to_regclass('public.feedback')) THEN
    ALTER TABLE public.feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feedback_user_id_fkey' AND conrelid=to_regclass('public.feedback')) THEN
    ALTER TABLE public.feedback ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='generated_content_pkey' AND conrelid=to_regclass('public.generated_content')) THEN
    ALTER TABLE public.generated_content ADD CONSTRAINT generated_content_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='generated_content_type_check' AND conrelid=to_regclass('public.generated_content')) THEN
    ALTER TABLE public.generated_content ADD CONSTRAINT generated_content_type_check CHECK ((type = ANY (ARRAY['caption'::text, 'hashtag'::text, 'hook'::text, 'cta'::text, 'scored'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='generated_content_user_id_fkey' AND conrelid=to_regclass('public.generated_content')) THEN
    ALTER TABLE public.generated_content ADD CONSTRAINT generated_content_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='global_cache_pkey' AND conrelid=to_regclass('public.global_cache')) THEN
    ALTER TABLE public.global_cache ADD CONSTRAINT global_cache_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='job_notifications_pkey' AND conrelid=to_regclass('public.job_notifications')) THEN
    ALTER TABLE public.job_notifications ADD CONSTRAINT job_notifications_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='job_notifications_job_id_fkey' AND conrelid=to_regclass('public.job_notifications')) THEN
    ALTER TABLE public.job_notifications ADD CONSTRAINT job_notifications_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='job_notifications_user_id_fkey' AND conrelid=to_regclass('public.job_notifications')) THEN
    ALTER TABLE public.job_notifications ADD CONSTRAINT job_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='jobs_pkey' AND conrelid=to_regclass('public.jobs')) THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='jobs_user_id_fkey' AND conrelid=to_regclass('public.jobs')) THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='n8n_post_queue_pkey' AND conrelid=to_regclass('public.n8n_post_queue')) THEN
    ALTER TABLE public.n8n_post_queue ADD CONSTRAINT n8n_post_queue_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='n8n_post_queue_status_check' AND conrelid=to_regclass('public.n8n_post_queue')) THEN
    ALTER TABLE public.n8n_post_queue ADD CONSTRAINT n8n_post_queue_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='n8n_post_queue_user_id_fkey' AND conrelid=to_regclass('public.n8n_post_queue')) THEN
    ALTER TABLE public.n8n_post_queue ADD CONSTRAINT n8n_post_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='niche_content_cache_pkey' AND conrelid=to_regclass('public.niche_content_cache')) THEN
    ALTER TABLE public.niche_content_cache ADD CONSTRAINT niche_content_cache_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='niche_content_cache_user_type_check' AND conrelid=to_regclass('public.niche_content_cache')) THEN
    ALTER TABLE public.niche_content_cache ADD CONSTRAINT niche_content_cache_user_type_check CHECK (((user_type = ANY (ARRAY['brand_business'::text, 'solo_creator'::text])) OR (user_type IS NULL)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='niche_content_cache_user_id_fkey' AND conrelid=to_regclass('public.niche_content_cache')) THEN
    ALTER TABLE public.niche_content_cache ADD CONSTRAINT niche_content_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='notifications_pkey' AND conrelid=to_regclass('public.notifications')) THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='notifications_user_id_fkey' AND conrelid=to_regclass('public.notifications')) THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_kit_slots_pkey' AND conrelid=to_regclass('public.post_kit_slots')) THEN
    ALTER TABLE public.post_kit_slots ADD CONSTRAINT post_kit_slots_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_kit_slots_kit_id_slot_key_key' AND conrelid=to_regclass('public.post_kit_slots')) THEN
    ALTER TABLE public.post_kit_slots ADD CONSTRAINT post_kit_slots_kit_id_slot_key_key UNIQUE (kit_id, slot_key);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_kit_slots_kit_id_fkey' AND conrelid=to_regclass('public.post_kit_slots')) THEN
    ALTER TABLE public.post_kit_slots ADD CONSTRAINT post_kit_slots_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES post_kits(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_kit_slots_user_id_fkey' AND conrelid=to_regclass('public.post_kit_slots')) THEN
    ALTER TABLE public.post_kit_slots ADD CONSTRAINT post_kit_slots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_kits_pkey' AND conrelid=to_regclass('public.post_kits')) THEN
    ALTER TABLE public.post_kits ADD CONSTRAINT post_kits_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_kits_platform_check' AND conrelid=to_regclass('public.post_kits')) THEN
    ALTER TABLE public.post_kits ADD CONSTRAINT post_kits_platform_check CHECK ((platform = ANY (ARRAY['instagram'::text, 'tiktok'::text, 'youtube'::text, 'twitter'::text, 'facebook'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_kits_user_id_fkey' AND conrelid=to_regclass('public.post_kits')) THEN
    ALTER TABLE public.post_kits ADD CONSTRAINT post_kits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_pkey' AND conrelid=to_regclass('public.profiles')) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_id_fkey' AND conrelid=to_regclass('public.profiles')) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projects_pkey' AND conrelid=to_regclass('public.projects')) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projects_color_format' AND conrelid=to_regclass('public.projects')) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_color_format CHECK (((color)::text ~ '^#[0-9A-Fa-f]{6}$'::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projects_name_not_empty' AND conrelid=to_regclass('public.projects')) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='projects_user_id_fkey' AND conrelid=to_regclass('public.projects')) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='scheduled_posts_pkey' AND conrelid=to_regclass('public.scheduled_posts')) THEN
    ALTER TABLE public.scheduled_posts ADD CONSTRAINT scheduled_posts_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='scheduled_posts_status_check' AND conrelid=to_regclass('public.scheduled_posts')) THEN
    ALTER TABLE public.scheduled_posts ADD CONSTRAINT scheduled_posts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'ready'::text, 'posting'::text, 'posted'::text, 'failed'::text, 'cancelled'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='scheduled_posts_user_id_fkey' AND conrelid=to_regclass('public.scheduled_posts')) THEN
    ALTER TABLE public.scheduled_posts ADD CONSTRAINT scheduled_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='smart_calendar_pkey' AND conrelid=to_regclass('public.smart_calendar')) THEN
    ALTER TABLE public.smart_calendar ADD CONSTRAINT smart_calendar_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='smart_calendar_user_id_fkey' AND conrelid=to_regclass('public.smart_calendar')) THEN
    ALTER TABLE public.smart_calendar ADD CONSTRAINT smart_calendar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='social_connections_pkey' AND conrelid=to_regclass('public.social_connections')) THEN
    ALTER TABLE public.social_connections ADD CONSTRAINT social_connections_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='social_connections_user_id_platform_key' AND conrelid=to_regclass('public.social_connections')) THEN
    ALTER TABLE public.social_connections ADD CONSTRAINT social_connections_user_id_platform_key UNIQUE (user_id, platform);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='social_connections_platform_check' AND conrelid=to_regclass('public.social_connections')) THEN
    ALTER TABLE public.social_connections ADD CONSTRAINT social_connections_platform_check CHECK ((platform = ANY (ARRAY['instagram'::text, 'facebook'::text, 'twitter'::text, 'tiktok'::text, 'youtube'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='social_connections_user_id_fkey' AND conrelid=to_regclass('public.social_connections')) THEN
    ALTER TABLE public.social_connections ADD CONSTRAINT social_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='social_updates_pkey' AND conrelid=to_regclass('public.social_updates')) THEN
    ALTER TABLE public.social_updates ADD CONSTRAINT social_updates_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='stripe_webhook_events_pkey' AND conrelid=to_regclass('public.stripe_webhook_events')) THEN
    ALTER TABLE public.stripe_webhook_events ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (event_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subscriptions_pkey' AND conrelid=to_regclass('public.subscriptions')) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subscriptions_user_id_unique' AND conrelid=to_regclass('public.subscriptions')) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subscriptions_bonus_type_check' AND conrelid=to_regclass('public.subscriptions')) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_bonus_type_check CHECK ((bonus_type = ANY (ARRAY['annual_signup'::text, 'monthly_first_month'::text, 'manual_grant'::text, NULL::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subscriptions_status_check' AND conrelid=to_regclass('public.subscriptions')) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'past_due'::text, 'trialing'::text, 'unpaid'::text, 'incomplete'::text, 'incomplete_expired'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subscriptions_tier_check' AND conrelid=to_regclass('public.subscriptions')) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'essentials'::text, 'pro'::text, 'founder'::text, 'builder'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subscriptions_user_id_fkey' AND conrelid=to_regclass('public.subscriptions')) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tier_feature_limits_pkey' AND conrelid=to_regclass('public.tier_feature_limits')) THEN
    ALTER TABLE public.tier_feature_limits ADD CONSTRAINT tier_feature_limits_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='tier_feature_limits_tier_feature_key_key' AND conrelid=to_regclass('public.tier_feature_limits')) THEN
    ALTER TABLE public.tier_feature_limits ADD CONSTRAINT tier_feature_limits_tier_feature_key_key UNIQUE (tier, feature_key);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='trend_forecasts_pkey' AND conrelid=to_regclass('public.trend_forecasts')) THEN
    ALTER TABLE public.trend_forecasts ADD CONSTRAINT trend_forecasts_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='trend_forecasts_user_id_fkey' AND conrelid=to_regclass('public.trend_forecasts')) THEN
    ALTER TABLE public.trend_forecasts ADD CONSTRAINT trend_forecasts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='trial_email_reminders_pkey' AND conrelid=to_regclass('public.trial_email_reminders')) THEN
    ALTER TABLE public.trial_email_reminders ADD CONSTRAINT trial_email_reminders_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='trial_email_reminders_stripe_subscription_id_reminder_type_key' AND conrelid=to_regclass('public.trial_email_reminders')) THEN
    ALTER TABLE public.trial_email_reminders ADD CONSTRAINT trial_email_reminders_stripe_subscription_id_reminder_type_key UNIQUE (stripe_subscription_id, reminder_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='trial_email_reminders_reminder_type_check' AND conrelid=to_regclass('public.trial_email_reminders')) THEN
    ALTER TABLE public.trial_email_reminders ADD CONSTRAINT trial_email_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['trial_3_days'::text, 'trial_2_days'::text, 'trial_1_day'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='trial_email_reminders_user_id_fkey' AND conrelid=to_regclass('public.trial_email_reminders')) THEN
    ALTER TABLE public.trial_email_reminders ADD CONSTRAINT trial_email_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_activity_pkey' AND conrelid=to_regclass('public.user_activity')) THEN
    ALTER TABLE public.user_activity ADD CONSTRAINT user_activity_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_activity_user_id_fkey' AND conrelid=to_regclass('public.user_activity')) THEN
    ALTER TABLE public.user_activity ADD CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_daily_insights_pkey' AND conrelid=to_regclass('public.user_daily_insights')) THEN
    ALTER TABLE public.user_daily_insights ADD CONSTRAINT user_daily_insights_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_daily_insights_user_id_key' AND conrelid=to_regclass('public.user_daily_insights')) THEN
    ALTER TABLE public.user_daily_insights ADD CONSTRAINT user_daily_insights_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_daily_insights_user_id_fkey' AND conrelid=to_regclass('public.user_daily_insights')) THEN
    ALTER TABLE public.user_daily_insights ADD CONSTRAINT user_daily_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profile(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_feedback_pkey' AND conrelid=to_regclass('public.user_feedback')) THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_feedback_feedback_type_check' AND conrelid=to_regclass('public.user_feedback')) THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['bug'::text, 'feature'::text, 'general'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_feedback_rating_check' AND conrelid=to_regclass('public.user_feedback')) THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_feedback_status_check' AND conrelid=to_regclass('public.user_feedback')) THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_status_check CHECK ((status = ANY (ARRAY['new'::text, 'reviewed'::text, 'resolved'::text, 'archived'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_feedback_user_id_fkey' AND conrelid=to_regclass('public.user_feedback')) THEN
    ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_preferences_pkey' AND conrelid=to_regclass('public.user_preferences')) THEN
    ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_preferences_calendar_view_check' AND conrelid=to_regclass('public.user_preferences')) THEN
    ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_calendar_view_check CHECK ((calendar_view = ANY (ARRAY['month'::text, 'week'::text, 'day'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_preferences_user_id_fkey' AND conrelid=to_regclass('public.user_preferences')) THEN
    ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profile_pkey' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT user_profile_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profile_user_id_key' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT user_profile_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='audience_location_type_check' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT audience_location_type_check CHECK (((audience_location_type = ANY (ARRAY['mostly_local'::text, 'mostly_online'::text, 'split_evenly'::text])) OR (audience_location_type IS NULL)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='business_primary_goal_check' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT business_primary_goal_check CHECK (((business_primary_goal = ANY (ARRAY['drive_sales'::text, 'increase_foot_traffic'::text, 'build_community'::text, 'grow_online_presence'::text, 'build_brand_awareness'::text, 'launch_product'::text, 'grow_local_following'::text, 'promote_events'::text])) OR (business_primary_goal IS NULL)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='creator_monetization_path_check' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT creator_monetization_path_check CHECK (((creator_monetization_path = ANY (ARRAY['brand_deals'::text, 'digital_products'::text, 'coaching'::text, 'affiliate'::text, 'community_membership'::text, 'not_yet_monetizing'::text])) OR (creator_monetization_path IS NULL)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='onboarding_branch_check' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT onboarding_branch_check CHECK (((onboarding_branch = ANY (ARRAY['brand_business'::text, 'solo_creator'::text])) OR (onboarding_branch IS NULL)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profile_audience_stage_check' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT user_profile_audience_stage_check CHECK (((audience_stage = ANY (ARRAY['early'::text, 'growing'::text, 'established'::text])) OR (audience_stage IS NULL)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profile_profile_type_check' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT user_profile_profile_type_check CHECK ((profile_type = ANY (ARRAY['brand_business'::text, 'solo_creator'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_profile_user_id_fkey' AND conrelid=to_regclass('public.user_profile')) THEN
    ALTER TABLE public.user_profile ADD CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_publishes_pkey' AND conrelid=to_regclass('public.user_publishes')) THEN
    ALTER TABLE public.user_publishes ADD CONSTRAINT user_publishes_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_publishes_platform_check' AND conrelid=to_regclass('public.user_publishes')) THEN
    ALTER TABLE public.user_publishes ADD CONSTRAINT user_publishes_platform_check CHECK ((platform = ANY (ARRAY['instagram'::text, 'facebook'::text, 'twitter'::text, 'tiktok'::text, 'youtube'::text])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_publishes_user_id_fkey' AND conrelid=to_regclass('public.user_publishes')) THEN
    ALTER TABLE public.user_publishes ADD CONSTRAINT user_publishes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_pkey' AND conrelid=to_regclass('public.users')) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
  END IF;
END
$$;

-- =========================================================================
-- 4. INDEXES  (non-constraint indexes; the five UNIQUE ones below were
-- hand-adjusted to add IF NOT EXISTS, since plain `replace()` in the
-- generating query does not catch CREATE UNIQUE INDEX)
-- =========================================================================

CREATE INDEX IF NOT EXISTS dm_leads_follow_up_idx ON public.dm_leads USING btree (follow_up_at, status);
CREATE INDEX IF NOT EXISTS dm_leads_status_idx ON public.dm_leads USING btree (status);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.user_activity USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_activity_feature ON public.user_activity USING btree (feature);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_content_type ON public.ai_analytics USING btree (content_type);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_success ON public.ai_analytics USING btree (success);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_timestamp ON public.ai_analytics USING btree ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_user_id ON public.ai_analytics USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_user_timestamp ON public.ai_analytics USING btree (user_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_api_rate_limit_updated_at ON public.api_rate_limit_counters USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_bonus_ledger_user_created ON public.bonus_credit_ledger USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_created_at ON public.cancellation_feedback USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_reason ON public.cancellation_feedback USING btree (cancellation_reason);
CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_tier ON public.cancellation_feedback USING btree (subscription_tier);
CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_user_id ON public.cancellation_feedback USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_content_collection_items_content_item_id ON public.content_collection_items USING btree (content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_collections_created_at ON public.content_collections USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_collections_user_id ON public.content_collections USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_created_at ON public.content_library USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_library_plan_id ON public.content_library USING btree (plan_id) WHERE (plan_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_content_library_project_id ON public.content_library USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_content_library_tool_name ON public.content_library USING btree (tool_name);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON public.content_library USING btree (type);
CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON public.content_library USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON public.generated_content USING btree (type);
CREATE INDEX IF NOT EXISTS idx_daily_dashboard_cache_user_date ON public.daily_dashboard_cache USING btree (user_id, generated_date);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_user_date ON public.daily_dashboard_cache USING btree (user_id, generated_date);
CREATE INDEX IF NOT EXISTS idx_forecasts_expires ON public.trend_forecasts USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON public.generated_content USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_job_notifications_job_id ON public.job_notifications USING btree (job_id);
CREATE INDEX IF NOT EXISTS idx_job_notifications_read ON public.job_notifications USING btree (read);
CREATE INDEX IF NOT EXISTS idx_job_notifications_user_id ON public.job_notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs USING btree (type);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_created ON public.n8n_post_queue USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_scheduled ON public.n8n_post_queue USING btree (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_status ON public.n8n_post_queue USING btree (status);
CREATE INDEX IF NOT EXISTS idx_n8n_post_queue_user_id ON public.n8n_post_queue USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_niche_cache_date_feature ON public.niche_content_cache USING btree (cache_date, feature);
CREATE INDEX IF NOT EXISTS idx_niche_cache_expires ON public.niche_content_cache USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_niche_cache_key ON public.niche_content_cache USING btree (cache_key);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications USING btree (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_post_kit_slots_kit_id ON public.post_kit_slots USING btree (kit_id);
CREATE INDEX IF NOT EXISTS idx_post_kits_platform ON public.post_kits USING btree (platform);
CREATE INDEX IF NOT EXISTS idx_post_kits_user_id ON public.post_kits USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON public.scheduled_posts USING btree (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON public.scheduled_posts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_timezone ON public.scheduled_posts USING btree (timezone);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_posts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON public.scheduled_posts USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS idx_smart_calendar_user_id ON public.smart_calendar USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_connected ON public.social_connections USING btree (is_connected);
CREATE INDEX IF NOT EXISTS idx_social_connections_platform ON public.social_connections USING btree (platform);
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON public.social_connections USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_social_updates_batch ON public.social_updates USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_social_updates_expires_at ON public.social_updates USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_social_updates_fetched ON public.social_updates USING btree (fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_updates_platform ON public.social_updates USING btree (platform);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_updates_unique_title_platform ON public.social_updates USING btree (lower(TRIM(BOTH FROM COALESCE(update_title, ''::text))), lower(TRIM(BOTH FROM COALESCE(platform, ''::text))));
CREATE INDEX IF NOT EXISTS idx_subscriptions_bonus_expires ON public.subscriptions USING btree (user_id, bonus_expires_at) WHERE (bonus_generations > 0);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions USING btree (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions USING btree (trial_end) WHERE (status = 'trialing'::text);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_trend_forecasts_user_id ON public.trend_forecasts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_trial_email_reminders_user_id ON public.trial_email_reminders USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_feature_created ON public.user_activity USING btree (user_id, feature, created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_insights_user_id ON public.user_daily_insights USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON public.user_feedback USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback USING btree (status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback USING btree (feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_creator_archetype ON public.user_profile USING btree (creator_archetype);
CREATE INDEX IF NOT EXISTS idx_user_profile_niche ON public.user_profile USING btree (niche);
CREATE INDEX IF NOT EXISTS idx_user_profile_profile_type ON public.user_profile USING btree (profile_type);
CREATE INDEX IF NOT EXISTS idx_user_profile_quiz_completed ON public.user_profile USING btree (quiz_completed_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profile_stripe_customer_unique ON public.user_profile USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON public.user_profile USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_publishes_platform ON public.user_publishes USING btree (platform);
CREATE INDEX IF NOT EXISTS idx_user_publishes_published_at ON public.user_publishes USING btree (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_publishes_user_id ON public.user_publishes USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS niche_content_cache_shared_cache_key_idx ON public.niche_content_cache USING btree (cache_key) WHERE (user_id IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS niche_content_cache_user_cache_key_idx ON public.niche_content_cache USING btree (cache_key, user_id) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_unique ON public.subscriptions USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);

-- =========================================================================
-- 5. ROW LEVEL SECURITY  (flags only; POLICIES are created by later
-- migrations and intentionally not duplicated here)
-- =========================================================================

ALTER TABLE public.ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limit_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_kit_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_email_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_publishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
