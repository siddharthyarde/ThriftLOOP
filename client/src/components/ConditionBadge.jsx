const LABELS = { A: 'Like New', B: 'Good', C: 'Fair', D: 'Worn' };
const COLORS = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-gray-200 text-gray-700',
};

const ConditionBadge = ({ condition }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLORS[condition] || COLORS.D}`}>
    {condition} · {LABELS[condition] || 'Unknown'}
  </span>
);

export default ConditionBadge;
