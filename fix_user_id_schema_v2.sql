-- Fix user_id schema by dropping policies first, then altering columns
-- This fixes the RLS policy dependency issue

-- Step 1: Drop all RLS policies that depend on created_by column
DROP POLICY IF EXISTS "Authenticated users can create maps" ON public.maps;
DROP POLICY IF EXISTS "Users can view their own maps" ON public.maps;
DROP POLICY IF EXISTS "Users can update their own maps" ON public.maps;
DROP POLICY IF EXISTS "Users can delete their own maps" ON public.maps;
DROP POLICY IF EXISTS "Admin users can manage all maps" ON public.maps;

-- Drop policies on other tables
DROP POLICY IF EXISTS "Users can view their own files" ON public.map_files;
DROP POLICY IF EXISTS "Users can manage their own files" ON public.map_files;
DROP POLICY IF EXISTS "Users can view their own previews" ON public.preview_images;
DROP POLICY IF EXISTS "Users can manage their own previews" ON public.preview_images;

-- Step 2: Add clerk_id column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

-- Step 3: Alter created_by columns to TEXT
ALTER TABLE public.maps 
ALTER COLUMN created_by TYPE TEXT;

ALTER TABLE public.map_files 
ALTER COLUMN created_by TYPE TEXT;

ALTER TABLE public.preview_images 
ALTER COLUMN created_by TYPE TEXT;

-- Step 4: Recreate RLS policies with updated column types
-- Maps table policies
CREATE POLICY "Authenticated users can create maps" ON public.maps
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own maps" ON public.maps
    FOR SELECT USING (created_by = auth.uid()::text);

CREATE POLICY "Users can update their own maps" ON public.maps
    FOR UPDATE USING (created_by = auth.uid()::text);

CREATE POLICY "Users can delete their own maps" ON public.maps
    FOR DELETE USING (created_by = auth.uid()::text);

CREATE POLICY "Admin users can manage all maps" ON public.maps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE clerk_id = auth.uid()::text 
            AND is_admin = true
        )
    );

-- Map files policies
CREATE POLICY "Users can view their own files" ON public.map_files
    FOR SELECT USING (created_by = auth.uid()::text);

CREATE POLICY "Users can manage their own files" ON public.map_files
    FOR ALL USING (created_by = auth.uid()::text);

-- Preview images policies
CREATE POLICY "Users can view their own previews" ON public.preview_images
    FOR SELECT USING (created_by = auth.uid()::text);

CREATE POLICY "Users can manage their own previews" ON public.preview_images
    FOR ALL USING (created_by = auth.uid()::text);

-- Step 5: Update any existing data to use clerk_id
-- This will need to be done manually for existing users
