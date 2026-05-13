const ESCROW_STATES = {
  pending:         { label: 'Awaiting Payment', color: 'bg-gray-100 text-gray-600',     icon: '⏳' },
  held:            { label: 'Escrow Held',      color: 'bg-yellow-100 text-yellow-700', icon: '🔒' },
  released:        { label: 'Escrow Released',  color: 'bg-green-100 text-green-700',   icon: '✅' },
  refunded:        { label: 'Refunded',         color: 'bg-blue-100 text-blue-700',     icon: '↩️' },
  partial_release: { label: 'Partial Release',  color: 'bg-orange-100 text-orange-700', icon: '⚖️' },
};

const EscrowStatus = ({ status, amount }) => {
  const config = ESCROW_STATES[status] || ESCROW_STATES.pending;
  return (
    <div className={`rounded-2xl p-4 flex items-center gap-3 ${config.color}`}>
      <span className="text-2xl">{config.icon}</span>
      <div>
        <p className="font-semibold">{config.label}</p>
        {amount && (
          <p className="text-sm opacity-80">
            ₹{amount.toLocaleString()} {status === 'held' ? 'held safely' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default EscrowStatus;
