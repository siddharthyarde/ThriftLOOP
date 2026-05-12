-- listings
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
  rental_price_per_day NUMERIC,                -- if available_for includes 'rental'
  rental_deposit  NUMERIC,
  bundle_with     UUID[],                      -- linked listing IDs for bundle
  flash_sale_end  TIMESTAMPTZ,                 -- if in flash sale, when it ends
  flash_sale_price NUMERIC,
  reserved_for    UUID REFERENCES users(id),   -- buyer ID if reserved
  reserved_until  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  delisted_at     TIMESTAMPTZ
);

CREATE INDEX idx_listings_seller    ON listings(seller_id);
CREATE INDEX idx_listings_category  ON listings(category);
CREATE INDEX idx_listings_size      ON listings(size);
CREATE INDEX idx_listings_condition ON listings(condition);
CREATE INDEX idx_listings_locality  ON listings(locality);
CREATE INDEX idx_listings_status    ON listings(status);
CREATE INDEX idx_listings_price     ON listings(price);
CREATE INDEX idx_listings_created   ON listings(created_at DESC);
CREATE INDEX idx_listings_avail_for ON listings USING GIN(available_for);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings public read"       ON listings FOR SELECT USING (true);
CREATE POLICY "Seller creates listing"     ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Seller edits own listing"   ON listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Seller deletes own listing" ON listings FOR DELETE USING (auth.uid() = seller_id);
