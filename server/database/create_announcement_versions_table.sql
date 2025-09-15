-- Create announcement_versions table for version history
-- This allows tracking changes to announcements over time

CREATE TABLE announcement_versions (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL,
    expires_at TIMESTAMP NULL,
    priority INTEGER NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- Clerk user ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT, -- Optional reason for the change
    is_current_version BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_announcement_versions_announcement_id ON announcement_versions(announcement_id);
CREATE INDEX idx_announcement_versions_version_number ON announcement_versions(announcement_id, version_number);
CREATE INDEX idx_announcement_versions_current ON announcement_versions(announcement_id, is_current_version);

-- Create trigger to automatically create version when announcement is updated
CREATE OR REPLACE FUNCTION create_announcement_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO next_version 
    FROM announcement_versions 
    WHERE announcement_id = NEW.id;
    
    -- Mark all previous versions as not current
    UPDATE announcement_versions 
    SET is_current_version = FALSE 
    WHERE announcement_id = NEW.id;
    
    -- Insert new version
    INSERT INTO announcement_versions (
        announcement_id,
        version_number,
        title,
        message,
        type,
        is_active,
        expires_at,
        priority,
        created_by,
        change_reason,
        is_current_version
    ) VALUES (
        NEW.id,
        next_version,
        NEW.title,
        NEW.message,
        NEW.type,
        NEW.is_active,
        NEW.expires_at,
        NEW.priority,
        NEW.created_by,
        'Updated via admin interface',
        TRUE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for UPDATE
CREATE TRIGGER trigger_announcement_version_update
    AFTER UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION create_announcement_version();

-- Create trigger for INSERT (initial version)
CREATE OR REPLACE FUNCTION create_initial_announcement_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO announcement_versions (
        announcement_id,
        version_number,
        title,
        message,
        type,
        is_active,
        expires_at,
        priority,
        created_by,
        change_reason,
        is_current_version
    ) VALUES (
        NEW.id,
        1,
        NEW.title,
        NEW.message,
        NEW.type,
        NEW.is_active,
        NEW.expires_at,
        NEW.priority,
        NEW.created_by,
        'Initial version',
        TRUE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_announcement_version_insert
    AFTER INSERT ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_announcement_version();
