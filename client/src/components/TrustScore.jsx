const TrustScore = ({ score }) => {
  const value = Number(score) || 0;
  const filled = Math.round(value);
  const color =
    value >= 4   ? 'text-green-500' :
    value >= 2.5 ? 'text-yellow-500' :
                   'text-red-400';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`text-sm ${i <= filled ? color : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-xs text-gray-500 ml-1">{value.toFixed(1)}</span>
    </div>
  );
};

export default TrustScore;
