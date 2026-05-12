-- notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
    CHECK (type IN (
      'wishlist_match','meetup_reminder','meetup_grace_start',
      'dispute_update','offer_received','offer_accepted','offer_declined',
      'rental_return_due','swap_matched','escrow_released','listing_sold'
    )),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}',              -- { listing_id, transaction_id, etc. }
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);
