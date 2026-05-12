-- rentals
CREATE TABLE rentals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id   UUID REFERENCES transactions(id) ON DELETE CASCADE,
  listing_id       UUID NOT NULL REFERENCES listings(id),
  renter_id        UUID NOT NULL REFERENCES users(id),
  owner_id         UUID NOT NULL REFERENCES users(id),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  rent_amount      NUMERIC NOT NULL,
  deposit          NUMERIC NOT NULL,
  return_status    TEXT DEFAULT 'pending'
    CHECK (return_status IN ('pending','returned_ok','returned_damaged','disputed')),
  deposit_released NUMERIC,                     -- actual amount returned to renter
  damage_deducted  NUMERIC DEFAULT 0,
  return_photos    TEXT[],                      -- photos submitted on return
  status           TEXT DEFAULT 'booked'
    CHECK (status IN ('booked','active','returned','completed','disputed','cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rentals_renter ON rentals(renter_id);
CREATE INDEX idx_rentals_owner  ON rentals(owner_id);
CREATE INDEX idx_rentals_status ON rentals(status);

ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rental parties read" ON rentals FOR SELECT
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);
