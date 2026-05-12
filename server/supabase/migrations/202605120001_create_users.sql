-- users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  locality      TEXT,                          -- city or neighborhood
  bio           TEXT,
  trust_score   NUMERIC DEFAULT 0,
  total_sales   INTEGER DEFAULT 0,
  total_swaps   INTEGER DEFAULT 0,
  total_rentals INTEGER DEFAULT 0,
  disputes_filed   INTEGER DEFAULT 0,
  disputes_against INTEGER DEFAULT 0,
  verified      BOOLEAN DEFAULT FALSE,
  role          TEXT DEFAULT 'user'            -- 'user' | 'admin'
    CHECK (role IN ('user', 'admin')),
  style_prefs   JSONB DEFAULT '{}',            -- from style quiz
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_locality ON users(locality);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles readable" ON users FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
