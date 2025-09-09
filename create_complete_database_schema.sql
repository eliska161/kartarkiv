-- COMPLETE DATABASE SCHEMA FOR KARTARKIV
-- This creates all required tables with proper Clerk integration

-- Step 1: Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS preview_images CASCADE;
DROP TABLE IF EXISTS map_files CASCADE;
DROP TABLE IF EXISTS maps CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Create users table with Clerk ID support
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    clerk_id VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create maps table
CREATE TABLE maps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    scale VARCHAR(20),
    contour_interval DECIMAL(5,2),
    area_bounds JSONB,
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    zoom_level INTEGER DEFAULT 13,
    preview_image VARCHAR(255),
    created_by VARCHAR(255) REFERENCES users(clerk_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create map_files table
CREATE TABLE map_files (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'geotiff', 'shapefile', 'kml', etc.
    created_by VARCHAR(255) REFERENCES users(clerk_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create preview_images table
CREATE TABLE preview_images (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    created_by VARCHAR(255) REFERENCES users(clerk_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create indexes for better performance
CREATE INDEX idx_maps_created_by ON maps(created_by);
CREATE INDEX idx_maps_created_at ON maps(created_at);
CREATE INDEX idx_map_files_map_id ON map_files(map_id);
CREATE INDEX idx_map_files_created_by ON map_files(created_by);
CREATE INDEX idx_preview_images_map_id ON preview_images(map_id);
CREATE INDEX idx_preview_images_created_by ON preview_images(created_by);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);

-- Step 7: Create RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE preview_images ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (true);

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (true);

CREATE POLICY "users_delete_policy" ON users
    FOR DELETE USING (true);

-- Maps policies
CREATE POLICY "maps_select_policy" ON maps
    FOR SELECT USING (true);

CREATE POLICY "maps_insert_policy" ON maps
    FOR INSERT WITH CHECK (true);

CREATE POLICY "maps_update_policy" ON maps
    FOR UPDATE USING (true);

CREATE POLICY "maps_delete_policy" ON maps
    FOR DELETE USING (true);

-- Map files policies
CREATE POLICY "map_files_select_policy" ON map_files
    FOR SELECT USING (true);

CREATE POLICY "map_files_insert_policy" ON map_files
    FOR INSERT WITH CHECK (true);

CREATE POLICY "map_files_update_policy" ON map_files
    FOR UPDATE USING (true);

CREATE POLICY "map_files_delete_policy" ON map_files
    FOR DELETE USING (true);

-- Preview images policies
CREATE POLICY "preview_images_select_policy" ON preview_images
    FOR SELECT USING (true);

CREATE POLICY "preview_images_insert_policy" ON preview_images
    FOR INSERT WITH CHECK (true);

CREATE POLICY "preview_images_update_policy" ON preview_images
    FOR UPDATE USING (true);

CREATE POLICY "preview_images_delete_policy" ON preview_images
    FOR DELETE USING (true);

-- Step 8: Insert sample data for testing
INSERT INTO users (clerk_id, username, email, password_hash, first_name, last_name, is_admin) VALUES
('clerk_user_123', 'admin', 'admin@kartarkiv.no', 'clerk_user_no_password', 'Admin', 'User', true),
('clerk_user_456', 'testuser', 'test@kartarkiv.no', 'clerk_user_no_password', 'Test', 'User', false);

-- Step 9: Verify schema
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('users', 'maps', 'map_files', 'preview_images') 
ORDER BY table_name, ordinal_position;

SELECT 'Database schema created successfully!' as status;
