const supabase = require('../services/supabase');

const CO2_MAP = {
  tops:        { co2_saved_kg: 2.1, water_saved_l: 2700 },
  bottoms:     { co2_saved_kg: 3.8, water_saved_l: 7000 },
  dress:       { co2_saved_kg: 3.2, water_saved_l: 5000 },
  outerwear:   { co2_saved_kg: 5.5, water_saved_l: 4000 },
  footwear:    { co2_saved_kg: 2.8, water_saved_l: 1500 },
  accessories: { co2_saved_kg: 0.5, water_saved_l: 300 },
};

const getSavings = (category) => CO2_MAP[category] || CO2_MAP.tops;

const logSustainability = async (transactionId, category) => {
  const impact = getSavings(category);
  await supabase.from('sustainability_log').insert({
    transaction_id: transactionId,
    category,
    co2_saved_kg: impact.co2_saved_kg,
    water_saved_l: impact.water_saved_l,
  });
};

const getUserImpact = async (userId) => {
  const { data: txns } = await supabase
    .from('transactions')
    .select('id')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .eq('status', 'completed');

  if (!txns || txns.length === 0) return { co2_saved: 0, water_saved: 0, transactions: 0 };

  const ids = txns.map(t => t.id);
  const { data: logs } = await supabase
    .from('sustainability_log')
    .select('co2_saved_kg, water_saved_l')
    .in('transaction_id', ids);

  const co2_saved = (logs || []).reduce((s, l) => s + l.co2_saved_kg, 0);
  const water_saved = (logs || []).reduce((s, l) => s + l.water_saved_l, 0);

  return {
    co2_saved: parseFloat(co2_saved.toFixed(2)),
    water_saved: Math.round(water_saved),
    transactions: txns.length,
  };
};

module.exports = { CO2_MAP, getSavings, logSustainability, getUserImpact };
