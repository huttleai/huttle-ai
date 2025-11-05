# Content Library with Projects - Complete Setup Guide

This guide provides step-by-step instructions for setting up the enhanced Content Library with project management functionality.

## 🎯 Features Implemented

### User Workflow
1. **Create Projects**: Users can create named projects with custom colors and descriptions
2. **Upload Content**: Upload text ideas (hashtags, keywords), images, and videos
3. **Organize Content**: Assign content to projects during upload or after
4. **Edit & Manage**: 
   - Edit project names, descriptions, and colors
   - Remove content from projects (content stays in library)
   - Delete content permanently (with confirmation)
   - Delete projects (content moves to "All Content")
5. **Download Content**: Easy download of content on desktop and mobile
6. **Storage Management**: Tier-based storage limits with compression

### UI/UX Enhancements
- ✨ Beautiful, professional modal designs
- 🎨 Custom color selection for projects
- ⚠️ Clear delete confirmations with explicit warnings
- 📱 Fully responsive (desktop and mobile)
- 🔄 Smooth animations and transitions
- 💾 Real-time storage usage tracking
- 🎨 Color-coded project filters

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Supabase account and project created
- ✅ `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- ✅ Node.js and npm installed
- ✅ Authentication system in place (Supabase Auth or custom)

---

## 🗄️ Database Setup

### Step 1: Create Content Library Table (if not exists)

Run this SQL in your Supabase SQL Editor:

```sql
-- Create content_library table
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image', 'video')),
  content TEXT, -- For text content
  storage_path TEXT, -- For images/videos in Storage
  url TEXT, -- Kept for compatibility, but private bucket uses signed URLs
  size_bytes BIGINT DEFAULT 0,
  project_id UUID, -- Foreign key to projects (added later)
  description TEXT,
  metadata JSONB, -- For compression stats, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(type);
CREATE INDEX IF NOT EXISTS idx_content_library_created_at ON content_library(created_at DESC);

-- Enable RLS
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own content"
  ON content_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own content"
  ON content_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content"
  ON content_library FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own content"
  ON content_library FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 2: Create Projects Table

Run the `supabase-projects-schema.sql` file in your Supabase SQL Editor:

```bash
# Copy the entire content of supabase-projects-schema.sql and paste it into Supabase SQL Editor
```

This will:
- ✅ Create the `projects` table
- ✅ Add foreign key constraint to `content_library`
- ✅ Set up RLS policies
- ✅ Create indexes for performance
- ✅ Add helper functions and triggers

### Step 3: Update Users Table (for storage tracking)

```sql
-- Add storage_used_bytes column to users table if not exists
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- Create trigger to update storage when content is added/deleted
CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users 
    SET storage_used_bytes = storage_used_bytes + NEW.size_bytes
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users 
    SET storage_used_bytes = storage_used_bytes - OLD.size_bytes
    WHERE id = OLD.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE users 
    SET storage_used_bytes = storage_used_bytes - OLD.size_bytes + NEW.size_bytes
    WHERE id = NEW.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_user_storage_trigger ON content_library;
CREATE TRIGGER update_user_storage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage();
```

---

## 🗂️ Storage Setup

### Step 1: Create Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name**: `content-library`
   - **Public**: ❌ **UNCHECKED** (private bucket for security)
   - **File size limit**: 500MB (adjust as needed)
   - **Allowed MIME types**: Leave empty or specify (image/*, video/*)
4. Click **"Create bucket"**

### Step 2: Set Storage Policies

In your Supabase SQL Editor, run:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own content"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'content-library' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own content
CREATE POLICY "Users can view own content"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content-library' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own content
CREATE POLICY "Users can delete own content"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'content-library' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Note**: Files are stored at path: `{user_id}/{timestamp}-{filename}`

---

## 📦 Install Dependencies

```bash
npm install browser-image-compression
```

This package is used for client-side image compression to maximize user storage.

---

## ⚙️ Configuration

### Environment Variables

Ensure your `.env` file has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Tier Limits

Storage limits are configured in `src/config/supabase.js`:

```javascript
export const TIER_LIMITS = {
  free: {
    storageLimit: 100 * 1024 * 1024, // 100MB
    // ... other limits
  },
  essentials: {
    storageLimit: 250 * 1024 * 1024, // 250MB
    // ... other limits
  },
  pro: {
    storageLimit: 500 * 1024 * 1024, // 500MB
    // ... other limits
  },
};
```

### Image Compression Settings

Compression settings are in `src/utils/imageCompression.js`:

```javascript
export const compressionSettings = {
  free: {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1280,
  },
  essentials: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
  },
  pro: {
    maxSizeMB: 2,
    maxWidthOrHeight: 2560,
  },
};
```

---

## 🚀 Testing the Setup

### 1. Test Project Creation

1. Navigate to Content Library
2. Click **"New Project"** button
3. Fill in:
   - Name: "Test Project"
   - Description: "Testing project functionality"
   - Select a color
4. Click **"Create Project"**
5. ✅ Verify project appears in filter bar

### 2. Test Content Upload

1. Click **"Upload Content"** button
2. Select content type (Image/Video/Text)
3. Fill in details and select your test project
4. Click **"Upload"**
5. ✅ Verify:
   - Content appears in library
   - Storage meter updates
   - Content is assigned to project

### 3. Test Project Management

1. **Edit Project**: Hover over project → Click edit icon
2. **Delete Project**: Hover over project → Click delete icon → Confirm
3. ✅ Verify:
   - Changes persist after refresh
   - Content remains in library after project deletion

### 4. Test Content Management

1. Click on a content item
2. Test:
   - ✅ Download
   - ✅ Edit (for text)
   - ✅ Remove from Project
   - ✅ Change Project
   - ✅ Delete Permanently
3. ✅ Verify delete confirmation shows clear warning

### 5. Test Storage Limits

1. Try uploading content when near storage limit
2. ✅ Verify:
   - Warning appears at 90%
   - Upload blocked at 100%
   - Upgrade modal shows

---

## 🎨 UI Components Created

### 1. CreateProjectModal
- Beautiful gradient design
- Color picker with 10 colors
- Live preview
- Character limits
- Form validation

### 2. DeleteConfirmationModal
- Clear warning messages
- Different styles for content vs. project deletion
- Explicit "cannot be undone" messaging
- Loading states

### 3. Enhanced ContentLibrary
- Project filter bar with color coding
- Edit/Delete icons on hover
- "Remove from Project" button
- "Change Project" vs "Add to Project" labels
- Improved delete button styling

---

## 🔍 Troubleshooting

### Issue: Storage policies not working

**Solution**: Ensure you're using Supabase Auth and `auth.uid()` matches your user IDs.

### Issue: Images not loading

**Solution**: Check that:
1. Bucket is created
2. Signed URL generation is working
3. Storage policies are set correctly

### Issue: Projects not loading

**Solution**: 
1. Verify `projects` table exists
2. Check RLS policies
3. Ensure foreign key constraint is added to `content_library`

### Issue: Storage not updating

**Solution**:
1. Verify `storage_used_bytes` column exists in `users` table
2. Check that trigger `update_user_storage_trigger` is created
3. Test manually updating a content item

---

## 📊 Monitoring

### Check Storage Usage

```sql
SELECT 
  u.email,
  u.storage_used_bytes / (1024 * 1024) as storage_mb,
  COUNT(cl.id) as content_count,
  COUNT(DISTINCT cl.project_id) as project_count
FROM users u
LEFT JOIN content_library cl ON u.id = cl.user_id
GROUP BY u.id, u.email, u.storage_used_bytes;
```

### Check Project Statistics

```sql
SELECT 
  p.name,
  COUNT(cl.id) as content_count,
  SUM(cl.size_bytes) / (1024 * 1024) as total_size_mb
FROM projects p
LEFT JOIN content_library cl ON p.id = cl.project_id
GROUP BY p.id, p.name
ORDER BY content_count DESC;
```

---

## 🎉 Success!

Your Content Library with Projects is now fully set up! Users can:

- ✅ Create and manage projects
- ✅ Upload and organize content
- ✅ Download content easily
- ✅ Manage storage within tier limits
- ✅ Get clear warnings before deletions
- ✅ Enjoy a beautiful, professional UI

## 📝 Next Steps

Consider adding:
- [ ] Bulk actions (select multiple items)
- [ ] Project templates
- [ ] Content sharing between users
- [ ] Advanced search and filters
- [ ] Tags and categories
- [ ] Project archiving
- [ ] Export project as ZIP

---

**Need help?** Check the code comments in:
- `src/config/supabase.js` - Database functions
- `src/pages/ContentLibrary.jsx` - Main component
- `src/components/CreateProjectModal.jsx` - Project modal
- `src/components/DeleteConfirmationModal.jsx` - Delete modal
