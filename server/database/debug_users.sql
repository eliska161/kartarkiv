-- Debug script to check users table data
-- This will help us understand what's in the database

-- 1. Check all users in the database
SELECT 
    id, 
    clerk_id, 
    username, 
    email, 
    is_admin,
    created_at
FROM users 
ORDER BY id;

-- 2. Check if user with ID 9 exists
SELECT 
    id, 
    clerk_id, 
    username, 
    email, 
    is_admin
FROM users 
WHERE id = 9;

-- 3. Check if user with clerk_id exists
SELECT 
    id, 
    clerk_id, 
    username, 
    email, 
    is_admin
FROM users 
WHERE clerk_id = 'user_32bpgM3LWUuJhy36OgSS09F2fcy';

-- 4. Check what the last inserted user ID was
SELECT MAX(id) as max_user_id FROM users;

-- 5. Check for any gaps in ID sequence
SELECT 
    id,
    LAG(id) OVER (ORDER BY id) as prev_id,
    id - LAG(id) OVER (ORDER BY id) as gap
FROM users 
ORDER BY id;
