import { formatPrice } from './ListingCard';

const ESCROW_STATES = {
  pending:         { label: 'Awaiting Payment', bg: '#F3F4F6', color: '#374151', borderColor: '#D1D5DB', icon: '⏳' },
  held:            { label: 'Escrow Held',      bg: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B', icon: '🔒' },
  released:        { label: 'Escrow Released',  bg: '#DCFCE7', color: '#15803D', borderColor: '#16A34A', icon: '✅' },
  refunded:        { label: 'Refunded',         bg: '#DBEAFE', color: '#1D4ED8', borderColor: '#2563EB', icon: '↩️' },
  partial_release: { label: 'Partial Release',  bg: '#FED7AA', color: '#9A3412', borderColor: '#EA580C', icon: '⚖️' },
};

const EscrowStatus = ({ status, amount }) => {
  const cfg = ESCROW_STATES[status] || ESCROW_STATES.pending;
  return (
    <div style={{
      background: cfg.bg,
      borderLeft: `4px solid ${cfg.borderColor}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ fontSize: 24 }}>{cfg.icon}</span>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: cfg.color, margin: 0 }}>{cfg.label}</p>
        {amount && (
          <p style={{ fontSize: 13, color: cfg.color, opacity: 0.8, margin: '2px 0 0' }}>
            {formatPrice(amount)}{status === 'held' ? ' held safely in escrow' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default EscrowStatus;
