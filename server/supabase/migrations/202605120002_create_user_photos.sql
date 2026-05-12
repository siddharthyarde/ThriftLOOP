-- user_photos
CREATE TABLE user_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  label       TEXT DEFAULT 'My Photo',         -- user-defined label
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own photos" ON user_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts photos"   ON user_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes photos"   ON user_photos FOR DELETE USING (auth.uid() = user_id);
