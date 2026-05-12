# DOC 2 — DATABASE SCHEMA & SEED DATA
### AI-Powered Thrift Marketplace
> Part 2 of 8 | Covers: All 15 table SQL migrations, indexes, RLS policies, full seed script

---

## 1. SETUP — SUPABASE MIGRATIONS

Run all SQL in **Supabase Dashboard → SQL Editor** in the order listed below.

---

## 2. TABLE: users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  locality      TEXT,                          -- city or neighborhood
  bio           TEXT,
  trust_score   NUMERIC DEFAULT 0,
  total_sales   INTEGER DEFAULT 0,
  total_swaps   INTEGER DEFAULT 0,
  total_rentals INTEGER DEFAULT 0,
  disputes_filed    INTEGER DEFAULT 0,
  disputes_against  INTEGER DEFAULT 0,
  verified      BOOLEAN DEFAULT FALSE,
  role          TEXT DEFAULT 'user'            -- 'user' | 'admin'
    CHECK (role IN ('user', 'admin')),
  style_prefs   JSONB DEFAULT '{}',            -- from style quiz
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for locality-based discovery
CREATE INDEX idx_users_locality ON users(locality);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles readable" ON users FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
```

---

## 3. TABLE: user_photos

```sql
CREATE TABLE user_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  label       TEXT DEFAULT 'My Photo',        -- user-defined label
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only owner can access own photos
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own photos" ON user_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts photos"   ON user_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes photos"   ON user_photos FOR DELETE USING (auth.uid() = user_id);
```

---

## 4. TABLE: listings

```sql
CREATE TABLE listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL
    CHECK (category IN ('tops','bottoms','dress','outerwear','footwear','accessories')),
  size            TEXT NOT NULL
    CHECK (size IN ('XS','S','M','L','XL','XXL','One Size','Custom')),
  condition       TEXT NOT NULL
    CHECK (condition IN ('A','B','C','D')),
  condition_ai    TEXT,                        -- AI-suggested condition grade
  price           NUMERIC NOT NULL CHECK (price > 0),
  available_for   TEXT[] DEFAULT '{buy}',      -- ['buy','swap','rental']
  images          TEXT[] NOT NULL,             -- min 3: front, back, defect
  tags            TEXT[] DEFAULT '{}',         -- auto-tagged by AI
  locality        TEXT,
  status          TEXT DEFAULT 'active'
    CHECK (status IN ('active','reserved','sold','delisted','rented')),
  views           INTEGER DEFAULT 0,
  saves           INTEGER DEFAULT 0,
  rental_price_per_day NUMERIC,               -- if available_for includes 'rental'
  rental_deposit  NUMERIC,
  bundle_with     UUID[],                     -- linked listing IDs for bundle
  flash_sale_end  TIMESTAMPTZ,               -- if in flash sale, when it ends
  flash_sale_price NUMERIC,
  reserved_for    UUID REFERENCES users(id),  -- buyer ID if reserved
  reserved_until  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  delisted_at     TIMESTAMPTZ
);

-- Indexes for search & filter performance
CREATE INDEX idx_listings_seller    ON listings(seller_id);
CREATE INDEX idx_listings_category  ON listings(category);
CREATE INDEX idx_listings_size      ON listings(size);
CREATE INDEX idx_listings_condition ON listings(condition);
CREATE INDEX idx_listings_locality  ON listings(locality);
CREATE INDEX idx_listings_status    ON listings(status);
CREATE INDEX idx_listings_price     ON listings(price);
CREATE INDEX idx_listings_created   ON listings(created_at DESC);
CREATE INDEX idx_listings_avail_for ON listings USING GIN(available_for);

-- RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings public read"       ON listings FOR SELECT USING (true);
CREATE POLICY "Seller creates listing"     ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Seller edits own listing"   ON listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Seller deletes own listing" ON listings FOR DELETE USING (auth.uid() = seller_id);
```

---

## 5. TABLE: transactions

```sql
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

CREATE INDEX idx_transactions_buyer    ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller   ON transactions(seller_id);
CREATE INDEX idx_transactions_listing  ON transactions(listing_id);
CREATE INDEX idx_transactions_status   ON transactions(status);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transaction parties read" ON transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyer creates transaction" ON transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);
```

---

## 6. TABLE: swaps

```sql
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
```

---

## 7. TABLE: rentals

```sql
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
  deposit_released NUMERIC,                    -- actual amount returned to renter
  damage_deducted  NUMERIC DEFAULT 0,
  return_photos    TEXT[],                     -- photos submitted on return
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
```

---

## 8. TABLE: meetups

```sql
CREATE TABLE meetups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  scheduled_time    TIMESTAMPTZ NOT NULL,
  location_note     TEXT,                      -- "Canteen A, Gate 2" etc.
  qr_code           TEXT UNIQUE NOT NULL,      -- SHA256 hash, one-time use
  qr_used           BOOLEAN DEFAULT FALSE,
  grace_timer_start TIMESTAMPTZ,              -- set when scheduled_time hit
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
```

---

## 9. TABLE: disputes

```sql
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
  listing_photo_timestamp TIMESTAMPTZ,         -- when listing was uploaded
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

-- Admin can read all disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispute parties read" ON disputes FOR SELECT
  USING (auth.uid() = filed_by OR auth.uid() = against);
```

---

## 10. TABLE: conversations & messages

```sql
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL REFERENCES users(id),
  participant_b UUID NOT NULL REFERENCES users(id),
  listing_id    UUID REFERENCES listings(id),
  last_message  TEXT,
  last_message_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_a, participant_b, listing_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  read            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conv    ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_conversations_a  ON conversations(participant_a);
CREATE INDEX idx_conversations_b  ON conversations(participant_b);

-- RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversation participants read messages" ON messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT participant_a FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant_b FROM conversations WHERE id = conversation_id
    )
  );
CREATE POLICY "Sender inserts message" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
```

---

## 11. TABLE: wishlists

```sql
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
CREATE POLICY "Owner reads wishlist" ON wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner adds wishlist"  ON wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner removes wishlist" ON wishlists FOR DELETE USING (auth.uid() = user_id);
```

---

## 12. TABLE: notifications

```sql
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
```

---

## 13. TABLE: offers

```sql
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
```

---

## 14. TABLE: tryon_results

```sql
CREATE TABLE tryon_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_photo_url  TEXT NOT NULL,
  result_url      TEXT NOT NULL,              -- stored in Supabase Storage
  fit_feedback    TEXT                        -- 'fits_well'|'too_big'|'too_small'|null
    CHECK (fit_feedback IN ('fits_well','too_big','too_small')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tryon_user    ON tryon_results(user_id);
CREATE INDEX idx_tryon_listing ON tryon_results(listing_id);

ALTER TABLE tryon_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own tryon" ON tryon_results FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 15. TABLE: vouches

```sql
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
```

---

## 16. TABLE: sustainability_log

```sql
CREATE TABLE sustainability_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  category        TEXT NOT NULL,
  co2_saved_kg    NUMERIC NOT NULL,
  water_saved_l   NUMERIC NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed estimates used by seed and calculation service
-- tops: 2.1 kg CO2, 2700 L water
-- bottoms: 3.8 kg CO2, 7000 L water
-- dress: 3.2 kg CO2, 5000 L water
-- outerwear: 5.5 kg CO2, 4000 L water
-- footwear: 2.8 kg CO2, 1500 L water
-- accessories: 0.5 kg CO2, 300 L water
```

---

## 17. UTILITY FUNCTIONS (Supabase SQL)

```sql
-- Auto-update listing saves count when wishlist changes
CREATE OR REPLACE FUNCTION update_listing_saves()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE listings SET saves = saves + 1 WHERE id = NEW.listing_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE listings SET saves = saves - 1 WHERE id = OLD.listing_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wishlist_saves_trigger
AFTER INSERT OR DELETE ON wishlists
FOR EACH ROW EXECUTE FUNCTION update_listing_saves();

-- Auto-update last_message in conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message = NEW.content, last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_update_trigger
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
```

---

## 18. SEED DATA SCRIPT

### server/utils/seedData.js
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Constants ────────────────────────────────────────────────
const CATEGORIES  = ['tops','bottoms','dress','outerwear','footwear','accessories'];
const SIZES       = ['XS','S','M','L','XL','XXL'];
const CONDITIONS  = ['A','B','C','D'];
const LOCALITIES  = ['Indore','Mumbai','Delhi','Pune','Bangalore','Hyderabad','Jaipur','Ahmedabad'];
const AVAIL_FOR   = [['buy'],['buy','swap'],['buy','rental'],['buy','swap','rental'],['swap'],['rental']];

const CO2_MAP = {
  tops: { co2: 2.1, water: 2700 },
  bottoms: { co2: 3.8, water: 7000 },
  dress: { co2: 3.2, water: 5000 },
  outerwear: { co2: 5.5, water: 4000 },
  footwear: { co2: 2.8, water: 1500 },
  accessories: { co2: 0.5, water: 300 },
};

const LISTING_TITLES = {
  tops:        ['Vintage Denim Shirt','Floral Kurti','Cotton Polo','Linen Casual Shirt','Striped Tee','Silk Blouse','Graphic Tee','Hoodie','Crop Top','Oversized Tshirt'],
  bottoms:     ['High-waist Jeans','Palazzo Pants','Cargo Shorts','Slim Chinos','Flared Skirt','Denim Cutoffs','Linen Trousers','Jogger Pants','Pleated Skirt','Track Pants'],
  dress:       ['Wrap Dress','Maxi Floral Dress','Mini Party Dress','Shirt Dress','Sundress','Bodycon Dress','A-line Dress','Boho Dress','Sequin Dress','Casual Shift Dress'],
  outerwear:   ['Denim Jacket','Wool Blazer','Puffer Coat','Leather Jacket','Trench Coat','Bomber Jacket','Windbreaker','Fleece Hoodie','Overcoat','Rain Jacket'],
  footwear:    ['Canvas Sneakers','Leather Loafers','Block Heel Sandals','Running Shoes','Chelsea Boots','Kolhapuri Chappals','Platform Boots','Ballet Flats','Ankle Boots','Strappy Heels'],
  accessories: ['Woven Tote Bag','Silk Scarf','Leather Belt','Statement Earrings','Vintage Watch','Bucket Hat','Crossbody Bag','Beaded Necklace','Sunglasses','Embroidered Clutch'],
};

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
  'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
  'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400',
];

// ─── Helpers ──────────────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const getImages = () => [rand(PLACEHOLDER_IMAGES), rand(PLACEHOLDER_IMAGES), rand(PLACEHOLDER_IMAGES)];

// ─── Seed Users ───────────────────────────────────────────────
const seedUsers = async () => {
  console.log('Seeding 50 users...');
  const firstNames = ['Aarav','Priya','Rohan','Ananya','Vikram','Sneha','Arjun','Kavya','Rahul','Divya',
                       'Ishaan','Pooja','Karan','Nisha','Dev','Meera','Aditya','Riya','Siddharth','Sanya',
                       'Nikhil','Tara','Varun','Mira','Kabir','Zara','Harsh','Aisha','Manav','Simran',
                       'Yash','Natasha','Samar','Kritika','Raj','Shruti','Ankur','Prerna','Shiv','Muskan',
                       'Aman','Pallavi','Vivek','Jyoti','Mohit','Shweta','Gaurav','Nandini','Sumit','Radha'];

  const users = firstNames.map((name, i) => ({
    id:           `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
    email:        `${name.toLowerCase()}${i}@example.com`,
    name,
    locality:     rand(LOCALITIES),
    trust_score:  randFloat(0, 5),
    total_sales:  randNum(0, 30),
    verified:     Math.random() > 0.5,
    role:         i === 0 ? 'admin' : 'user',   // first user is admin
    style_prefs:  { preferred_categories: [rand(CATEGORIES), rand(CATEGORIES)], preferred_sizes: [rand(SIZES)] },
    created_at:   new Date(Date.now() - randNum(0, 180) * 86400000).toISOString(),
  }));

  const { error } = await supabase.from('users').upsert(users);
  if (error) console.error('Users seed error:', error.message);
  else console.log('✓ Users seeded');

  return users;
};

// ─── Seed Listings ────────────────────────────────────────────
const seedListings = async (users) => {
  console.log('Seeding 200 listings...');
  const listings = [];
  const sellerIds = users.filter(u => u.role === 'user').map(u => u.id);

  for (let i = 0; i < 200; i++) {
    const category = rand(CATEGORIES);
    const titles = LISTING_TITLES[category];
    const availFor = rand(AVAIL_FOR);
    const isRental = availFor.includes('rental');
    const price = randNum(100, 3000);

    listings.push({
      seller_id:           rand(sellerIds),
      title:               rand(titles),
      description:         `Lightly used ${rand(CONDITIONS)}-grade item. Clean and ready to go. ${rand(['Great condition!','Minimal wear.','No defects.','Single owner.'])}`,
      category,
      size:                rand(SIZES),
      condition:           rand(CONDITIONS),
      price,
      available_for:       availFor,
      images:              getImages(),
      tags:                [category, rand(['vintage','casual','ethnic','western','formal','streetwear'])],
      locality:            rand(LOCALITIES),
      status:              rand(['active','active','active','active','sold','delisted']),
      views:               randNum(0, 500),
      saves:               randNum(0, 80),
      rental_price_per_day: isRental ? randNum(50, 300) : null,
      rental_deposit:      isRental ? Math.round(price * 0.3) : null,
      created_at:          new Date(Date.now() - randNum(0, 90) * 86400000).toISOString(),
    });
  }

  const { data, error } = await supabase.from('listings').insert(listings).select('id,seller_id,category,price,status');
  if (error) console.error('Listings seed error:', error.message);
  else console.log('✓ Listings seeded:', data.length);

  return data;
};

// ─── Seed Transactions ────────────────────────────────────────
const seedTransactions = async (users, listings) => {
  console.log('Seeding 80 transactions...');
  const soldListings = listings.filter(l => l.status === 'sold').slice(0, 80);
  const buyerIds = users.filter(u => u.role === 'user').map(u => u.id);
  const transactions = [];

  for (let i = 0; i < Math.min(80, soldListings.length); i++) {
    const listing = soldListings[i];
    const type = rand(['buy','buy','buy','swap','rental']);
    const deliveryType = rand(['meetup','meetup','delivery']);
    const status = rand(['completed','completed','completed','disputed','cancelled']);

    transactions.push({
      buyer_id:        rand(buyerIds.filter(id => id !== listing.seller_id)),
      seller_id:       listing.seller_id,
      listing_id:      listing.id,
      type,
      status,
      amount:          listing.price,
      escrow_status:   status === 'completed' ? 'released' : status === 'cancelled' ? 'refunded' : 'held',
      delivery_type:   deliveryType,
      created_at:      new Date(Date.now() - randNum(0, 60) * 86400000).toISOString(),
      completed_at:    status === 'completed' ? new Date(Date.now() - randNum(0, 30) * 86400000).toISOString() : null,
    });
  }

  const { data, error } = await supabase.from('transactions').insert(transactions).select('id,buyer_id,seller_id,listing_id,type,status');
  if (error) console.error('Transactions seed error:', error.message);
  else console.log('✓ Transactions seeded:', data.length);

  return data;
};

// ─── Seed Messages ────────────────────────────────────────────
const seedMessages = async (users, listings) => {
  console.log('Seeding conversations and messages...');
  const SAMPLE_MESSAGES = [
    'Is this still available?','Yes, it is! Come check it out.',
    'What is the lowest price you can do?','Best I can do is 10% off.',
    'Can I pick it up tomorrow?','Sure, noon works for me.',
    'Does it have any hidden damage?','No, condition is exactly as described.',
    'Can you do a video call to show the item?','Sure, DM me your number.',
    'Is size M available?','Yes, only M left.',
    'Do you ship to Mumbai?','Yes via Shiprocket, adding delivery charges.',
  ];

  const convos = [];
  const msgs = [];
  const userIds = users.map(u => u.id);

  for (let i = 0; i < 30; i++) {
    const [a, b] = [rand(userIds), rand(userIds)];
    if (a === b) continue;
    const listing = rand(listings);
    convos.push({ participant_a: a, participant_b: b, listing_id: listing.id });
  }

  const { data: convoData } = await supabase.from('conversations').insert(convos).select('id,participant_a,participant_b');

  for (const convo of (convoData || [])) {
    const msgCount = randNum(3, 8);
    for (let j = 0; j < msgCount; j++) {
      msgs.push({
        conversation_id: convo.id,
        sender_id:       j % 2 === 0 ? convo.participant_a : convo.participant_b,
        content:         SAMPLE_MESSAGES[randNum(0, SAMPLE_MESSAGES.length - 1)],
        read:            Math.random() > 0.3,
        created_at:      new Date(Date.now() - randNum(0, 30) * 86400000).toISOString(),
      });
    }
  }

  const { error } = await supabase.from('messages').insert(msgs);
  if (error) console.error('Messages seed error:', error.message);
  else console.log('✓ Messages seeded:', msgs.length);
};

// ─── Seed Wishlists ───────────────────────────────────────────
const seedWishlists = async (users, listings) => {
  console.log('Seeding 100 wishlist entries...');
  const seen = new Set();
  const entries = [];

  for (let i = 0; i < 100; i++) {
    const user = rand(users.filter(u => u.role === 'user'));
    const listing = rand(listings);
    const key = `${user.id}:${listing.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ user_id: user.id, listing_id: listing.id });
  }

  const { error } = await supabase.from('wishlists').insert(entries);
  if (error) console.error('Wishlists seed error:', error.message);
  else console.log('✓ Wishlists seeded:', entries.length);
};

// ─── Seed Sustainability Log ──────────────────────────────────
const seedSustainability = async (transactions, listings) => {
  console.log('Seeding sustainability log...');
  const completedTxns = transactions.filter(t => t.status === 'completed');
  const entries = completedTxns.map(t => {
    const listing = listings.find(l => l.id === t.listing_id);
    const category = listing?.category || 'tops';
    const map = CO2_MAP[category];
    return {
      transaction_id: t.id,
      category,
      co2_saved_kg:   map.co2,
      water_saved_l:  map.water,
    };
  });

  const { error } = await supabase.from('sustainability_log').insert(entries);
  if (error) console.error('Sustainability seed error:', error.message);
  else console.log('✓ Sustainability log seeded:', entries.length);
};

// ─── MAIN ─────────────────────────────────────────────────────
const seed = async () => {
  console.log('\n🌱 Starting seed...\n');
  try {
    const users        = await seedUsers();
    const listings     = await seedListings(users);
    const transactions = await seedTransactions(users, listings);
    await seedMessages(users, listings);
    await seedWishlists(users, listings);
    await seedSustainability(transactions, listings);
    console.log('\n✅ Seed complete!\n');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();
```

---

## 19. RUNNING MIGRATIONS & SEED

```bash
# 1. Run all CREATE TABLE SQL in Supabase SQL editor (sections 2–16 above)
# 2. Run utility functions (section 17)
# 3. Run seed script from terminal:

cd server
npm run seed

# Verify in Supabase dashboard → Table Editor
# users: 50 rows
# listings: ~200 rows
# transactions: ~80 rows
# messages: ~150 rows
```

---

## NEXT: DOC 3 — Auth & User Module
Supabase Auth integration, registration/login flows, profile management, user photo management for try-on, trust score calculation, verified badge, seller storefronts.
