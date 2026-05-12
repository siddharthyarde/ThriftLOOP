-- meetups
CREATE TABLE meetups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  scheduled_time    TIMESTAMPTZ NOT NULL,
  location_note     TEXT,                      -- "Canteen A, Gate 2" etc.
  qr_code           TEXT UNIQUE NOT NULL,      -- SHA256 hash, one-time use
  qr_used           BOOLEAN DEFAULT FALSE,
  grace_timer_start TIMESTAMPTZ,               -- set when scheduled_time hit
  status            TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','active','completed','buyer_noshow','seller_noshow','disputed')),
  noshow_filed_by   UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetups_transaction ON meetups(transaction_id);
CREATE INDEX idx_meetups_status      ON meetups(status);

ALTER TABLE meetups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meetup parties read" ON meetups FOR SELECT
  USING (
    auth.uid() IN (
      SELECT buyer_id FROM transactions WHERE id = transaction_id
      UNION
      SELECT seller_id FROM transactions WHERE id = transaction_id
    )
  );
