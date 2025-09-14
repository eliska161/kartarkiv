-- Kartarkiv Database Schema
-- For EOK (Elverum Orienteringsklubb)

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
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

-- Maps table
CREATE TABLE maps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    scale VARCHAR(20), -- e.g., "1:10000"
    contour_interval DECIMAL(5,2), -- ekvidistanse
    area_bounds JSONB, -- GeoJSON polygon for map area
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    zoom_level INTEGER DEFAULT 13,
    preview_image VARCHAR(255), -- path to preview image
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map files table (for different versions/formats)
CREATE TABLE map_files (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL, -- 'OCAD', 'PDF', 'JPG', etc.
    file_size BIGINT,
    version VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map metadata table (for additional information)
CREATE TABLE map_metadata (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(map_id, key)
);

-- Announcements table for system-wide notifications
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, warning, success, error
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255) NOT NULL, -- Clerk user ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- Optional expiration date
    priority INTEGER DEFAULT 0 -- Higher number = higher priority
);

-- Create indexes for better performance
CREATE INDEX idx_maps_center ON maps(center_lat, center_lng);
CREATE INDEX idx_maps_created_by ON maps(created_by);
CREATE INDEX idx_map_files_map_id ON map_files(map_id);
CREATE INDEX idx_map_metadata_map_id ON map_metadata(map_id);
CREATE INDEX idx_announcements_active ON announcements(is_active, priority DESC, created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maps_updated_at BEFORE UPDATE ON maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
