-- Fix script to change map_files.created_by from VARCHAR to INTEGER
-- This will fix the foreign key constraint issue

-- First, let's see what we're working with
SELECT 'Current map_files schema:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'map_files' AND column_name = 'created_by';

-- Check if there are any existing values that can't be converted
SELECT 'Non-numeric created_by values:' as info;
SELECT created_by, COUNT(*) as count 
FROM map_files 
WHERE created_by !~ '^[0-9]+$'
GROUP BY created_by;

-- Step 1: Drop the foreign key constraint first
ALTER TABLE map_files DROP CONSTRAINT IF EXISTS map_files_created_by_fkey;

-- Step 2: Update any non-numeric values to NULL (or a default user ID)
-- First, let's see what the max user ID is
SELECT 'Max user ID:' as info;
SELECT MAX(id) as max_user_id FROM users;

-- Update non-numeric values to NULL (we'll handle them later)
UPDATE map_files 
SET created_by = NULL 
WHERE created_by !~ '^[0-9]+$';

-- Step 3: Change the column type to INTEGER
ALTER TABLE map_files 
ALTER COLUMN created_by TYPE INTEGER 
USING created_by::INTEGER;

-- Step 4: Recreate the foreign key constraint
ALTER TABLE map_files 
ADD CONSTRAINT map_files_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id);

-- Step 5: Update NULL values to a default user (if any exist)
-- This assumes there's at least one user in the system
UPDATE map_files 
SET created_by = (SELECT id FROM users LIMIT 1)
WHERE created_by IS NULL;

-- Verify the fix
SELECT 'After fix - map_files schema:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'map_files' AND column_name = 'created_by';

SELECT 'Sample map_files data:' as info;
SELECT id, map_id, created_by FROM map_files LIMIT 5;
