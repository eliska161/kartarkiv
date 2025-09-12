-- Fix script for user ID issue
-- This script addresses the foreign key constraint problem

-- First, let's see what's happening
SELECT 'Current users:' as info;
SELECT id, clerk_id, username, email FROM users ORDER BY id;

-- Check if there are any orphaned records
SELECT 'Orphaned map_files:' as info;
SELECT mf.id, mf.created_by, mf.filename 
FROM map_files mf 
LEFT JOIN users u ON mf.created_by = u.id 
WHERE u.id IS NULL;

-- The issue might be that the user was created but then deleted
-- or there's a transaction rollback issue

-- Solution 1: Find the correct user ID for this clerk_id
SELECT 'Correct user for clerk_id:' as info;
SELECT id, clerk_id, username, email 
FROM users 
WHERE clerk_id = 'user_32bpgM3LWUuJhy36OgSS09F2fcy';

-- Solution 2: If the user doesn't exist, create it
-- (This should be handled by the application, but let's check)
INSERT INTO users (clerk_id, email, username, password_hash, is_admin)
SELECT 
    'user_32bpgM3LWUuJhy36OgSS09F2fcy',
    'elias@kartarkiv.co',
    'Elias',
    'clerk_user_no_password',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE clerk_id = 'user_32bpgM3LWUuJhy36OgSS09F2fcy'
);

-- Check the result
SELECT 'After fix - users:' as info;
SELECT id, clerk_id, username, email FROM users ORDER BY id;
