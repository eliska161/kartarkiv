-- Create version history table
CREATE TABLE IF NOT EXISTS map_version_history (
  id SERIAL PRIMARY KEY,
  map_id INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  version_number VARCHAR(50) NOT NULL,
  change_description TEXT,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changes JSONB, -- Store the actual changes made
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_map_version_history_map_id ON map_version_history(map_id);
CREATE INDEX IF NOT EXISTS idx_map_version_history_changed_at ON map_version_history(changed_at);

-- Add RLS policies
ALTER TABLE map_version_history ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view version history
CREATE POLICY "Authenticated users can view version history" ON map_version_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can create version history
CREATE POLICY "Authenticated users can create version history" ON map_version_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add version tracking to maps table
ALTER TABLE maps ADD COLUMN IF NOT EXISTS current_version VARCHAR(50) DEFAULT '1.0';
ALTER TABLE maps ADD COLUMN IF NOT EXISTS last_updated_by TEXT;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
