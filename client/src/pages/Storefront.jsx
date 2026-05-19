import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import { Photo, Stars, Footer } from '../components/Shared';
import * as I from '../components/Icons';

export default function Storefront() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listingTab, setListingTab] = useState('All');

  useEffect(() => {
    api.get(`/api/storefront/${id}`)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <section style={{ padding: '32px 32px 56px' }}>
      <div style={{ height: 320, borderRadius: 22, background: 'var(--surface)', animation: 'pulse 1.5s infinite', marginBottom: 24 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ aspectRatio: '3/4', borderRadius: 16, background: 'var(--surface)', animation: 'pulse 1.5s infinite' }}/>
        ))}
      </div>
    </section>
  );

  if (!data) return (
    <section style={{ textAlign: 'center', padding: '80px 32px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
      <p className="muted">User not found</p>
    </section>
  );

  const { user, listings, total_sales, vouches } = data;

  const filteredListings = listings.filter(l => {
    if (listingTab === 'Buy') return !l.swap_ok && !l.rent_ok;
    if (listingTab === 'Swap') return l.swap_ok;
    if (listingTab === 'Rent') return l.rent_ok;
    return true;
  });

  return (
    <>
      <section style={{ padding: '32px 32px 0' }}>
        <div className="card" style={{
          padding: 0, borderRadius: 22, overflow: 'hidden',
          display: 'grid', gridTemplateColumns: '1fr 1.4fr', minHeight: 320,
        }}>
          {/* Left — seller info */}
          <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} alt={user.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}/>
                  : <Photo variant="ph-soft" style={{ width: 72, height: 72, borderRadius: '50%' }}/>
                }
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h1 className="serif" style={{ margin: 0, fontSize: 32, letterSpacing: '-.01em' }}>{user.name}</h1>
                    {user.verified && <span className="pill pill-accent"><I.Verified size={11}/> Verified</span>}
                  </div>
                  <div className="small muted" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {user.locality && <><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Pin size={11}/>{user.locality}</span></>}
                  </div>
                </div>
              </div>
              {user.bio && (
                <p className="muted" style={{ margin: '24px 0 0', fontSize: 15, lineHeight: 1.65, maxWidth: 420 }}>{user.bio}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button className="btn btn-primary"><I.Plus size={14}/> Follow</button>
              <button className="btn" onClick={async () => {
                if (!currentUser) { navigate('/login'); return; }
                try {
                  const res = await api.post('/api/chat/conversations', { other_user_id: id });
                  navigate('/chat/' + res.data.id);
                } catch { toast.error('Could not start conversation'); }
              }}><I.Chat size={14}/> Message</button>
              <button className="btn"><I.ArrowUR size={14}/> Share</button>
            </div>
          </div>

          {/* Right — stats (dark) */}
          <div style={{
            background: 'var(--primary)', color: 'var(--primary-ink)', padding: 36,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div>
              <div className="serif" style={{ fontSize: 52, lineHeight: 1 }}>{((user.trust_score || 0) / 20).toFixed(1)}</div>
              <div style={{ marginTop: 4 }}><Stars value={(user.trust_score || 0) / 20} size={14}/></div>
              <div className="small" style={{ opacity: .7, marginTop: 6 }}>Trust score</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 52, lineHeight: 1 }}>{total_sales || 0}</div>
              <div className="small" style={{ opacity: .7, marginTop: 8 }}>Items sold all-time</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 36, lineHeight: 1, color: 'var(--accent)' }}>{listings.length}</div>
              <div className="small" style={{ opacity: .7, marginTop: 6 }}>Active listings</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 36, lineHeight: 1, color: 'var(--accent)' }}>{'<24h'}</div>
              <div className="small" style={{ opacity: .7, marginTop: 6 }}>Avg. response time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Vouches strip */}
      {vouches && vouches.length > 0 && (
        <section style={{ padding: '24px 32px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: 14,
            background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex' }}>
              {vouches.slice(0, 5).map((v, i) => (
                <div key={v.voucher_id || i} style={{ marginLeft: i ? -8 : 0 }}>
                  {v.users?.avatar_url
                    ? <img src={v.users.avatar_url} alt={v.users?.name} style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--surface)', objectFit: 'cover' }}/>
                    : <Photo variant={['ph-soft','ph-warm','ph-dots','ph-stripes','ph-grid'][i % 5]} style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--surface)' }}/>
                  }
                </div>
              ))}
              {vouches.length > 5 && (
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', marginLeft: -8,
                  background: 'var(--primary)', color: 'var(--primary-ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600, border: '2px solid var(--surface)',
                }}>+{vouches.length - 5}</span>
              )}
            </div>
            <span style={{ fontSize: 14 }}>Vouched by <b>{vouches.length} {vouches.length === 1 ? 'person' : 'people'}</b></span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--ink)' }}>See vouches <I.Arrow size={12}/></button>
          </div>
        </section>
      )}

      {/* Listings */}
      <section style={{ padding: '32px 32px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Active listings</div>
            <h2 className="serif" style={{ margin: '8px 0 0', fontSize: 32, letterSpacing: '-.01em' }}>What's on the rail today.</h2>
          </div>
          <div className="tab-row">
            {['All', 'Buy', 'Swap', 'Rent'].map(t => (
              <button key={t} className={`tab${listingTab === t ? ' on' : ''}`} onClick={() => setListingTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        {filteredListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👗</div>
            <p className="muted">No active listings right now</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {filteredListings.map(it => <ListingCard key={it.id} item={it}/>)}
          </div>
        )}
      </section>

      <Footer/>
    </>
  );
}
