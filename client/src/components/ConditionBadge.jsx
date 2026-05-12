const CONDITION_CONFIG = {
  A: { label: 'Like New',    color: 'bg-emerald-100 text-emerald-700' },
  B: { label: 'Gently Used', color: 'bg-blue-100 text-blue-700' },
  C: { label: 'Good',        color: 'bg-yellow-100 text-yellow-700' },
  D: { label: 'Fair',        color: 'bg-red-100 text-red-600' },
};

const SIZE_TEXT = { xs: 'text-xs', sm: 'text-sm' };

const ConditionBadge = ({ condition, size = 'sm' }) => {
  const config = CONDITION_CONFIG[condition] || { label: condition, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`${SIZE_TEXT[size] || 'text-sm'} font-medium px-2 py-0.5 rounded-full ${config.color}`}>
      {condition} · {config.label}
    </span>
  );
};

export default ConditionBadge;
