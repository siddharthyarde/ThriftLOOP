-- transactions
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  seller_id       UUID NOT NULL REFERENCES users(id),
  listing_id      UUID NOT NULL REFERENCES listings(id),
  type            TEXT NOT NULL
    CHECK (type IN ('buy','swap','rental')),
  status          TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','escrow_held','in_transit','completed','disputed','cancelled','refunded')),
  amount          NUMERIC NOT NULL,
  escrow_status   TEXT DEFAULT 'pending'
    CHECK (escrow_status IN ('pending','held','released','refunded','partial_release')),
  delivery_type   TEXT NOT NULL
    CHECK (delivery_type IN ('meetup','delivery')),
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  return_window_end   TIMESTAMPTZ,             -- 24hr after completion
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_transactions_buyer   ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller  ON transactions(seller_id);
CREATE INDEX idx_transactions_listing ON transactions(listing_id);
CREATE INDEX idx_transactions_status  ON transactions(status);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transaction parties read" ON transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyer creates transaction" ON transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);
