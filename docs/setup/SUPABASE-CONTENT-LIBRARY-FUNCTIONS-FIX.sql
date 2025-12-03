-- Fix remaining 4 content library functions

-- Fix 1: update_content_library_updated_at
CREATE OR REPLACE FUNCTION update_content_library_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 2: update_storage_on_insert
CREATE OR REPLACE FUNCTION update_storage_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type != 'text' AND NEW.size_bytes > 0 THEN
    UPDATE public.users
    SET storage_used_bytes = COALESCE(storage_used_bytes, 0) + NEW.size_bytes
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 3: update_storage_on_delete
CREATE OR REPLACE FUNCTION update_storage_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.type != 'text' AND OLD.size_bytes > 0 THEN
    UPDATE public.users
    SET storage_used_bytes = GREATEST(COALESCE(storage_used_bytes, 0) - OLD.size_bytes, 0)
    WHERE id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;

-- Fix 4: update_storage_on_update
CREATE OR REPLACE FUNCTION update_storage_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  size_diff BIGINT;
BEGIN
  IF OLD.type != 'text' AND NEW.type != 'text' THEN
    size_diff := NEW.size_bytes - COALESCE(OLD.size_bytes, 0);
    
    IF size_diff != 0 THEN
      UPDATE public.users
      SET storage_used_bytes = GREATEST(COALESCE(storage_used_bytes, 0) + size_diff, 0)
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

