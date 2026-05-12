-- swaps
CREATE TABLE swaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID REFERENCES transactions(id) ON DELETE CASCADE,
  listing_id_a    UUID NOT NULL REFERENCES listings(id),  -- initiator's item
  listing_id_b    UUID NOT NULL REFERENCES listings(id),  -- matched item
  user_a          UUID NOT NULL REFERENCES users(id),     -- initiator
  user_b          UUID NOT NULL REFERENCES users(id),     -- match
  value_a         NUMERIC NOT NULL,
  value_b         NUMERIC NOT NULL,
  gap_payment     NUMERIC DEFAULT 0,           -- abs(value_a - value_b)
  gap_payer       UUID REFERENCES users(id),   -- who pays the gap
  deposit_a       NUMERIC DEFAULT 0,
  deposit_b       NUMERIC DEFAULT 0,
  status          TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','matched','escrow_held','completed','disputed','cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_swaps_user_a ON swaps(user_a);
CREATE INDEX idx_swaps_user_b ON swaps(user_b);
CREATE INDEX idx_swaps_status ON swaps(status);

ALTER TABLE swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Swap parties read" ON swaps FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);
