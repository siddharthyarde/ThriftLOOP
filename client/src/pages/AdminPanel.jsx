import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { formatPrice } from '../components/ListingCard';
import { Photo, Stars } from '../components/Shared';
import * as I from '../components/Icons';

function StatCard({ k, v, d, icon, bad }) {
  return (
    <div className="card" style={{ padding: 18, borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg)', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        {d && <span className="mono" style={{ fontSize: 11, color: bad ? '#C84A3A' : 'var(--accent)' }}>{d}</span>}
      </div>
      <div className="serif" style={{ fontSize: 30, letterSpacing: '-.01em', lineHeight: 1 }}>{v}</div>
      <div className="small muted" style={{ fontSize: 11.5, letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 6 }}>{k}</div>
    </div>
  );
}

function DisputeCard({ d, onResolve }) {
  const [res, setRes] = useState('no-action');
  const [refund, setRefund] = useState('');
  return (
    <div className="card" style={{ padding: 22, borderRadius: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{d.id?.slice(0, 8)}</span>
            <span className="pill" style={{ fontSize: 10, background: 'var(--surface-2)' }}>{d.dispute_type?.replace(/_/g, ' ')}</span>
          </div>
          <div className="serif" style={{ fontSize: 18, marginTop: 8, letterSpacing: '-.005em' }}>{d.description}</div>
          <div className="small muted" style={{ marginTop: 6 }}>
            {d.status?.replace(/_/g, ' ')} · {new Date(d.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn"><I.Chat size={16}/></button>
          <button className="icon-btn"><I.ArrowUR size={16}/></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Filer', user: d.filer_user },
          { label: 'Defendant', user: d.defendant_user },
        ].map((side, i) => (
          <div key={i} className="card" style={{ padding: 14, borderRadius: 12, background: 'var(--bg)' }}>
            <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>{side.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {side.user?.avatar_url
                ? <img src={side.user.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}/>
                : <Photo variant="ph-soft" style={{ width: 36, height: 36, borderRadius: '50%' }}/>
              }
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{side.user?.name || '—'}</div>
                <Stars value={(side.user?.trust_score || 0) / 20} size={10}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(d.evidence_urls || []).slice(i * 2, i * 2 + 2).map((url, j) => (
                <img key={j} src={url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}/>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--surface)', borderRadius: 12 }}>
        <span className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}>Resolution</span>
        <select value={res} onChange={e => setRes(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', fontFamily: 'inherit', fontSize: 13 }}>
          <option value="no-action">No action</option>
          <option value="buyer_wins">Buyer wins (full refund)</option>
          <option value="partial_refund">Partial refund</option>
          <option value="seller_wins">Seller wins</option>
        </select>
        {res === 'partial_refund' && (
          <input className="input fade-in" placeholder="Refund ₹" value={refund} onChange={e => setRefund(e.target.value)} style={{ width: 120, padding: '8px 12px', fontSize: 13 }}/>
        )}
        <button className="btn btn-primary" onClick={() => onResolve(d.id, res, res === 'partial_refund' ? Number(refund) : null)}>
          Resolve <I.Arrow size={14}/>
        </button>
      </div>
    </div>
  );
}

const TABS = ['Overview', 'Disputes', 'Users', 'Listings', 'No-shows'];
const TAB_API = {
  'Overview': 'overview',
  'Disputes': 'disputes',
  'Users': 'users',
  'Listings': 'listings',
  'No-shows': 'no-shows',
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [noShows, setNoShows] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uq, setUq] = useState('');

  const fetchTab = useCallback(async () => {
    setLoading(true);
    try {
      const key = TAB_API[tab];
      if (key === 'overview') {
        const statsRes = await api.get('/api/admin/stats');
        setStats(statsRes.data);
        setTxns(statsRes.data?.recent_transactions || []);
      } else if (key === 'disputes') {
        const { data } = await api.get('/api/dispute/admin/all');
        setDisputes(data || []);
      } else if (key === 'users') {
        const { data } = await api.get('/api/admin/users?limit=50');
        setUsers(data.users || []);
      } else if (key === 'listings') {
        const { data } = await api.get('/api/admin/listings?limit=50');
        setListings(data.listings || []);
      } else if (key === 'no-shows') {
        const { data } = await api.get('/api/admin/noshow-flags');
        setNoShows(data || []);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchTab(); }, [fetchTab]);

  const resolveDispute = async (disputeId, decision, refundAmount = null) => {
    try {
      await api.put(`/api/dispute/${disputeId}/resolve`, {
        admin_decision: decision,
        admin_notes: `Resolved by admin on ${new Date().toLocaleDateString()}`,
        refund_amount: refundAmount,
      });
      toast.success('Dispute resolved!');
      fetchTab();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to resolve'); }
  };

  const overrideTrust = async (userId, score) => {
    try {
      await api.put(`/api/admin/users/${userId}/trust-score`, { trust_score: Number(score) });
      toast.success('Trust score updated');
    } catch { toast.error('Failed to update'); }
  };

  const toggleVerified = async (userId, currentValue) => {
    try {
      await api.put(`/api/admin/users/${userId}/trust-score`, { verified: !currentValue });
      toast.success(currentValue ? 'Verification removed' : 'User verified!');
      fetchTab();
    } catch { toast.error('Failed to update'); }
  };

  const forceDelist = async (listingId) => {
    if (!window.confirm('Force delist this listing?')) return;
    try {
      await api.put(`/api/admin/listings/${listingId}/force-delist`);
      toast.success('Listing delisted');
      fetchTab();
    } catch { toast.error('Failed'); }
  };

  const statCards = stats ? [
    { k: 'Total users',        v: (stats.users || 0).toLocaleString('en-IN'),           d: '',  icon: <I.User size={16}/> },
    { k: 'Active listings',    v: (stats.listings || 0).toLocaleString('en-IN'),         d: '',  icon: <I.Tag size={16}/> },
    { k: 'Total transactions', v: (stats.transactions || 0).toLocaleString('en-IN'),     d: '',  icon: <I.Cart size={16}/> },
    { k: 'Total revenue',      v: stats.total_revenue ? formatPrice(stats.total_revenue) : '—', d: '', icon: <span className="serif" style={{ fontSize: 16 }}>₹</span> },
    { k: 'Open disputes',      v: stats.open_disputes || '0', d: '', icon: <I.Shield size={16}/>, bad: (stats.open_disputes || 0) > 0 },
    { k: 'Active rentals',     v: stats.active_rentals || '0', d: '', icon: <I.Reload size={16}/> },
    { k: 'CO₂ saved',          v: stats.sustainability?.co2_saved_kg ? `${stats.sustainability.co2_saved_kg.toFixed(1)} kg` : '—', d: '', icon: <I.Leaf size={16}/> },
    { k: 'Water saved',        v: stats.sustainability?.water_saved_l ? `${(stats.sustainability.water_saved_l / 1000).toFixed(0)} L` : '—', d: '', icon: <I.Globe size={16}/> },
  ] : [];

  const STATUS_DOT = {
    completed: 'var(--accent)', disputed: '#C84A3A', in_transit: 'var(--accent-2)',
    escrow_held: 'var(--ink-mute)', pending: 'var(--ink-mute)',
  };

  const filteredUsers = uq
    ? users.filter(u => u.name?.toLowerCase().includes(uq.toLowerCase()) || u.email?.toLowerCase().includes(uq.toLowerCase()))
    : users;

  return (
    <>
      {/* Admin top bar */}
      <header style={{ padding: '14px 32px', background: 'var(--primary)', color: 'var(--primary-ink)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I.Sliders size={14}/>
          </span>
          <span className="serif" style={{ fontSize: 18, letterSpacing: '-.005em' }}>Admin panel</span>
          <span className="pill" style={{ background: 'color-mix(in srgb, var(--primary-ink) 14%, transparent)', color: 'var(--primary-ink)', border: 0, fontSize: 10 }}>RESTRICTED</span>
        </div>
        <div style={{ flex: 1, maxWidth: 360, marginLeft: 12 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: .6 }}><I.Search size={14}/></span>
            <input className="input" placeholder="Search users, listings, transactions…"
              style={{ background: 'color-mix(in srgb, var(--primary-ink) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--primary-ink) 20%, transparent)', color: 'var(--primary-ink)', paddingLeft: 36, fontSize: 13 }}/>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <button className="icon-btn" style={{ color: 'var(--primary-ink)' }}><I.Bell size={16}/></button>
          <Photo variant="ph-soft" style={{ width: 32, height: 32, borderRadius: '50%' }}/>
          <div style={{ fontSize: 12.5 }}>
            <div style={{ fontWeight: 500 }}>Admin</div>
            <div style={{ opacity: .65, fontSize: 11 }}>Moderation</div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <section style={{ padding: '0 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '16px 20px', background: 'transparent', border: 0, cursor: 'pointer', fontSize: 14,
                color: tab === t ? 'var(--ink)' : 'var(--ink-mute)',
                fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? '2px solid var(--ink)' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {t}
              {t === 'Disputes' && disputes.length > 0 && (
                <span style={{ padding: '1px 6px', borderRadius: 99, fontSize: 10, background: 'var(--accent)', color: '#fff' }}>{disputes.filter(d => d.status === 'open').length || disputes.length}</span>
              )}
              {t === 'No-shows' && noShows.length > 0 && (
                <span style={{ padding: '1px 6px', borderRadius: 99, fontSize: 10, background: 'var(--surface-2)', color: 'var(--ink)' }}>{noShows.length}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <section style={{ padding: '24px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height: 110, borderRadius: 14, background: 'var(--surface)', animation: 'pulse 1.5s infinite' }}/>
            ))}
          </div>
        </section>
      )}

      {/* Overview */}
      {!loading && tab === 'Overview' && (
        <section style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {statCards.map(s => <StatCard key={s.k} {...s}/>)}
          </div>

          <div className="card" style={{ padding: 20, borderRadius: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="eyebrow">Recent transactions</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="chip on">All</button>
                <button className="btn btn-sm" style={{ marginLeft: 8 }}>Export CSV</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {['TXN', 'Buyer', 'Seller', 'Item', 'Amount', 'Status', ''].map((h, i) => (
                    <th key={h + i} style={{ textAlign: i === 4 ? 'right' : 'left', padding: '10px 8px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--ink-mute)', fontSize: 13 }}>No transactions yet</td></tr>
                ) : txns.map(r => (
                  <tr key={r.id} style={{ fontSize: 13.5 }}>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--border)' }} className="mono">#{r.id?.slice(0, 8)}</td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--border)' }}>{r.buyer?.name || r.buyer_id}</td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--border)' }}>{r.seller?.name || r.seller_id}</td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--border)' }}>{r.listings?.title}</td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--serif)' }}>{formatPrice(r.amount)}</td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--border)' }}>
                      <span className="pill" style={{ fontSize: 11, padding: '3px 9px', background: 'var(--bg)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_DOT[r.status] || 'var(--ink-mute)', display: 'inline-block' }}/> {r.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/order/${r.id}`)}>View <I.ChevronR size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Disputes */}
      {!loading && tab === 'Disputes' && (
        <section style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {disputes.length === 0 ? (
            <p className="muted small" style={{ textAlign: 'center', padding: '48px 0' }}>No disputes to review.</p>
          ) : disputes.map(d => <DisputeCard key={d.id} d={d} onResolve={resolveDispute}/>)}
        </section>
      )}

      {/* Users */}
      {!loading && tab === 'Users' && (
        <section style={{ padding: '24px 32px 32px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-mute)' }}><I.Search size={14}/></span>
              <input className="input" placeholder="Search by name, email, city…" style={{ paddingLeft: 36, fontSize: 13 }} value={uq} onChange={e => setUq(e.target.value)}/>
            </div>
          </div>
          <div className="card" style={{ padding: 8, borderRadius: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {['User', 'City', 'Trust', 'Role', 'Verified', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '14px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ fontSize: 13.5 }}>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}/>
                          : <Photo variant="ph-soft" style={{ width: 32, height: 32, borderRadius: '50%' }}/>
                        }
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', color: 'var(--ink-mute)' }}>{u.locality || '—'}</td>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                      <input className="input" defaultValue={u.trust_score || 0}
                        style={{ width: 62, padding: '5px 8px', fontSize: 13, textAlign: 'center', background: 'var(--bg)' }}
                        onBlur={e => overrideTrust(u.id, e.target.value)}/>
                    </td>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span className="pill" style={{ fontSize: 11, padding: '2px 9px', background: u.role === 'admin' ? 'var(--primary)' : 'var(--bg)', color: u.role === 'admin' ? 'var(--primary-ink)' : 'var(--ink)' }}>
                        {u.role || 'buyer'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                      <button className={`chip${u.verified ? ' on' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => toggleVerified(u.id, u.verified)}>
                        {u.verified ? <><I.Verified size={11}/> Verified</> : 'Not yet'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/storefront/${u.id}`)}>View store <I.Arrow size={12}/></button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-mute)' }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Listings */}
      {!loading && tab === 'Listings' && (
        <section style={{ padding: '24px 32px 32px' }}>
          <div className="card" style={{ padding: 8, borderRadius: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {['Item', 'Seller', 'Price', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '14px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listings.map(it => (
                  <tr key={it.id} style={{ fontSize: 13.5 }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {it.images?.[0]
                          ? <img src={it.images[0]} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover' }}/>
                          : <Photo variant="ph-soft" style={{ width: 42, height: 42, borderRadius: 8 }}/>
                        }
                        <div>
                          <div style={{ fontWeight: 500 }}>{it.title}</div>
                          <div className="small muted" style={{ fontSize: 11 }}>{it.brand} · {it.category}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', color: 'var(--ink-mute)' }}>{it.users?.name || '—'}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--serif)' }}>{formatPrice(it.price)}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span className="pill" style={{ fontSize: 11, padding: '3px 9px', background: 'var(--bg)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}/> {it.status || 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#C84A3A' }} onClick={() => forceDelist(it.id)}>Delist</button>
                    </td>
                  </tr>
                ))}
                {listings.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--ink-mute)' }}>No listings</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* No-shows */}
      {!loading && tab === 'No-shows' && (
        <section style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {noShows.length === 0 ? (
            <p className="muted small" style={{ textAlign: 'center', padding: '48px 0' }}>No flagged no-shows.</p>
          ) : noShows.map(n => (
            <div key={n.id} className="card" style={{ padding: 18, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
              {n.listings?.images?.[0]
                ? <img src={n.listings.images[0]} alt="" style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}/>
                : <Photo variant="ph-soft" style={{ width: 54, height: 54, borderRadius: 10, flexShrink: 0 }}/>
              }
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>#{n.transaction_id?.slice(0, 8)}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 500 }}>{n.listings?.title || 'Item'}</span>
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {n.buyer_flagged && <span className="pill" style={{ fontSize: 10, background: '#FFE7DF', color: '#C84A3A', borderColor: 'transparent' }}>Buyer flagged</span>}
                {n.seller_flagged && <span className="pill" style={{ fontSize: 10, background: '#FFE7DF', color: '#C84A3A', borderColor: 'transparent' }}>Seller flagged</span>}
              </div>
              <button className="btn btn-sm" onClick={() => navigate(`/order/${n.transaction_id}`)}>Investigate <I.Arrow size={12}/></button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
