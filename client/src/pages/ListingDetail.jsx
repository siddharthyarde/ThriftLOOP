import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import TryOnModal from '../components/TryOnModal';
import ChatWindow from '../components/ChatWindow';
import { Photo, Stars, Footer } from '../components/Shared';
import ListingCard, { ConditionBadge, formatPrice } from '../components/ListingCard';
import * as I from '../components/Icons';

const PH_VARIANTS = ["ph-soft","ph-warm","ph-dots","ph-stripes"];

const trackRecentlyViewed = (id) => {
  const prev = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
  const next = [id, ...prev.filter(i => i !== id)].slice(0, 10);
  localStorage.setItem('recently_viewed', JSON.stringify(next));
};

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [readMore, setReadMore] = useState(false);
  const [variant, setVariant] = useState("Buy");
  const [showTryOn, setShowTryOn] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/api/listings/${id}`);
        setListing(data);
      } catch {
        toast.error('Listing not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    if (user) {
      api.get(`/api/wishlist/check/${id}`).then(r => setSaved(r.data.saved)).catch(() => {});
    }
    api.post(`/api/listings/${id}/view`).catch(() => {});
    trackRecentlyViewed(id);
    api.get('/api/listings?limit=4').then(r => setRelated(r.data.listings || [])).catch(() => {});
  }, [id]); // eslint-disable-line

  const toggleWishlist = async () => {
    if (!user) return navigate('/login');
    try {
      if (saved) { await api.delete(`/api/wishlist/${id}`); }
      else { await api.post(`/api/wishlist/${id}`); }
      setSaved(s => !s);
      toast.success(saved ? 'Removed from wishlist' : 'Added to wishlist');
    } catch { toast.error('Could not update wishlist'); }
  };

  const handleBuy = async () => {
    if (!user) return navigate('/login');
    setBuyLoading(true);
    try {
      const { data } = await api.post('/api/transactions', { listing_id: listing.id, type: 'buy', delivery_type: 'meetup' });
      navigate(`/order/${data.transaction.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate purchase');
    } finally {
      setBuyLoading(false);
    }
  };

  if (loading) return (
    <div style={{ padding:"120px 32px", textAlign:"center", color:"var(--ink-mute)" }}>
      <div style={{ fontSize:14 }}>Loading…</div>
    </div>
  );
  if (!listing) return null;

  const isOwner = user?.id === listing.seller_id;
  const available = listing.available_for || [];
  const images = listing.images || [];
  const seller = listing.users || {};
  const desc = listing.description || '';
  const gallery = images.length > 0 ? images : PH_VARIANTS;
  const isUrl = images.length > 0;

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ padding:"20px 32px 8px", display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"var(--ink-mute)" }}>
        <span style={{ cursor:"pointer" }} onClick={() => navigate('/')}>Browse</span>
        <I.ChevronR size={12}/>
        <span style={{ cursor:"pointer" }}>{listing.category}</span>
        <I.ChevronR size={12}/>
        <span style={{ color:"var(--ink)" }}>{listing.title}</span>
      </div>

      {/* Main two-column */}
      <section style={{ padding:"24px 32px 32px", display:"grid", gridTemplateColumns:"1.15fr 1fr", gap:36 }}>
        {/* Gallery */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ position:"relative", borderRadius:22, overflow:"hidden" }}>
            {isUrl ? (
              <div style={{ aspectRatio:"4/5", borderRadius:22, overflow:"hidden", background:"var(--surface)" }}>
                <img src={gallery[activeImg]} alt={listing.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} className="fade-in"/>
              </div>
            ) : (
              <Photo variant={gallery[activeImg]} aspect="4/5" className="fade-in" style={{ borderRadius:22 }}>
                <div style={{ position:"absolute", top:18, left:18, display:"flex", gap:6, zIndex:2 }}>
                  <span className="pill pill-dark" style={{ fontSize:11 }}>VERIFIED</span>
                  {available.includes('swap') && <span className="pill" style={{ fontSize:11, background:"var(--bg)" }}>SWAP</span>}
                  {available.includes('rental') && <span className="pill" style={{ fontSize:11, background:"var(--accent)", color:"#fff", border:0 }}>RENT</span>}
                </div>
              </Photo>
            )}
            <button className="icon-btn" onClick={toggleWishlist}
              style={{
                position:"absolute", top:14, right:14, zIndex:2,
                width:44, height:44, background:"color-mix(in srgb, var(--bg) 80%, transparent)",
                color: saved ? "var(--accent)" : "var(--ink)", backdropFilter:"blur(8px)",
              }}>
              <I.Heart size={20} filled={saved}/>
            </button>
            <span style={{
              position:"absolute", bottom:14, right:14, zIndex:2,
              padding:"5px 10px", borderRadius:99,
              background:"color-mix(in srgb, var(--primary) 85%, transparent)", color:"var(--primary-ink)",
              fontSize:11, fontFamily:"var(--mono)",
            }}>{activeImg + 1} / {gallery.length}</span>
          </div>

          {/* Thumb row */}
          <div style={{ display:"flex", gap:10 }}>
            {gallery.map((g, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                style={{
                  flex:1, padding:0, border:0, borderRadius:10, overflow:"hidden",
                  outline: activeImg === i ? "2px solid var(--accent)" : "2px solid transparent",
                  outlineOffset:2, cursor:"pointer", transition:"outline-color .2s",
                }}>
                {isUrl
                  ? <img src={g} alt="" style={{ width:"100%", aspectRatio:"1/1", objectFit:"cover", borderRadius:10, display:"block" }}/>
                  : <Photo variant={g} aspect="1/1" style={{ borderRadius:10 }}/>
                }
              </button>
            ))}
          </div>

          {/* Description */}
          {desc && (
            <div style={{ marginTop:24 }}>
              <h3 className="eyebrow" style={{ marginBottom:12 }}>Description</h3>
              <p style={{
                margin:0, fontSize:15, color:"var(--ink-2)", lineHeight:1.7,
                maxHeight: readMore ? "none" : 110, overflow:"hidden", position:"relative",
              }}>
                {desc}
                {!readMore && (
                  <span style={{
                    position:"absolute", bottom:0, left:0, right:0, height:50,
                    background:"linear-gradient(to bottom, transparent, var(--bg))",
                  }}/>
                )}
              </p>
              <button className="btn btn-ghost btn-sm" onClick={() => setReadMore(!readMore)}
                style={{ marginTop:6, padding:"6px 0", color:"var(--ink)" }}>
                {readMore ? "Show less" : "Read more"} <I.Chevron size={14} style={{ transform: readMore ? "rotate(180deg)" : "none" }}/>
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <aside style={{ display:"flex", flexDirection:"column", gap:20, position:"relative" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {available.includes('buy') && <span className="pill pill-dark">FOR SALE</span>}
            {available.includes('swap') && <span className="pill">SWAP AVAILABLE</span>}
            {available.includes('rental') && <span className="pill pill-accent">RENTABLE</span>}
            {!available.length && <span className="pill pill-dark">FOR SALE</span>}
          </div>

          <div>
            <div className="small muted" style={{ marginBottom:6 }}>{listing.brand} · {listing.category}</div>
            <h1 className="serif" style={{ margin:0, fontSize:48, lineHeight:1.05, letterSpacing:"-.015em" }}>
              {listing.title}
            </h1>
          </div>

          <div style={{ display:"flex", alignItems:"baseline", gap:14 }}>
            <span className="serif" style={{ fontSize:42, lineHeight:1 }}>
              {formatPrice(listing.price)}
            </span>
            <ConditionBadge grade={listing.condition_grade || listing.condition} label={listing.condition_label}/>
          </div>

          {available.includes('rental') && listing.rental_price_per_day && (
            <div className="card" style={{ padding:14, borderRadius:12, display:"flex", alignItems:"center", gap:14, background:"var(--surface)" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"var(--accent)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I.Calendar size={18}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", lineHeight:1.3 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>Or rent it for {formatPrice(listing.rental_price_per_day)}/day</span>
                {listing.rental_deposit && <span className="small muted">+ {formatPrice(listing.rental_deposit)} refundable deposit</span>}
              </div>
            </div>
          )}

          <hr className="divider"/>

          {/* Meta grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { k:"Size",      v: listing.size },
              { k:"Category",  v: listing.category },
              { k:"Condition", v: `${listing.condition_grade || listing.condition || ''} · ${listing.condition_label || ''}` },
              { k:"City",      v: listing.locality, icon:<I.Pin size={13}/> },
            ].filter(m => m.v).map(m => (
              <div key={m.k}>
                <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:4 }}>{m.k}</div>
                <div style={{ fontSize:14.5, display:"inline-flex", alignItems:"center", gap:5 }}>{m.icon}{m.v}</div>
              </div>
            ))}
          </div>

          <hr className="divider"/>

          {/* Variant tabs — only show modes this listing actually supports */}
          <div className="tab-row" style={{ width:"100%" }}>
            {[
              "Buy",
              ...(available.includes('swap') ? ["Swap"] : []),
              ...(available.includes('rental') ? ["Rent"] : []),
            ].map(v => (
              <button key={v} className={`tab${variant === v ? " on" : ""}`}
                onClick={() => setVariant(v)} style={{ flex:1, padding:"10px 16px" }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
                  {v === "Buy"  && <I.Cart size={14}/>}
                  {v === "Swap" && <I.Swap size={14}/>}
                  {v === "Rent" && <I.Calendar size={14}/>}
                  {v}
                </span>
              </button>
            ))}
          </div>

          {/* Primary action */}
          {!isOwner ? (
            <>
              {variant === "Buy" && (
                <button className="btn btn-primary btn-lg" style={{ width:"100%", padding:16 }}
                  onClick={handleBuy} disabled={buyLoading || listing.status !== 'active'}>
                  {buyLoading ? "Processing…" : listing.status !== 'active' ? "Not Available" : <>Buy now — {formatPrice(listing.price)} <I.Arrow size={16}/></>}
                </button>
              )}
              {variant === "Swap" && (
                <button className="btn btn-primary btn-lg" style={{ width:"100%", padding:16 }}
                  onClick={() => navigate(`/swap?target=${listing.id}`)}>
                  <I.Swap size={16}/> Propose a swap
                </button>
              )}
              {variant === "Rent" && available.includes('rental') && (
                <button className="btn btn-accent btn-lg" style={{ width:"100%", padding:16 }}
                  onClick={() => navigate(`/rental/${listing.id}`)}>
                  <I.Calendar size={16}/> Book rental — {formatPrice(listing.rental_price_per_day)}/day
                </button>
              )}

              <div style={{ display:"flex", gap:10 }}>
                <button className="btn" style={{ flex:1 }} onClick={() => setShowTryOn(true)}>
                  <I.Spark size={14}/> Virtual try-on
                </button>
                <button className="btn" style={{ flex:1 }} onClick={() => setShowChat(!showChat)}>
                  <I.Chat size={14}/> Message seller
                </button>
              </div>
              {showChat && <ChatWindow sellerId={listing.seller_id} listingId={listing.id} sellerName={seller.name}/>}
            </>
          ) : (
            <div style={{ display:"flex", gap:12 }}>
              <button className="btn" style={{ flex:1 }} onClick={() => navigate(`/create-listing?edit=${listing.id}`)}>Edit Listing</button>
              <button className="btn" style={{ flex:1, borderColor:"var(--ink)", color:"var(--ink)" }}
                onClick={async () => {
                  try { await api.put(`/api/listings/${listing.id}/delist`); toast.success('Listing delisted'); navigate('/dashboard'); }
                  catch { toast.error('Could not delist'); }
                }}>Delist Item</button>
            </div>
          )}

          {/* Engagement stats */}
          <div style={{ display:"flex", gap:18, fontSize:12.5, color:"var(--ink-mute)" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Eye size={14}/> {listing.views || 0} views</span>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Heart size={14}/> {listing.saves || 0} saves</span>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Shield size={14}/> Escrow protected</span>
          </div>

          {/* Seller card */}
          {seller.name && (
            <div className="card" style={{ padding:18, borderRadius:16, marginTop:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:54, height:54, borderRadius:"50%", overflow:"hidden", background:"var(--surface-2)", flexShrink:0 }}>
                  {seller.avatar_url
                    ? <img src={seller.avatar_url} alt={seller.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <div style={{ width:"100%", height:"100%", display:"grid", placeItems:"center", fontWeight:600, fontSize:20, color:"var(--ink)" }}>{seller.name?.[0]}</div>
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:600, fontSize:15 }}>{seller.name}</span>
                    {seller.verified && <I.Verified size={15} style={{ color:"var(--accent)" }}/>}
                  </div>
                  <div className="small muted" style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                    <Stars value={seller.trust_score || 4.8} size={11}/>
                    <span>· {seller.trust_score?.toFixed(1) || '4.8'}</span>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => navigate(`/storefront/${listing.seller_id}`)}>View store <I.Arrow size={13}/></button>
              </div>
            </div>
          )}

          {/* Trust badges */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, padding:"14px 0 0", borderTop:"1px solid var(--border)" }}>
            {[
              { icon:<I.Shield size={16}/>, l:"Escrow held",   s:"Until delivered" },
              { icon:<I.Truck size={16}/>,  l:"Pan-India",      s:"Or meet in person" },
              { icon:<I.Reload size={16}/>, l:"48-hr returns",  s:"Condition mismatch" },
            ].map(t => (
              <div key={t.l} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <span style={{ color:"var(--accent)" }}>{t.icon}</span>
                <span style={{ fontSize:12, fontWeight:500 }}>{t.l}</span>
                <span className="small muted" style={{ fontSize:11 }}>{t.s}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {/* More from this seller */}
      {related.length > 0 && (
        <section style={{ padding:"24px 32px 56px", borderTop:"1px solid var(--border)", marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:18 }}>
            <div>
              <div className="eyebrow">More from this seller</div>
              <h2 className="serif" style={{ margin:"8px 0 0", fontSize:30, letterSpacing:"-.01em" }}>You might also like these.</h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/storefront/${listing.seller_id}`)}>
              All from {seller.name?.split(' ')[0] || 'Seller'} <I.Arrow size={14}/>
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:20 }}>
            {related.slice(0, 4).map(it => <ListingCard key={it.id} item={it}/>)}
          </div>
        </section>
      )}

      <Footer/>

      {showTryOn && <TryOnModal listing={listing} onClose={() => setShowTryOn(false)}/>}
    </>
  );
}
