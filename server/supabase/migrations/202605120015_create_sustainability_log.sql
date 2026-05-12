-- sustainability_log
CREATE TABLE sustainability_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id),
  category        TEXT NOT NULL,
  co2_saved_kg    NUMERIC NOT NULL,
  water_saved_l   NUMERIC NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed estimates used by seed and calculation service:
--   tops: 2.1 kg CO2, 2700 L water
--   bottoms: 3.8 kg CO2, 7000 L water
--   dress: 3.2 kg CO2, 5000 L water
--   outerwear: 5.5 kg CO2, 4000 L water
--   footwear: 2.8 kg CO2, 1500 L water
--   accessories: 0.5 kg CO2, 300 L water
