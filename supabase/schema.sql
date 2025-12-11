-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "order" INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics tables for testing
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  properties JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_folder_id ON reports(folder_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);

-- Insert sample data for testing
INSERT INTO users (id, created_at, last_seen_at)
SELECT
  gen_random_uuid(),
  NOW() - (random() * INTERVAL '30 days'),
  NOW() - (random() * INTERVAL '7 days')
FROM generate_series(1, 100);

INSERT INTO events (user_id, event_name, timestamp, properties)
SELECT
  (SELECT id FROM users ORDER BY random() LIMIT 1),
  (ARRAY['page_view', 'button_click', 'form_submit', 'purchase', 'login'])[floor(random() * 5 + 1)],
  NOW() - (random() * INTERVAL '30 days'),
  jsonb_build_object('page', '/home', 'duration', floor(random() * 300))
FROM generate_series(1, 1000);
