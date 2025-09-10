# Supabase Database Setup Instructions

## Problem
The current database schema in Supabase doesn't match the code. We need to run the complete database schema to fix the mismatches.

## Steps to Fix

### 1. Go to Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "SQL Editor" in the left sidebar

### 2. Run the Complete Database Schema
1. Copy the entire content of `create_complete_database_schema.sql`
2. Paste it into the SQL Editor
3. Click "Run" to execute the script

### 3. Verify the Schema
After running the script, verify that these tables exist with correct columns:

**users table:**
- `id` (SERIAL PRIMARY KEY)
- `clerk_id` (VARCHAR(255) UNIQUE)
- `username` (VARCHAR(50) UNIQUE NOT NULL)
- `email` (VARCHAR(100) UNIQUE NOT NULL)
- `password_hash` (VARCHAR(255) NOT NULL)
- `first_name` (VARCHAR(50) NOT NULL)
- `last_name` (VARCHAR(50) NOT NULL)
- `is_admin` (BOOLEAN DEFAULT FALSE)
- `is_active` (BOOLEAN DEFAULT TRUE)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**maps table:**
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(200) NOT NULL)
- `description` (TEXT)
- `scale` (VARCHAR(20))
- `contour_interval` (DECIMAL(5,2))
- `area_bounds` (JSONB)
- `center_lat` (DECIMAL(10, 8))
- `center_lng` (DECIMAL(11, 8))
- `zoom_level` (INTEGER DEFAULT 13)
- `preview_image` (VARCHAR(255))
- `created_by` (VARCHAR(255) REFERENCES users(clerk_id))
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**map_files table:**
- `id` (SERIAL PRIMARY KEY)
- `map_id` (INTEGER REFERENCES maps(id) ON DELETE CASCADE)
- `filename` (VARCHAR(255) NOT NULL)
- `original_filename` (VARCHAR(255) NOT NULL)
- `file_path` (VARCHAR(500) NOT NULL)
- `file_size` (BIGINT NOT NULL)
- `mime_type` (VARCHAR(100) NOT NULL)
- `file_type` (VARCHAR(50) NOT NULL)
- `created_by` (VARCHAR(255) REFERENCES users(clerk_id))
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**preview_images table:**
- `id` (SERIAL PRIMARY KEY)
- `map_id` (INTEGER REFERENCES maps(id) ON DELETE CASCADE)
- `filename` (VARCHAR(255) NOT NULL)
- `file_path` (VARCHAR(500) NOT NULL)
- `file_size` (BIGINT NOT NULL)
- `mime_type` (VARCHAR(100) NOT NULL)
- `width` (INTEGER)
- `height` (INTEGER)
- `created_by` (VARCHAR(255) REFERENCES users(clerk_id))
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### 4. Test the Application
After running the schema, test the application to ensure:
- Map creation works
- File uploads work
- User authentication works
- No more database schema errors

## Important Notes
- This script will DROP existing tables, so any existing data will be lost
- The script includes sample data for testing
- All RLS policies are recreated with simple permissions
- The schema is optimized for Clerk authentication integration
