-- vouches
CREATE TABLE vouches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id  UUID NOT NULL REFERENCES users(id),   -- must have 3+ completed txns
  vouchee_id  UUID NOT NULL REFERENCES users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voucher_id, vouchee_id)
);

ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vouches public read" ON vouches FOR SELECT USING (true);
