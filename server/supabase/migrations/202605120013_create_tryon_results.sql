-- tryon_results
CREATE TABLE tryon_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_photo_url  TEXT NOT NULL,
  result_url      TEXT NOT NULL,               -- stored in Supabase Storage
  fit_feedback    TEXT                         -- 'fits_well'|'too_big'|'too_small'|null
    CHECK (fit_feedback IN ('fits_well','too_big','too_small')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tryon_user    ON tryon_results(user_id);
CREATE INDEX idx_tryon_listing ON tryon_results(listing_id);

ALTER TABLE tryon_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own tryon" ON tryon_results FOR SELECT
  USING (auth.uid() = user_id);
