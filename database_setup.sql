-- Create settings table for bot configuration (users table already exists)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
('announcementGroupId', 'your_group_id@g.us')
ON CONFLICT (key) DO NOTHING;

-- Update owner WhatsApp ID (replace with your actual WhatsApp number)
-- Example: UPDATE users SET whatsapp_id = '628123456789@s.whatsapp.net' WHERE role = 'Owner';