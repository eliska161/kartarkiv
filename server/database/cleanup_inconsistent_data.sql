-- Cleanup script for inconsistent data in kartarkiv database
-- This script fixes foreign key constraint issues

-- 1. Find orphaned map_files records (created_by doesn't exist in users)
SELECT 
    mf.id, 
    mf.created_by, 
    mf.filename,
    'map_files' as table_name
FROM map_files mf 
LEFT JOIN users u ON mf.created_by = u.id 
WHERE u.id IS NULL;

-- 2. Find orphaned maps records (created_by doesn't exist in users)
SELECT 
    m.id, 
    m.created_by, 
    m.name,
    'maps' as table_name
FROM maps m 
LEFT JOIN users u ON m.created_by = u.id 
WHERE u.id IS NULL;

-- 3. Find orphaned preview_images records (created_by doesn't exist in users)
SELECT 
    pi.id, 
    pi.created_by, 
    pi.filename,
    'preview_images' as table_name
FROM preview_images pi 
LEFT JOIN users u ON pi.created_by = u.id 
WHERE u.id IS NULL;

-- 4. Check what users actually exist
SELECT id, clerk_id, username, email FROM users ORDER BY id;

-- 5. If you want to delete orphaned records (BE CAREFUL!):
-- DELETE FROM map_files WHERE created_by NOT IN (SELECT id FROM users);
-- DELETE FROM maps WHERE created_by NOT IN (SELECT id FROM users);
-- DELETE FROM preview_images WHERE created_by NOT IN (SELECT id FROM users);

-- 6. Alternative: Update orphaned records to use a default user (if exists)
-- UPDATE map_files SET created_by = (SELECT id FROM users WHERE username = 'admin' LIMIT 1) WHERE created_by NOT IN (SELECT id FROM users);
-- UPDATE maps SET created_by = (SELECT id FROM users WHERE username = 'admin' LIMIT 1) WHERE created_by NOT IN (SELECT id FROM users);
-- UPDATE preview_images SET created_by = (SELECT id FROM users WHERE username = 'admin' LIMIT 1) WHERE created_by NOT IN (SELECT id FROM users);
