-- wishlists
CREATE TABLE wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_wishlists_user    ON wishlists(user_id);
CREATE INDEX idx_wishlists_listing ON wishlists(listing_id);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads wishlist"   ON wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner adds wishlist"    ON wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner removes wishlist" ON wishlists FOR DELETE USING (auth.uid() = user_id);
