import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import useRazorpay from '../hooks/useRazorpay';
import EscrowStatus from '../components/EscrowStatus';
import MeetupTimer from '../components/MeetupTimer';
import QRScanner from '../components/QRScanner';
import { formatPrice } from '../components/ListingCard';
import { Photo, Footer } from '../components/Shared';
import * as I from '../components/Icons';

const QRCodeDisplay = ({ value }) => {
  const [QRC, setQRC] = useState(null);
  useEffect(() => {
    import('qrcode.react').then(m => setQRC(() => m.QRCodeSVG || m.default));
  }, []);
  if (!QRC) return <div style={{ width: 160, height: 160, background: 'var(--surface-2)', borderRadius: 8 }}/>;
  return <QRC value={value} size={160}/>;
};

const STATUS_STEPS = ['pending', 'escrow_held', 'in_transit', 'completed'];
const STEP_LABELS  = ['Payment', 'Escrow', 'In Transit', 'Complete'];

const STEP_ICONS = [
  <span className="serif" style={{ fontSize: 15 }}>₹</span>,
  <I.Shield size={18}/>,
  <I.Truck size={18}/>,
  <I.Box size={18}/>,
];

const STATUS_COLOR_MAP = {
  completed: { bg: '#DCFCE7', text: '#15803D' },
  disputed:  { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initiatePayment } = useRazorpay();

  const [txn, setTxn]         = useState(null);
  const [meetup, setMeetup]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_type: 'meetup',
    meetup_time: '',
    meetup_location: '',
  });

  const fetchTransaction = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/transactions/${id}`);
      setTxn(data);
      if (data.meetups?.[0]) setMeetup(data.meetups[0]);
    } catch {
      toast.error('Transaction not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTransaction();
    const interval = setInterval(fetchTransaction, 15000);
    return () => clearInterval(interval);
  }, [fetchTransaction]);

  const isBuyer  = txn?.buyer_id  === user?.id;
  const isSeller = txn?.seller_id === user?.id;

  const handleSetDelivery = async () => {
    try {
      await api.put(`/api/transactions/${txn.id}/delivery-type`, deliveryForm);
      toast.success('Delivery type set');
      fetchTransaction();
    } catch (err) { toast.error(err.response?.data?.error || 'Could not save'); }
  };

  const handleStartGrace = async () => {
    try {
      await api.post('/api/meetup/start-grace', { transaction_id: txn.id });
      toast.success('Grace timer started');
      fetchTransaction();
    } catch (err) { toast.error(err.response?.data?.error || 'Could not start'); }
  };

  const handleQRScanned = async (hash) => {
    try {
      await api.post('/api/meetup/confirm', { qr_hash: hash, transaction_id: txn.id });
      toast.success('Meetup confirmed! Escrow released.');
      fetchTransaction();
    } catch (err) { toast.error(err.response?.data?.error || 'QR scan failed'); }
  };

  const fileNoShow = async (role) => {
    try {
      await api.post('/api/meetup/noshow', { transaction_id: txn.id, filed_by_role: role });
      toast.success('No-show filed. Escrow refunded.');
      fetchTransaction();
    } catch (err) { toast.error(err.response?.data?.error || 'Could not file no-show'); }
  };

  const handleConfirmDelivery = async () => {
    try {
      await api.put(`/api/transactions/${txn.id}/confirm-delivery`);
      toast.success('Delivery confirmed!');
      fetchTransaction();
    } catch (err) { toast.error(err.response?.data?.error || 'Could not confirm'); }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/api/transactions/${txn.id}/cancel`);
      toast.success('Transaction cancelled');
      fetchTransaction();
    } catch (err) { toast.error(err.response?.data?.error || 'Could not cancel'); }
  };

  if (loading) return (
    <section style={{ padding: '32px 32px 56px', maxWidth: 880, margin: '0 auto' }}>
      {[180, 120, 260].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 18, background: 'var(--surface)', animation: 'pulse 1.5s infinite', marginBottom: 18 }}/>
      ))}
    </section>
  );

  if (!txn) return null;

  const listing     = txn.listings;
  const stepIdx     = Math.max(STATUS_STEPS.indexOf(txn.status), 0);
  const sc          = STATUS_COLOR_MAP[txn.status] || { bg: '#FEF3C7', text: '#92400E' };
  const isTerminal  = ['cancelled', 'disputed', 'refunded'].includes(txn.status);

  const statusPillLabel = txn.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <>
      <section style={{ padding: '32px 32px 8px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <I.ArrowLeft size={14}/> Back
        </button>
        <h1 className="serif" style={{ margin: '14px 0 0', fontSize: 44, letterSpacing: '-.015em' }}>Order tracking</h1>
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
          Transaction <span className="mono" style={{ color: 'var(--ink)' }}>#{txn.id?.slice(0, 8)}</span>
          {isBuyer && ' · You are the buyer'}
          {isSeller && ' · You are the seller'}
        </p>
      </section>

      <section style={{ padding: '24px 32px 0' }}>
        {/* Item summary */}
        <div className="card" style={{ padding: 20, borderRadius: 18, display: 'flex', gap: 18, alignItems: 'center' }}>
          {listing?.images?.[0]
            ? <img src={listing.images[0]} alt={listing.title} style={{ width: 90, height: 90, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}/>
            : <Photo variant="ph-soft" style={{ width: 90, height: 90, borderRadius: 12, flexShrink: 0 }}/>
          }
          <div style={{ flex: 1 }}>
            <div className="small muted">{listing?.brand} · {listing?.size}</div>
            <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>{listing?.title}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12.5, color: 'var(--ink-mute)' }}>
              <span>Placed {new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="serif" style={{ fontSize: 26 }}>{formatPrice(txn.amount)}</div>
            <span className="pill pill-accent" style={{ fontSize: 11, marginTop: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }}/> {statusPillLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Stepper */}
      <section style={{ padding: '32px 32px 0' }}>
        <div className="card" style={{ padding: 28, borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STEP_LABELS.map((label, i) => {
              const done   = i < stepIdx;
              const active = i === stepIdx;
              return (
                <React.Fragment key={label}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: done ? 'var(--accent)' : active ? 'var(--primary)' : 'var(--surface)',
                      color: done || active ? 'var(--primary-ink)' : 'var(--ink-mute)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: active ? '3px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1px solid var(--border)',
                      transition: 'all .35s ease',
                    }}>
                      {done ? <I.Check size={18} stroke={2.2}/> : STEP_ICONS[i]}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: active ? 500 : 400, color: done || active ? 'var(--ink)' : 'var(--ink-mute)' }}>{label}</div>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < stepIdx ? 'var(--accent)' : 'var(--border)', margin: '0 8px', marginBottom: 28, transition: 'background .4s' }}/>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Escrow status */}
          <div style={{ marginTop: 28 }}>
            <EscrowStatus transaction={txn}/>
          </div>
        </div>
      </section>

      {/* Action + Activity */}
      <section style={{ padding: '24px 32px 32px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* Action card */}
        <div className="card" style={{ padding: 22, borderRadius: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Next step</div>

          {/* Buyer: pay */}
          {isBuyer && txn.status === 'pending' && (
            <>
              <h2 className="serif" style={{ margin: 0, fontSize: 28 }}>Complete your payment</h2>
              <p className="muted" style={{ margin: '8px 0 18px', fontSize: 14 }}>Payment is held in escrow until you confirm delivery.</p>
              <button className="btn btn-primary btn-lg" onClick={() => initiatePayment(txn.id, fetchTransaction)}>
                Pay with Razorpay <I.Arrow size={16}/>
              </button>
            </>
          )}

          {/* Seller: choose delivery */}
          {isSeller && txn.status === 'escrow_held' && !txn.delivery_type && (
            <>
              <h2 className="serif" style={{ margin: 0, fontSize: 28 }}>Choose how to send</h2>
              <p className="muted" style={{ margin: '8px 0 18px', fontSize: 14 }}>Payment is secured. Now arrange delivery.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                {[
                  { id: 'meetup', icon: <I.Pin size={18}/>, l: 'Meet in person', s: 'Safe local exchange' },
                  { id: 'ship',   icon: <I.Truck size={18}/>, l: 'Ship it', s: 'Via tracked courier' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setDeliveryForm(f => ({ ...f, delivery_type: opt.id }))}
                    className="lift"
                    style={{
                      textAlign: 'left', padding: 14, cursor: 'pointer',
                      border: `1.5px solid ${deliveryForm.delivery_type === opt.id ? 'var(--ink)' : 'var(--border)'}`,
                      background: deliveryForm.delivery_type === opt.id ? 'var(--surface)' : 'var(--bg)',
                      borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center',
                    }}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, background: deliveryForm.delivery_type === opt.id ? 'var(--primary)' : 'var(--surface)', color: deliveryForm.delivery_type === opt.id ? 'var(--primary-ink)' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{opt.l}</div>
                      <div className="small muted">{opt.s}</div>
                    </div>
                  </button>
                ))}
              </div>
              {deliveryForm.delivery_type === 'meetup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  <input className="input" placeholder="Location / address" value={deliveryForm.meetup_location} onChange={e => setDeliveryForm(f => ({ ...f, meetup_location: e.target.value }))}/>
                  <input className="input" type="datetime-local" value={deliveryForm.meetup_time} onChange={e => setDeliveryForm(f => ({ ...f, meetup_time: e.target.value }))}/>
                </div>
              )}
              <button className="btn btn-primary btn-lg" onClick={handleSetDelivery}>Confirm <I.Check size={16}/></button>
            </>
          )}

          {/* Meetup flow */}
          {txn.delivery_type === 'meetup' && meetup && (
            <>
              <h2 className="serif" style={{ margin: 0, fontSize: 28 }}>
                {txn.status === 'in_transit' ? 'Meetup arranged' : 'Your overcoat is on its way.'}
              </h2>
              <p className="muted" style={{ margin: '8px 0 18px', fontSize: 14 }}>{meetup.meetup_location}</p>
              {isSeller && meetup.qr_hash && (
                <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg)', borderRadius: 12, textAlign: 'center' }}>
                  <QRCodeDisplay value={meetup.qr_hash}/>
                  <p className="small muted" style={{ marginTop: 8 }}>Show this to buyer</p>
                </div>
              )}
              {isBuyer && (
                <button className="btn btn-primary btn-lg" onClick={() => setShowScanner(true)}>
                  <I.Camera size={16}/> Scan seller's QR
                </button>
              )}
              {isSeller && meetup.grace_started_at && (
                <MeetupTimer startedAt={meetup.grace_started_at} onExpire={() => fileNoShow('seller')}/>
              )}
              {isSeller && !meetup.grace_started_at && (
                <button className="btn" onClick={handleStartGrace}>Start grace timer</button>
              )}
            </>
          )}

          {/* Buyer: confirm delivery */}
          {isBuyer && txn.status === 'in_transit' && txn.delivery_type === 'ship' && (
            <>
              <h2 className="serif" style={{ margin: 0, fontSize: 28 }}>Your order is on its way.</h2>
              <p className="muted" style={{ margin: '8px 0 18px', fontSize: 14 }}>Confirm when it arrives to release payment to the seller.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-lg" onClick={handleConfirmDelivery}>
                  <I.Check size={16}/> I received it
                </button>
                <button className="btn btn-lg" onClick={() => navigate(`/chat/${txn.conversation_id}`)}>
                  <I.Chat size={16}/> Message seller
                </button>
              </div>
            </>
          )}

          {/* Completed */}
          {txn.status === 'completed' && (
            <>
              <h2 className="serif" style={{ margin: 0, fontSize: 28 }}>All done!</h2>
              <p className="muted" style={{ margin: '8px 0 18px', fontSize: 14 }}>Transaction complete. Thank you for shopping sustainably.</p>
            </>
          )}

          {/* Cancel */}
          {!isTerminal && txn.status === 'pending' && (
            <button className="btn btn-sm" style={{ marginTop: 14, color: '#C84A3A' }} onClick={handleCancel}>Cancel order</button>
          )}

          {/* Dispute link */}
          {isBuyer && txn.status === 'completed' && (
            <div style={{ marginTop: 22, padding: 14, borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid var(--border-2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <I.Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}/>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
                Issue? You have <b>48 hours</b> after delivery to{' '}
                <span style={{ color: 'var(--ink)', borderBottom: '1px solid var(--accent)', cursor: 'pointer' }} onClick={() => navigate(`/dispute/${txn.id}`)}>file a dispute</span>.
              </p>
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div className="card" style={{ padding: 22, borderRadius: 18, background: 'var(--surface)' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 4 }}>
            {[
              { d: new Date(txn.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), t: 'Payment captured', active: true },
              txn.delivery_type && { d: txn.updated_at ? new Date(txn.updated_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—', t: `Delivery: ${txn.delivery_type === 'meetup' ? 'Meet in person' : 'Ship'}`, active: false },
              txn.status === 'completed' && { d: '—', t: 'Delivery confirmed', active: false },
            ].filter(Boolean).map((e, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.active ? 'var(--accent)' : 'var(--ink-mute)' }}/>
                  {i < arr.length - 1 && <span style={{ width: 1.5, flex: 1, background: 'var(--border)', marginTop: 4 }}/>}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 6 : 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{e.t}</div>
                  <div className="small muted" style={{ fontSize: 12 }}>{e.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showScanner && (
        <QRScanner onScan={handleQRScanned} onClose={() => setShowScanner(false)}/>
      )}

      <Footer/>
    </>
  );
}
