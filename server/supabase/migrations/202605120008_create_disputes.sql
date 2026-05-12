-- disputes
CREATE TABLE disputes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id   UUID NOT NULL REFERENCES transactions(id),
  type             TEXT NOT NULL
    CHECK (type IN ('condition_mismatch','rental_damage','swap_misrepresentation')),
  filed_by         UUID NOT NULL REFERENCES users(id),
  against          UUID NOT NULL REFERENCES users(id),
  description      TEXT NOT NULL,
  evidence_filer   TEXT[],                     -- image URLs from filing party
  evidence_defense TEXT[],                     -- image URLs from defending party
  listing_photo    TEXT,                       -- original listing photo (auto-fetched)
  listing_photo_timestamp   TIMESTAMPTZ,       -- when listing was uploaded
  complaint_photo_timestamp TIMESTAMPTZ,       -- when complaint evidence was uploaded
  admin_decision   TEXT
    CHECK (admin_decision IN ('buyer_wins','seller_wins','partial_refund','no_action')),
  admin_notes      TEXT,
  refund_amount    NUMERIC,                    -- if partial or full refund
  status           TEXT DEFAULT 'open'
    CHECK (status IN ('open','evidence_requested','under_review','resolved')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX idx_disputes_status      ON disputes(status);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispute parties read" ON disputes FOR SELECT
  USING (auth.uid() = filed_by OR auth.uid() = against);
