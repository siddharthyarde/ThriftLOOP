// Fixed CO2 / water savings estimates per clothing category (no API needed).
const CO2_MAP = {
  tops:        { co2_saved_kg: 2.1, water_saved_l: 2700 },
  bottoms:     { co2_saved_kg: 3.8, water_saved_l: 7000 },
  dress:       { co2_saved_kg: 3.2, water_saved_l: 5000 },
  outerwear:   { co2_saved_kg: 5.5, water_saved_l: 4000 },
  footwear:    { co2_saved_kg: 2.8, water_saved_l: 1500 },
  accessories: { co2_saved_kg: 0.5, water_saved_l: 300 },
};

const getSavings = (category) => CO2_MAP[category] || CO2_MAP.tops;

module.exports = { CO2_MAP, getSavings };
