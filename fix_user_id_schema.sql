-- Fix user_id to use TEXT instead of INTEGER
-- This allows Clerk UUID strings to work properly

-- First, let's check what the current schema looks like
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public';

-- If users.id is INTEGER, we need to change it to TEXT
-- This is a complex operation, so let's create a new approach

-- Option 1: Add a new clerk_id column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;

-- Update the maps table to reference clerk_id instead of created_by
-- First, let's see what the current maps table looks like
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'maps' AND table_schema = 'public';

-- If maps.created_by is INTEGER, we need to change it to TEXT
ALTER TABLE public.maps 
ALTER COLUMN created_by TYPE TEXT;

-- Update map_files table
ALTER TABLE public.map_files 
ALTER COLUMN created_by TYPE TEXT;

-- Update preview_images table  
ALTER TABLE public.preview_images 
ALTER COLUMN created_by TYPE TEXT;

-- Update map_metadata table if it exists
ALTER TABLE public.map_metadata 
ALTER COLUMN created_by TYPE TEXT;

-- Now we can insert users with Clerk IDs
-- The users table will have both id (integer) and clerk_id (text)
-- Maps will reference clerk_id instead of id
