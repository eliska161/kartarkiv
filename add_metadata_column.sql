-- Add metadata column to map_files table for storing OCAD data
ALTER TABLE map_files 
ADD COLUMN IF NOT EXISTS metadata JSONB;
