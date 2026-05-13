import { useState, useEffect } from 'react';
import api from '../lib/api';

const SustainabilityScore = ({ userId }) => {
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    api.get(`/api/analytics/sustainability${userId ? `?user_id=${userId}` : ''}`)
      .then(r => setImpact(r.data))
      .catch(() => {});
  }, [userId]);

  if (!impact) return null;

  const co2Equiv = (impact.co2_saved / 2.1).toFixed(0);
  const waterEq = (impact.water_saved / 50).toFixed(0);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
      <h3 className="font-bold text-green-800 text-base mb-3">🌱 Your Impact</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{impact.co2_saved} kg</p>
          <p className="text-xs text-gray-500 mt-0.5">CO₂ Saved</p>
          <p className="text-[10px] text-green-500 mt-1">≈ {co2Equiv} new shirts not made</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{(impact.water_saved / 1000).toFixed(1)}k L</p>
          <p className="text-xs text-gray-500 mt-0.5">Water Saved</p>
          <p className="text-[10px] text-blue-500 mt-1">≈ {waterEq} showers</p>
        </div>
      </div>
      <p className="text-xs text-green-600 text-center mt-3">
        From {impact.transactions} completed transactions
      </p>
    </div>
  );
};

export default SustainabilityScore;
