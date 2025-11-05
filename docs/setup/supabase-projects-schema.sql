-- ============================================
-- PROJECTS TABLE SCHEMA FOR CONTENT LIBRARY
-- ============================================
-- This schema adds project management functionality to the Content Library
-- Projects help organize content items into named collections with custom colors

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT projects_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Create index for faster user project lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
-- Users can only see their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own projects
CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- UPDATE CONTENT_LIBRARY TABLE
-- ============================================
-- Add foreign key constraint to content_library table if it exists
-- This ensures content items can reference projects

-- Only run if content_library table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'content_library') THEN
    -- Add foreign key if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'content_library_project_id_fkey' 
      AND table_name = 'content_library'
    ) THEN
      ALTER TABLE content_library
        ADD CONSTRAINT content_library_project_id_fkey 
        FOREIGN KEY (project_id) 
        REFERENCES projects(id) 
        ON DELETE SET NULL;
    END IF;

    -- Add index for project lookups if not exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_content_library_project_id'
    ) THEN
      CREATE INDEX idx_content_library_project_id ON content_library(project_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS (OPTIONAL)
-- ============================================

-- Function to get project content counts
CREATE OR REPLACE FUNCTION get_project_content_counts(p_user_id UUID)
RETURNS TABLE(project_id UUID, content_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.project_id,
    COUNT(*) as content_count
  FROM content_library cl
  WHERE cl.user_id = p_user_id AND cl.project_id IS NOT NULL
  GROUP BY cl.project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete project and unassign content
CREATE OR REPLACE FUNCTION delete_project_and_unassign_content(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  -- Unassign all content from this project
  UPDATE content_library
  SET project_id = NULL
  WHERE project_id = p_project_id AND user_id = p_user_id;

  -- Delete the project
  DELETE FROM projects
  WHERE id = p_project_id AND user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================
-- Uncomment to insert sample projects for testing
/*
INSERT INTO projects (user_id, name, description, color) VALUES
  ('your-user-id-here', 'Summer Campaign 2024', 'Content for summer marketing campaign', '#f97316'),
  ('your-user-id-here', 'Product Launch', 'Assets for new product launch', '#10b981'),
  ('your-user-id-here', 'Brand Assets', 'Logo, colors, and brand guidelines', '#6366f1');
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup

-- Check if projects table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'projects'
);

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- Count projects by user (replace with actual user_id)
-- SELECT user_id, COUNT(*) as project_count 
-- FROM projects 
-- GROUP BY user_id;

