# 🔧 Fix Onboarding Quiz - Missing Database Columns

## 🚨 Problem
When completing the onboarding quiz, you get this error:
```
Could not find the 'content_strengths' column of 'user_profile' in the schema cache
```

This happens because your Supabase database is missing some columns that the onboarding quiz tries to save.

---

## ⚡ Super Quick Fix (Copy & Paste)

**If you just want to fix it fast, do this:**

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Copy and paste the migration from `supabase/migrations/add_viral_content_fields.sql`
3. Click **Run**
4. Refresh your app and try again ✅

**OR** keep reading for the detailed step-by-step guide below.

---

---

## ✅ Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Check Your Database Status

**Option 1: Quick Check**

Run this simple query to see if the table exists:

```sql
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'user_profile'
);
```

- If it returns `true`: Go to **Option A** (table exists, just needs new columns)
- If it returns `false`: Go to **Option B** (table doesn't exist, create it)

**Option 2: Detailed Check (Recommended)**

For a comprehensive check of your database, run the verification script:

1. Open the file: `verify-database-schema.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**

This will show you:
- ✅ Which tables exist
- ❌ Which columns are missing
- 📋 Detailed recommendations on what to fix

Then follow the recommendations in the output.

---

## Option A: Table Exists - Add Missing Columns

If the `user_profile` table already exists, run this migration to add the missing columns:

Copy and paste this SQL into the editor and click **Run**:

```sql
-- Add missing viral content strategy fields to user_profile table

-- Add content_strengths column (array of text)
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS content_strengths TEXT[];

-- Add biggest_challenge column
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS biggest_challenge TEXT;

-- Add hook_style_preference column
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS hook_style_preference TEXT;

-- Add emotional_triggers column (array of text)
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS emotional_triggers TEXT[];

-- Add other potentially missing columns
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'brand';

ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS creator_archetype TEXT;

ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS brand_name TEXT;

ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profile_profile_type ON public.user_profile(profile_type);

-- Add comments for documentation
COMMENT ON COLUMN public.user_profile.content_strengths IS 'What user is best at: storytelling, education, entertainment, visuals, trends, authenticity';
COMMENT ON COLUMN public.user_profile.biggest_challenge IS 'Main content struggle: consistency, ideas, engagement, growth, time, quality';
COMMENT ON COLUMN public.user_profile.hook_style_preference IS 'Preferred hook style: question, bold_statement, story, statistic, controversy, curiosity_gap';
COMMENT ON COLUMN public.user_profile.emotional_triggers IS 'How they want audience to feel: inspired, entertained, educated, connected, motivated, understood';
```

---

## Option B: Table Doesn't Exist - Create It

If the `user_profile` table doesn't exist, you need to create it from scratch:

1. Open the file: `docs/setup/supabase-user-profile-schema.sql`
2. Copy the **entire contents** of that file
3. Paste it into the Supabase SQL Editor
4. Click **Run**

This will create the complete table with all columns, indexes, RLS policies, and triggers.

---

## Step 3: Verify the Fix

After running the SQL, verify that all columns exist by running this query:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profile'
ORDER BY ordinal_position;
```

You should see these columns in the results:
- `content_strengths` (ARRAY)
- `biggest_challenge` (text)
- `hook_style_preference` (text)
- `emotional_triggers` (ARRAY)
- `profile_type` (text)
- `creator_archetype` (text)
- `brand_name` (text)
- `industry` (text)
- ...and all the other user_profile columns

If you see all these columns, the fix is complete! ✅

Now:
1. Go back to your app
2. **Refresh the page** (important - clears the schema cache)
3. Try completing the onboarding quiz again
4. It should now work! ✅

---

## 🔍 What These Columns Do

These fields are used to personalize your AI-generated content:

- **`content_strengths`**: What you're best at (storytelling, education, entertainment, etc.)
- **`biggest_challenge`**: Your main content struggle (consistency, ideas, engagement, etc.)
- **`hook_style_preference`**: Your preferred hook style (question, bold statement, story, etc.)
- **`emotional_triggers`**: How you want your audience to feel (inspired, entertained, educated, etc.)

The AI tools use this information to generate content that matches your style and goals.

---

## 📝 Alternative: Run from File

If you prefer, you can also run the migration file directly:

1. Open the file: `supabase/migrations/add_viral_content_fields.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run**

---

## ❓ Troubleshooting

### "relation 'public.user_profile' does not exist"

This means the `user_profile` table hasn't been created yet. Run this first:

```sql
-- Run the complete user_profile schema
-- Copy contents from: docs/setup/supabase-user-profile-schema.sql
```

Then run the migration above.

### Still getting errors?

1. Check that you're connected to the correct Supabase project
2. Verify your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Try refreshing your browser to clear the schema cache
4. Check the browser console (F12) for more detailed error messages

---

## ✅ After the Fix

Once you've run the migration:

1. **Complete the onboarding quiz** - It should work now!
2. **Your profile data will be saved** - Including all your content preferences
3. **AI tools will be personalized** - Content will match your brand voice and style
4. **No more errors** - The onboarding flow will work smoothly

---

## 🎯 Next Steps

After fixing this issue, you might want to:

1. Complete the onboarding quiz to set up your profile
2. Explore the AI Power Tools with your personalized settings
3. Try the Trend Lab to discover trending topics in your niche
4. Create your first post with AI-generated content

Need help? Check the other documentation files in the `docs/` folder!

