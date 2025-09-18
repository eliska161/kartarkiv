-- Fix share_links table to use clerk_id instead of user id
-- First drop the existing foreign key constraint
ALTER TABLE share_links DROP CONSTRAINT IF EXISTS share_links_created_by_fkey;

-- Change the column type from INTEGER to VARCHAR(255) to store clerk_id
ALTER TABLE share_links ALTER COLUMN created_by TYPE VARCHAR(255);

-- Remove the foreign key constraint since we'll store clerk_id directly
-- (we can't reference clerk_id as it doesn't exist in users table)
