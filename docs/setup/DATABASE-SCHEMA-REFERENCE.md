# Content Library Database Schema Reference

Quick reference guide for the Content Library database structure.

---

## 📊 Database Tables

### 1. `projects` Table

Stores user-created projects for organizing content.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique project identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the project |
| `name` | VARCHAR(50) | NOT NULL, CHECK length > 0 | Project name (max 50 chars) |
| `description` | TEXT | NULLABLE | Optional project description |
| `color` | VARCHAR(7) | DEFAULT '#6366f1', CHECK format | Hex color code for UI |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | When project was created |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_projects_user_id` on `user_id`
- `idx_projects_created_at` on `created_at DESC`

**RLS Policies:**
- Users can SELECT their own projects
- Users can INSERT their own projects
- Users can UPDATE their own projects
- Users can DELETE their own projects

---

### 2. `content_library` Table

Stores all content items (text, images, videos).

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique content identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the content |
| `name` | VARCHAR(255) | NOT NULL | Content name/title |
| `type` | VARCHAR(20) | NOT NULL, CHECK IN ('text', 'image', 'video') | Content type |
| `content` | TEXT | NULLABLE | Text content (for type='text') |
| `storage_path` | TEXT | NULLABLE | Path in Supabase Storage (for files) |
| `url` | TEXT | NULLABLE | Kept for compatibility (private bucket uses signed URLs) |
| `size_bytes` | BIGINT | DEFAULT 0 | File size in bytes (0 for text) |
| `project_id` | UUID | NULLABLE, REFERENCES projects(id) ON DELETE SET NULL | Assigned project |
| `description` | TEXT | NULLABLE | Optional description |
| `metadata` | JSONB | NULLABLE | Extra data (compression stats, etc.) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | When content was created |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_content_library_user_id` on `user_id`
- `idx_content_library_type` on `type`
- `idx_content_library_project_id` on `project_id`
- `idx_content_library_created_at` on `created_at DESC`

**RLS Policies:**
- Users can SELECT their own content
- Users can INSERT their own content
- Users can UPDATE their own content
- Users can DELETE their own content

**Foreign Keys:**
- `project_id` → `projects(id)` ON DELETE SET NULL
  - When project is deleted, content remains but `project_id` becomes NULL

---

### 3. `users` Table (Extension)

Existing table with added column for storage tracking.

**New Column:**
| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `storage_used_bytes` | BIGINT | DEFAULT 0 | Total storage used by user |

**Triggers:**
- `update_user_storage_trigger` - Automatically updates `storage_used_bytes` when content is added/deleted

---

## 🗂️ Storage Structure

### Bucket: `content-library`

**Configuration:**
- **Type**: Private bucket
- **Access**: Signed URLs only
- **File Size Limit**: 500MB (configurable)
- **Allowed Types**: All (or specify image/*, video/*)

**Folder Structure:**
```
content-library/
├── {user_id_1}/
│   ├── {timestamp1}-{filename1}.jpg
│   ├── {timestamp2}-{filename2}.mp4
│   └── {timestamp3}-{filename3}.png
├── {user_id_2}/
│   ├── {timestamp1}-{filename1}.jpg
│   └── ...
└── ...
```

**Storage Policies:**
```sql
-- Upload (INSERT)
bucket_id = 'content-library' AND
(storage.foldername(name))[1] = auth.uid()::text

-- View (SELECT)
bucket_id = 'content-library' AND
(storage.foldername(name))[1] = auth.uid()::text

-- Delete
bucket_id = 'content-library' AND
(storage.foldername(name))[1] = auth.uid()::text
```

---

## 🔗 Relationships

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌──────────────────┐
│  projects   │   │ content_library  │
└──────┬──────┘   └────────┬─────────┘
       │                   │
       └───────────────────┘
         (project_id FK)
```

**Cascade Behavior:**
- Delete `user` → Deletes all `projects` and `content_library` items
- Delete `project` → Sets `content_library.project_id` to NULL (content remains)
- Delete `content_library` → Deletes file from storage (if exists)

---

## 📈 Tier Limits

Configured in `src/config/supabase.js`:

| Tier | Storage Limit | Bytes |
|------|--------------|-------|
| Free | 100 MB | 104,857,600 |
| Essentials | 250 MB | 262,144,000 |
| Pro | 500 MB | 524,288,000 |

**Compression Settings:**

| Tier | Max Size | Max Dimension |
|------|----------|---------------|
| Free | 0.5 MB | 1280px |
| Essentials | 1 MB | 1920px |
| Pro | 2 MB | 2560px |

---

## 🔧 Helper Functions

### `get_project_content_counts(p_user_id UUID)`

Returns content count for each project.

**Returns:**
```sql
TABLE(project_id UUID, content_count BIGINT)
```

**Usage:**
```sql
SELECT * FROM get_project_content_counts('user-id-here');
```

---

### `delete_project_and_unassign_content(p_project_id UUID, p_user_id UUID)`

Safely deletes a project after unassigning all content.

**Returns:** `BOOLEAN`

**Usage:**
```sql
SELECT delete_project_and_unassign_content('project-id', 'user-id');
```

---

### `update_user_storage()`

Trigger function that automatically updates user storage when content changes.

**Called by:** `update_user_storage_trigger`

**Logic:**
- INSERT: `storage_used_bytes += NEW.size_bytes`
- DELETE: `storage_used_bytes -= OLD.size_bytes`
- UPDATE: `storage_used_bytes = storage_used_bytes - OLD.size_bytes + NEW.size_bytes`

---

### `update_updated_at_column()`

Trigger function that automatically updates `updated_at` timestamp.

**Called by:** `update_projects_updated_at`

**Applied to:** `projects` table

---

## 📊 Useful Queries

### Get User Storage Summary
```sql
SELECT 
  u.email,
  u.storage_used_bytes / (1024 * 1024) as storage_mb,
  COUNT(cl.id) as total_content,
  COUNT(DISTINCT cl.project_id) as total_projects,
  COUNT(CASE WHEN cl.type = 'image' THEN 1 END) as images,
  COUNT(CASE WHEN cl.type = 'video' THEN 1 END) as videos,
  COUNT(CASE WHEN cl.type = 'text' THEN 1 END) as text_items
FROM users u
LEFT JOIN content_library cl ON u.id = cl.user_id
WHERE u.id = 'user-id-here'
GROUP BY u.id, u.email, u.storage_used_bytes;
```

### Get Project Details with Content
```sql
SELECT 
  p.name as project_name,
  p.color,
  COUNT(cl.id) as content_count,
  SUM(cl.size_bytes) / (1024 * 1024) as total_size_mb,
  COUNT(CASE WHEN cl.type = 'image' THEN 1 END) as images,
  COUNT(CASE WHEN cl.type = 'video' THEN 1 END) as videos,
  COUNT(CASE WHEN cl.type = 'text' THEN 1 END) as text_items
FROM projects p
LEFT JOIN content_library cl ON p.id = cl.project_id
WHERE p.user_id = 'user-id-here'
GROUP BY p.id, p.name, p.color
ORDER BY content_count DESC;
```

### Find Large Files
```sql
SELECT 
  name,
  type,
  size_bytes / (1024 * 1024) as size_mb,
  p.name as project_name,
  created_at
FROM content_library cl
LEFT JOIN projects p ON cl.project_id = p.id
WHERE cl.user_id = 'user-id-here'
  AND cl.size_bytes > 0
ORDER BY cl.size_bytes DESC
LIMIT 10;
```

### Check Storage vs Limit
```sql
SELECT 
  u.email,
  u.storage_used_bytes / (1024 * 1024) as used_mb,
  s.tier,
  CASE 
    WHEN s.tier = 'free' THEN 100
    WHEN s.tier = 'essentials' THEN 250
    WHEN s.tier = 'pro' THEN 500
  END as limit_mb,
  ROUND(
    (u.storage_used_bytes::numeric / (1024 * 1024)) / 
    CASE 
      WHEN s.tier = 'free' THEN 100
      WHEN s.tier = 'essentials' THEN 250
      WHEN s.tier = 'pro' THEN 500
    END * 100, 
    2
  ) as percent_used
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.id = 'user-id-here';
```

### Unassigned Content
```sql
SELECT 
  name,
  type,
  size_bytes / (1024 * 1024) as size_mb,
  created_at
FROM content_library
WHERE user_id = 'user-id-here'
  AND project_id IS NULL
ORDER BY created_at DESC;
```

---

## 🛡️ Security Considerations

### Row Level Security (RLS)
- ✅ Enabled on all tables
- ✅ Users can only access their own data
- ✅ Policies checked on every query
- ✅ No way to bypass (enforced at database level)

### Storage Security
- ✅ Private bucket (not publicly accessible)
- ✅ Signed URLs expire after 1 hour
- ✅ User-specific folders enforced by policies
- ✅ File size limits prevent abuse

### Input Validation
- ✅ CHECK constraints on database
- ✅ Client-side validation before submission
- ✅ Type checking (enum for content types)
- ✅ Character limits enforced

---

## 🔄 Data Lifecycle

### Content Creation
1. File uploaded to Storage → `storage_path` stored
2. Metadata saved to `content_library` table
3. `storage_used_bytes` automatically updated via trigger
4. Signed URL generated on-demand for display

### Content Update
1. Metadata updated in `content_library`
2. `updated_at` timestamp automatically updated
3. If file replaced, old file deleted from Storage

### Content Deletion
1. File deleted from Storage (if exists)
2. Row deleted from `content_library`
3. `storage_used_bytes` automatically reduced via trigger
4. If it was in a project, project count updates

### Project Deletion
1. All content `project_id` set to NULL
2. Project row deleted
3. Content remains in library

---

## 📝 Maintenance

### Regular Tasks
- Monitor storage usage per user
- Clean up orphaned files in Storage
- Archive old projects (if feature added)
- Optimize indexes based on query patterns

### Backup Strategy
- Supabase handles automatic backups
- Consider additional backups of critical data
- Test restore procedures periodically

### Performance Tuning
- Monitor slow queries
- Add indexes as needed
- Consider partitioning for large datasets
- Review and optimize RLS policies

---

## 🆘 Troubleshooting

### Storage not updating
```sql
-- Recalculate storage for a user
UPDATE users
SET storage_used_bytes = (
  SELECT COALESCE(SUM(size_bytes), 0)
  FROM content_library
  WHERE user_id = users.id
)
WHERE id = 'user-id-here';
```

### Find orphaned files
```sql
-- Files in database without Storage files (check manually)
SELECT id, name, storage_path
FROM content_library
WHERE storage_path IS NOT NULL
  AND type IN ('image', 'video');
```

### Reset project counts
```sql
-- Project counts are calculated in real-time
-- No stored counts to reset
SELECT project_id, COUNT(*) 
FROM content_library 
WHERE user_id = 'user-id-here'
GROUP BY project_id;
```

---

This schema is designed for scalability, security, and data integrity while providing excellent performance for typical usage patterns.

