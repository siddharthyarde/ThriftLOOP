import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import ListingCard, { formatPrice } from '../components/ListingCard';
import { Photo, Stars, Footer } from '../components/Shared';
import * as I from '../components/Icons';

function SwapItem({ item, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
      {item.images?.[0]
        ? <img src={item.images[0]} alt={item.title} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}/>
        : <Photo variant="ph-soft" style={{ width: 60, height: 60, borderRadius: 10, flexShrink: 0 }}/>
      }
      <div style={{ minWidth: 0 }}>
        <div className="small muted" style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
        <div className="serif" style={{ fontSize: 16, marginTop: 2 }}>{formatPrice(item.price)}</div>
      </div>
    </div>
  );
}

function SwapRow({ l, v, bold, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: big ? 16 : 13 }}>
      <span style={{ opacity: bold ? 1 : .8 }}>{l}</span>
      <span className={big ? 'serif' : ''} style={{ fontSize: big ? 24 : 14, fontWeight: bold ? 600 : 400 }}>{v}</span>
    </div>
  );
}

const STATUS_COLOR = {
  pending:     'var(--ink-mute)',
  matched:     'var(--accent)',
  escrow_held: 'var(--accent-2)',
  completed:   'var(--accent)',
  cancelled:   'var(--ink-mute)',
  disputed:    '#C84A3A',
};

const STATUS_LABEL = {
  pending: 'Pending', matched: 'Matched', escrow_held: 'Escrow held',
  completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed',
};

export default function SwapEngine() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetListingId = searchParams.get('target');

  const [tab, setTab] = useState(targetListingId ? 'Propose' : 'Browse');
  const [browseable, setBrowseable] = useState([]);
  const [mySwaps, setMySwaps] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [targetListing, setTargetListing] = useState(null);
  const [selectedMine, setSelectedMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);

  const fetchBrowse = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/swap/opportunities');
      setBrowseable(Array.isArray(data) ? data : data.listings || []);
    } catch { setBrowseable([]); }
    setLoading(false);
  }, []);

  const fetchMySwaps = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/swap/me');
      setMySwaps(data || []);
    } catch { setMySwaps([]); }
    setLoading(false);
  }, []);

  const fetchProposeData = useCallback(async () => {
    setLoading(true);
    try {
      const params = targetListingId ? `?target_listing_id=${targetListingId}` : '';
      const { data } = await api.get(`/api/swap/opportunities${params}`);
      if (data.target) setTargetListing(data.target);
      const myRes = await api.get('/api/listings/me/all');
      setMyListings(myRes.data || []);
    } catch { toast.error('Could not load swap data'); }
    setLoading(false);
  }, [targetListingId]);

  useEffect(() => {
    if (tab === 'Browse')    fetchBrowse();
    if (tab === 'My swaps')  fetchMySwaps();
    if (tab === 'Propose')   fetchProposeData();
  }, [tab, fetchBrowse, fetchMySwaps, fetchProposeData]);

  const handlePropose = async () => {
    if (!selectedMine || !targetListing) return toast.error('Select your item first');
    setProposing(true);
    try {
      await api.post('/api/swap', { listing_id_a: selectedMine.id, listing_id_b: targetListing.id });
      toast.success('Swap proposed!');
      setTab('My swaps');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Proposal failed');
    } finally {
      setProposing(false);
    }
  };

  const gap = selectedMine && targetListing
    ? targetListing.price - selectedMine.price
    : 0;
  const deposit = 500;

  return (
    <>
      <section style={{ padding: '32px 32px 0' }}>
        <div className="eyebrow">Swap engine</div>
        <h1 className="serif" style={{ margin: '10px 0 4px', fontSize: 56, letterSpacing: '-.02em', lineHeight: 1 }}>
          Trade what you don't wear<br/><span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>for something you will.</span>
        </h1>
        <p className="muted" style={{ margin: '14px 0 0', fontSize: 15, maxWidth: 540 }}>
          Browse pieces marked as swap-available, then offer one of your listings in return. Pay the gap, ship in a tagged kit, done.
        </p>
      </section>

      <section style={{ padding: '24px 32px 8px' }}>
        <div className="tab-row">
          {['Browse', 'Propose', 'My swaps'].map(t => (
            <button key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </section>

      {/* Browse */}
      {tab === 'Browse' && (
        <section style={{ padding: '16px 32px 56px', overflowX: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ aspectRatio: '3/4', borderRadius: 16, background: 'var(--surface)', animation: 'pulse 1.5s infinite' }}/>
              ))}
            </div>
          ) : browseable.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
              <p className="muted">No swap-available listings yet</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {browseable.map(it => (
                <div key={it.id} className="lift card" style={{ padding: 12, borderRadius: 16, minWidth: 0 }}>
                  {it.images?.[0]
                    ? <img src={it.images[0]} alt={it.title} style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: 10, display: 'block' }}/>
                    : <Photo variant="ph-soft" aspect="4/5" style={{ borderRadius: 10 }}/>
                  }
                  <div style={{ padding: '12px 4px 4px' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <span className="serif" style={{ fontSize: 18 }}>~{formatPrice(it.price)}</span>
                      <span className="small muted">{it.city}</span>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 12, padding: '9px 14px' }}
                      onClick={() => { setTargetListing(it); setTab('Propose'); }}>
                      <I.Swap size={13}/> Propose swap
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Propose */}
      {tab === 'Propose' && (
        <section style={{ padding: '16px 32px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          {/* They offer */}
          <div className="card" style={{ padding: 20, borderRadius: 18, background: 'var(--surface)' }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>They offer</div>
            {targetListing ? (
              <div>
                {targetListing.images?.[0]
                  ? <img src={targetListing.images[0]} alt={targetListing.title} style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: 14, display: 'block' }}/>
                  : <Photo variant="ph-soft" aspect="4/5" style={{ borderRadius: 14 }}/>
                }
                <div className="serif" style={{ fontSize: 22, marginTop: 14, letterSpacing: '-.005em' }}>{targetListing.title}</div>
                <div className="small muted" style={{ marginTop: 4 }}>{targetListing.brand} · Size {targetListing.size}</div>
                <div className="serif" style={{ marginTop: 10, fontSize: 26 }}>{formatPrice(targetListing.price)}</div>
              </div>
            ) : (
              <p className="muted small">Pick something from the Browse tab.</p>
            )}
          </div>

          {/* You offer */}
          <div className="card" style={{ padding: 20, borderRadius: 18, background: 'var(--surface)' }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>You offer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflow: 'auto' }}>
              {myListings.map(it => {
                const on = selectedMine?.id === it.id;
                return (
                  <button key={it.id} onClick={() => setSelectedMine(it)}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'center', padding: 10,
                      border: `1.5px solid ${on ? 'var(--ink)' : 'var(--border)'}`,
                      background: on ? 'var(--bg)' : 'transparent',
                      borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    }}>
                    {it.images?.[0]
                      ? <img src={it.images[0]} alt={it.title} style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}/>
                      : <Photo variant="ph-soft" style={{ width: 54, height: 54, borderRadius: 8, flexShrink: 0 }}/>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                      <div className="small muted">Size {it.size} · {it.brand}</div>
                    </div>
                    <span className="serif" style={{ fontSize: 16 }}>{formatPrice(it.price)}</span>
                  </button>
                );
              })}
              {myListings.length === 0 && !loading && (
                <p className="muted small">No active listings. <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/create-listing')}>Create one →</span></p>
              )}
            </div>
          </div>

          {/* Swap summary */}
          <div className="card" style={{ padding: 20, borderRadius: 18, background: 'var(--primary)', color: 'var(--primary-ink)' }}>
            <div className="eyebrow" style={{ color: 'color-mix(in srgb, var(--primary-ink) 65%, transparent)', marginBottom: 14 }}>Swap summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SwapRow l={`Their item — ${targetListing?.title || '—'}`} v={targetListing ? formatPrice(targetListing.price) : '—'}/>
              <SwapRow l={`Your item — ${selectedMine?.title || '—'}`} v={selectedMine ? formatPrice(selectedMine.price) : '—'}/>
              <hr style={{ border: 0, borderTop: '1px solid color-mix(in srgb, var(--primary-ink) 18%, transparent)' }}/>
              <SwapRow l={gap >= 0 ? 'Gap (you pay)' : 'Gap (you receive)'} v={formatPrice(Math.abs(gap))} bold/>
              <SwapRow l="Safety deposit (refundable)" v={formatPrice(deposit)}/>
              <hr style={{ border: 0, borderTop: '1px solid color-mix(in srgb, var(--primary-ink) 18%, transparent)' }}/>
              <SwapRow l="Total today" v={formatPrice(Math.max(gap, 0) + deposit)} big/>
              <button className="btn btn-lg" disabled={!selectedMine || !targetListing || proposing}
                onClick={handlePropose}
                style={{ marginTop: 12, background: 'var(--accent)', color: '#fff', border: 0, opacity: selectedMine && targetListing ? 1 : .5 }}>
                <I.Swap size={16}/> {proposing ? 'Proposing…' : 'Propose swap'}
              </button>
              <p className="small" style={{ margin: '6px 0 0', opacity: .7, lineHeight: 1.5, fontSize: 12 }}>
                Both parties get a tagged shipping kit. Escrow holds gap + deposit until both items arrive.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* My swaps */}
      {tab === 'My swaps' && (
        <section style={{ padding: '16px 32px 56px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 90, borderRadius: 14, background: 'var(--surface)', animation: 'pulse 1.5s infinite' }}/>
            ))
          ) : mySwaps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
              <p className="muted">No swaps yet. Browse items to get started.</p>
            </div>
          ) : mySwaps.map((sw, i) => {
            const statusColor = STATUS_COLOR[sw.status] || 'var(--ink-mute)';
            const statusLabel = STATUS_LABEL[sw.status] || sw.status;
            const myItem = sw.listing_a || sw.my_listing;
            const theirItem = sw.listing_b || sw.their_listing;
            return (
              <div key={sw.id || i} className="card" style={{ padding: 16, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
                {myItem && <SwapItem item={myItem} label="You sent"/>}
                <div style={{ flexShrink: 0, color: 'var(--ink-mute)' }}><I.Swap size={26}/></div>
                {theirItem && <SwapItem item={theirItem} label="You receive"/>}
                <div style={{ flexShrink: 0, marginLeft: 12, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <span className="pill" style={{ background: 'var(--bg)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }}/> {statusLabel}
                  </span>
                  {sw.status === 'pending' && (
                    <button className="btn btn-sm">Cancel <I.Arrow size={12}/></button>
                  )}
                  {sw.status === 'matched' && (
                    <button className="btn btn-sm btn-primary" onClick={() => navigate(`/order/${sw.transaction_id}`)}>Pay &amp; proceed <I.Arrow size={12}/></button>
                  )}
                  {(sw.status === 'escrow_held' || sw.status === 'completed') && (
                    <button className="btn btn-sm" onClick={() => navigate(`/order/${sw.transaction_id}`)}>Track <I.Arrow size={12}/></button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <Footer/>
    </>
  );
}
