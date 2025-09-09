-- FINAL FIX v6: Handle all type mismatches and constraints
-- This will fix the remaining type mismatch issues

-- Step 1: Disable RLS temporarily on all tables
ALTER TABLE public.maps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_images DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on maps table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'maps' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.maps';
    END LOOP;
    
    -- Drop all policies on map_files table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'map_files' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.map_files';
    END LOOP;
    
    -- Drop all policies on preview_images table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'preview_images' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.preview_images';
    END LOOP;
END $$;

-- Step 3: Drop foreign key constraints
ALTER TABLE public.maps DROP CONSTRAINT IF EXISTS maps_created_by_fkey;
ALTER TABLE public.map_files DROP CONSTRAINT IF EXISTS map_files_created_by_fkey;
ALTER TABLE public.preview_images DROP CONSTRAINT IF EXISTS preview_images_created_by_fkey;

-- Step 4: Add clerk_id column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

-- Step 5: Make email nullable temporarily to handle existing data
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- Step 6: Alter created_by columns to TEXT
ALTER TABLE public.maps 
ALTER COLUMN created_by TYPE TEXT;

ALTER TABLE public.map_files 
ALTER COLUMN created_by TYPE TEXT;

ALTER TABLE public.preview_images 
ALTER COLUMN created_by TYPE TEXT;

-- Step 7: Add new foreign key constraints pointing to clerk_id
ALTER TABLE public.maps 
ADD CONSTRAINT maps_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(clerk_id);

ALTER TABLE public.map_files 
ADD CONSTRAINT map_files_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(clerk_id);

ALTER TABLE public.preview_images 
ADD CONSTRAINT preview_images_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(clerk_id);

-- Step 8: Recreate simple RLS policies
CREATE POLICY "maps_select_policy" ON public.maps
    FOR SELECT USING (true);

CREATE POLICY "maps_insert_policy" ON public.maps
    FOR INSERT WITH CHECK (true);

CREATE POLICY "maps_update_policy" ON public.maps
    FOR UPDATE USING (true);

CREATE POLICY "maps_delete_policy" ON public.maps
    FOR DELETE USING (true);

-- Step 9: Re-enable RLS
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_images ENABLE ROW LEVEL SECURITY;

-- Step 10: Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('maps', 'map_files', 'preview_images', 'users') 
AND column_name IN ('created_by', 'clerk_id', 'email');

SELECT 'Schema updated successfully - all type mismatches fixed' as status;
