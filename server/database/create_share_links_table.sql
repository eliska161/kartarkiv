-- Create share_links table for one-time download links
CREATE TABLE IF NOT EXISTS share_links (
  id SERIAL PRIMARY KEY,
  map_id INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_by VARCHAR(255) NOT NULL, -- Stores clerk_id directly
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  is_used BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_map_id ON share_links(map_id);
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at);

-- Add comment
COMMENT ON TABLE share_links IS 'One-time download links for maps that can be shared without authentication';
