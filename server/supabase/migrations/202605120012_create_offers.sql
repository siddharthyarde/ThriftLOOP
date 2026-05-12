-- offers
CREATE TABLE offers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id       UUID NOT NULL REFERENCES users(id),
  seller_id      UUID NOT NULL REFERENCES users(id),
  amount         NUMERIC NOT NULL,
  status         TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','countered','accepted','declined','expired')),
  counter_amount NUMERIC,
  expires_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_buyer   ON offers(buyer_id);
CREATE INDEX idx_offers_seller  ON offers(seller_id);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offer parties read" ON offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
