import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import { Photo, Stars, Footer, SectionHead } from '../components/Shared';
import * as I from '../components/Icons';

const CATEGORIES = [
  { id:"all",     label:"Everything", count:12480, glyph:"all" },
  { id:"tops",    label:"Tops",        count:2840,  glyph:"top" },
  { id:"bottoms", label:"Bottoms",     count:1920,  glyph:"bot" },
  { id:"dresses", label:"Dresses",     count:1410,  glyph:"drs" },
  { id:"outer",   label:"Outerwear",   count:980,   glyph:"out" },
  { id:"shoes",   label:"Shoes",       count:1670,  glyph:"shz" },
  { id:"bags",    label:"Bags",        count:840,   glyph:"bag" },
  { id:"ethnic",  label:"Ethnic",      count:1120,  glyph:"eth" },
  { id:"acc",     label:"Accessories", count:1700,  glyph:"acc" },
];

const TRUSTED_SELLERS = [
  { name:"Aanya R.",  city:"Mumbai",    score:4.9, sales:142, ph:"ph-soft"   },
  { name:"Kabir M.",  city:"Bengaluru", score:4.8, sales:88,  ph:"ph-warm"   },
  { name:"Diya S.",   city:"Delhi",     score:4.95,sales:206, ph:"ph-dots"   },
  { name:"Rohan T.",  city:"Pune",      score:4.7, sales:64,  ph:"ph-stripes"},
];

function Stat({ n, k, accent }) {
  return (
    <div>
      <div className="serif" style={{ fontSize:28, color: accent ? "var(--accent)" : "var(--ink)", lineHeight:1 }}>{n}</div>
      <div className="small muted" style={{ marginTop:4, textTransform:"uppercase", letterSpacing:".1em", fontSize:10.5 }}>{k}</div>
    </div>
  );
}

function HeroCollageDefault({ onBrowse, onSwap, onImpact }) {
  return (
    <section style={{ padding:"40px 32px 32px", position:"relative" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.15fr 1fr", gap:24, alignItems:"stretch" }}>
        {/* Left — copy */}
        <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between", gap:24, padding:"24px 8px 24px 0" }}>
          <div className="eyebrow">
            <span>New drops every day</span>
            <span style={{ marginLeft:6, color:"var(--ink-mute)" }}>· est. 2024</span>
          </div>

          <h1 className="serif" style={{
            margin:0, fontSize:"clamp(72px, 7vw, 112px)",
            lineHeight:0.92, letterSpacing:"-0.025em", color:"var(--ink)",
          }}>
            Pre-loved<br/>
            fashion,<br/>
            <span style={{ fontStyle:"italic", color:"var(--accent)" }}>re­imagined.</span>
          </h1>

          <p className="muted" style={{ maxWidth:460, margin:0, fontSize:16, lineHeight:1.55 }}>
            Shop, swap, or rent verified second-hand pieces from real people across India.
            Every item is graded, every seller is vouched for.
          </p>

          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <button className="btn btn-primary btn-lg" onClick={onBrowse}>
              Browse listings <I.Arrow size={16}/>
            </button>
            <button className="btn btn-lg" onClick={onSwap}>
              <I.Swap size={16}/> Swap something
            </button>
          </div>

          <div style={{ display:"flex", gap:32, borderTop:"1px solid var(--border)", paddingTop:20, marginTop:8 }}>
            <Stat n="12.4k" k="active listings"/>
            <Stat n="8.2k"  k="verified sellers"/>
            <Stat n="↑ 96%" k="match rate" accent/>
          </div>
        </div>

        {/* Right — asymmetric collage */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"1.1fr 1fr 1fr",
          gridTemplateRows:"140px 110px 110px 120px",
          gap:12, position:"relative",
        }}>
          <Photo variant="ph-soft" label="Camel overcoat — Aanya R."
            style={{ gridColumn:"1 / span 2", gridRow:"1 / span 2", borderRadius:16, position:"relative" }}>
            <span className="pill pill-dark" style={{ position:"absolute", top:14, left:14, zIndex:1 }}>FEATURED</span>
          </Photo>
          <Photo variant="ph-warm"    label="Y2K jacket"      style={{ gridColumn:"3", gridRow:"1", borderRadius:14 }}/>
          <Photo variant="ph-stripes" label="Vintage Levi's"  style={{ gridColumn:"3", gridRow:"2", borderRadius:14 }}/>
          <Photo variant="ph-dots"    label="Silk slip dress" style={{ gridColumn:"1", gridRow:"3", borderRadius:14 }}/>
          <Photo variant="ph-grid"    label="Crossbody bag"   style={{ gridColumn:"2", gridRow:"3", borderRadius:14 }}/>
          <Photo variant="ph-deep"    label="Linen trousers"  style={{ gridColumn:"3", gridRow:"3", borderRadius:14 }}/>
          <div onClick={onImpact} style={{
            gridColumn:"1 / span 3", gridRow:"4",
            display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
            background:"var(--primary)", color:"var(--primary-ink)", borderRadius:14,
            cursor:"pointer",
          }}>
            <I.Leaf size={20}/>
            <div style={{ display:"flex", flexDirection:"column", lineHeight:1.2 }}>
              <span style={{ fontWeight:600, fontSize:14 }}>You'll save ~2.4 kg CO₂</span>
              <span style={{ fontSize:12, opacity:.7 }}>per item, vs buying new</span>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
              <span className="mono" style={{ fontSize:11, opacity:.7 }}>IMPACT TRACKER</span>
              <I.ArrowUR size={14}/>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TickerStrip() {
  const phrases = [
    "FREE SHIPPING OVER ₹999",
    "VERIFIED SELLERS",
    "ESCROW-PROTECTED PAYMENTS",
    "RENT FROM ₹80/DAY",
    "GRADED BY HUMANS",
    "PRE-LOVED IN INDIA",
  ];
  const items = [...phrases, ...phrases];
  return (
    <div style={{
      borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)",
      padding:"12px 0", overflow:"hidden", background:"var(--surface)",
    }}>
      <div className="marquee">
        {items.map((t, i) => (
          <span key={i} className="mono" style={{
            fontSize:11, letterSpacing:".18em", color:"var(--ink-2)",
            display:"inline-flex", alignItems:"center", gap:18,
          }}>
            {t} <I.Spark size={12} style={{ color:"var(--accent)" }}/>
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryRail({ active, onSelect }) {
  return (
    <div style={{ padding:"36px 32px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18 }}>
        <div>
          <div className="eyebrow">Shop by category</div>
          <h2 className="serif" style={{ margin:"8px 0 0", fontSize:32, letterSpacing:"-.01em" }}>What are you wearing today?</h2>
        </div>
        <button className="btn btn-ghost btn-sm">View all <I.Arrow size={14}/></button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(9, 1fr)", gap:10 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className="lift"
            style={{
              border:"1px solid var(--border)",
              background: active === c.id ? "var(--primary)" : "var(--surface)",
              color: active === c.id ? "var(--primary-ink)" : "var(--ink)",
              borderRadius:12, padding:10, cursor:"pointer",
              display:"flex", flexDirection:"column", gap:8, alignItems:"flex-start",
              transition:"all .25s ease",
            }}>
            <div style={{
              width:"100%", aspectRatio:"1/1", borderRadius:8,
              background: active === c.id ? "var(--surface-2)" : "var(--bg)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color: active === c.id ? "var(--primary)" : "var(--ink)",
              fontFamily:"var(--serif)", fontSize:24, letterSpacing:"-.02em",
            }}>
              {c.glyph}
            </div>
            <div style={{ textAlign:"left", width:"100%" }}>
              <div style={{ fontSize:12.5, fontWeight:500 }}>{c.label}</div>
              <div className="small" style={{ opacity:.65, fontSize:10.5 }}>{c.count.toLocaleString("en-IN")}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterBar({ activeFilters, setFilters, sortBy, setSortBy, showFilters, setShowFilters, resultCount }) {
  return (
    <div style={{ padding:"0 32px" }}>
      <div className="card" style={{
        padding:14, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
        background:"var(--surface)", borderRadius:16,
      }}>
        <button className="chip" onClick={() => setShowFilters(!showFilters)}>
          <I.Filter size={14}/> Filters
          {Object.values(activeFilters).filter(Boolean).length > 0 && (
            <span style={{
              minWidth:18, height:18, padding:"0 5px", borderRadius:99,
              background:"var(--accent)", color:"#fff", fontSize:10,
              display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:700,
            }}>{Object.values(activeFilters).filter(Boolean).length}</span>
          )}
        </button>
        <div style={{ width:1, height:24, background:"var(--border)" }}/>
        {["For sale","For swap","For rent","Verified seller"].map(t => (
          <button key={t} className={`chip${activeFilters[t] ? " on" : ""}`}
            onClick={() => setFilters({ ...activeFilters, [t]: !activeFilters[t] })}>
            {t}
          </button>
        ))}
        <span className="muted small" style={{ marginLeft:"auto" }}>
          {resultCount.toLocaleString("en-IN")} listings
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:8, borderLeft:"1px solid var(--border)" }}>
          <I.Sort size={14} style={{ color:"var(--ink-mute)" }}/>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{
              background:"transparent", border:0, color:"var(--ink)", fontSize:13,
              fontFamily:"inherit", cursor:"pointer", padding:"4px 8px 4px 0",
            }}>
            <option>Newest</option>
            <option>Price: Low → High</option>
            <option>Price: High → Low</option>
            <option>Most saved</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="fade-in" style={{
          marginTop:10, padding:18,
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:16,
          display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14,
        }}>
          {[
            { label:"Category", opts:["Everything","Tops","Bottoms","Dresses","Outerwear","Shoes","Bags","Ethnic"] },
            { label:"Size",     opts:["XS","S","M","L","XL","XXL"] },
            { label:"Condition",opts:["Like New (A)","Good (B)","Fair (C)","Worn (D)"] },
            { label:"City",     opts:["Mumbai","Delhi","Bengaluru","Pune","Chennai","Hyderabad","Kolkata","Jaipur"] },
          ].map(f => (
            <div key={f.label}>
              <label className="small muted" style={{ display:"block", marginBottom:6, letterSpacing:".06em", textTransform:"uppercase", fontSize:10.5 }}>{f.label}</label>
              <select className="input" style={{ padding:"10px 12px", fontSize:13 }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{ gridColumn:"1 / span 2" }}>
            <label className="small muted" style={{ display:"block", marginBottom:6, letterSpacing:".06em", textTransform:"uppercase", fontSize:10.5 }}>Price range (₹)</label>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input className="input" placeholder="Min" style={{ padding:"10px 12px", fontSize:13 }}/>
              <span className="muted">—</span>
              <input className="input" placeholder="Max" style={{ padding:"10px 12px", fontSize:13 }}/>
            </div>
          </div>
          <div style={{ gridColumn:"3 / span 2", display:"flex", alignItems:"flex-end", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-ghost btn-sm">Reset</button>
            <button className="btn btn-primary btn-sm">Apply filters</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorialStrip({ navigate }) {
  return (
    <div style={{ padding:"40px 32px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16 }}>
        <div className="lift" style={{ borderRadius:18, overflow:"hidden", position:"relative", cursor:"pointer" }}
          onClick={() => navigate('/')}>
          <Photo variant="ph-soft" aspect="16/9" style={{ borderRadius:0 }}/>
          <div style={{
            position:"absolute", inset:0, padding:28, display:"flex", flexDirection:"column", justifyContent:"flex-end",
            background:"linear-gradient(0deg, rgba(31,42,31,.7) 0%, rgba(31,42,31,.1) 60%, transparent 100%)",
            color:"#fff",
          }}>
            <span className="eyebrow" style={{ color:"rgba(255,255,255,.85)" }}>Drop 09 · Curated</span>
            <h3 className="serif" style={{ margin:"10px 0 6px", fontSize:34, lineHeight:1.05, letterSpacing:"-.01em" }}>
              The Sunday Edit
            </h3>
            <p style={{ margin:0, fontSize:14, maxWidth:420, color:"rgba(255,255,255,.85)" }}>
              42 pieces hand-picked from our most trusted sellers, refreshed every weekend.
            </p>
            <button className="btn btn-sm" style={{ marginTop:14, alignSelf:"flex-start", background:"#fff", color:"var(--ink)", borderColor:"transparent" }}>
              Shop the edit <I.Arrow size={14}/>
            </button>
          </div>
        </div>

        <div className="lift" style={{
          borderRadius:18, overflow:"hidden", position:"relative", cursor:"pointer",
          background:"var(--primary)", color:"var(--primary-ink)",
          padding:28, display:"flex", flexDirection:"column", justifyContent:"space-between",
          minHeight:280,
        }} onClick={() => navigate('/swap')}>
          <div>
            <span className="eyebrow" style={{ color:"color-mix(in srgb, var(--primary-ink) 70%, transparent)" }}>The Swap Engine</span>
            <h3 className="serif" style={{ margin:"10px 0 6px", fontSize:30, lineHeight:1.05 }}>
              Trade what you don't wear for something you will.
            </h3>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Photo variant="ph-warm"    style={{ width:80, height:80, borderRadius:10 }} aspect="1/1"/>
            <I.Swap size={24} style={{ opacity:.7 }}/>
            <Photo variant="ph-stripes" style={{ width:80, height:80, borderRadius:10 }} aspect="1/1"/>
            <button className="icon-btn" style={{ marginLeft:"auto", background:"color-mix(in srgb, var(--primary-ink) 12%, transparent)", color:"var(--primary-ink)" }}>
              <I.Arrow size={18}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PH_VARIANTS = ["ph-soft","ph-warm","ph-dots","ph-stripes","ph-grid","ph-deep"];

function SellerRow({ sellers, navigate }) {
  const display = sellers.length > 0 ? sellers : TRUSTED_SELLERS;
  return (
    <div style={{ padding:"24px 32px" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:18 }}>
        <div>
          <div className="eyebrow">Trusted sellers</div>
          <h2 className="serif" style={{ margin:"8px 0 0", fontSize:32, letterSpacing:"-.01em" }}>People you'll love buying from.</h2>
        </div>
        <button className="btn btn-ghost btn-sm">All sellers <I.Arrow size={14}/></button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
        {display.map((s, idx) => (
          <div key={s.id || s.name}
            className="card lift"
            onClick={() => s.id ? navigate('/storefront/' + s.id) : undefined}
            style={{ padding:14, borderRadius:14, display:"flex", flexDirection:"column", gap:10, cursor: s.id ? "pointer" : "default" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {s.avatar_url
                ? <img src={s.avatar_url} alt={s.name} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover" }}/>
                : <Photo variant={s.ph || PH_VARIANTS[idx % PH_VARIANTS.length]} style={{ width:44, height:44, borderRadius:"50%" }}/>
              }
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13.5, fontWeight:500 }}>
                  {s.name}
                  {(s.verified || s.score >= 4.7) && <I.Verified size={13} style={{ color:"var(--accent)" }}/>}
                </div>
                <div className="small muted" style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <I.Pin size={11}/> {s.city || s.locality}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8, borderTop:"1px dashed var(--border)" }}>
              <Stars value={s.score || (s.trust_score ? s.trust_score / 20 : 4.8)} size={11}/>
              <span className="small muted">{s.sales || s.total_sales || 0} sales</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingRow({ listings, navigate, saved, onSave }) {
  return (
    <div style={{ padding:"12px 0 24px" }}>
      <div style={{ padding:"0 32px", display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:18 }}>
        <div>
          <div className="eyebrow">Trending this week</div>
          <h2 className="serif" style={{ margin:"8px 0 0", fontSize:32, letterSpacing:"-.01em" }}>What India is shopping right now.</h2>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button className="icon-btn"><I.ArrowLeft size={16}/></button>
          <button className="icon-btn"><I.Arrow size={16}/></button>
        </div>
      </div>
      <div className="scroll-x" style={{ padding:"0 32px" }}>
        {listings.map(it => (
          <div key={it.id} style={{ width:220 }}>
            <ListingCard item={it} saved={saved.has(it.id)} onSave={onSave}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingsGrid({ listings, navigate, saved, onSave }) {
  return (
    <div style={{
      padding:"0 32px 40px",
      display:"grid",
      gridTemplateColumns:"repeat(4, 1fr)",
      gap:20,
    }}>
      {listings.map(it => (
        <ListingCard key={it.id} item={it} saved={saved.has(it.id)} onSave={onSave}/>
      ))}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState([]);
  const [trending, setTrending] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [chipFilters, setChipFilters] = useState({});
  const [sortBy, setSortBy] = useState("Newest");
  const [saved, setSaved] = useState(new Set());

  const sortMap = {
    "Newest": "created_at",
    "Price: Low → High": "price",
    "Price: High → Low": "price_desc",
    "Most saved": "views",
  };

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          ...(searchParams.get('q') ? { q: searchParams.get('q') } : {}),
          sort: sortMap[sortBy] || "created_at",
          page,
          limit: 20,
        });
        const { data } = await api.get(`/api/listings?${params}`);
        setListings(data.listings || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [searchParams, page, sortBy]); // eslint-disable-line

  useEffect(() => {
    api.get('/api/listings/trending?limit=6').then(r => setTrending(r.data || [])).catch(() => {});
    api.get('/api/listings?sort=views&limit=12').then(r => {
      const seen = new Set();
      const unique = [];
      for (const l of (r.data?.listings || [])) {
        const s = l.users;
        if (s?.id && !seen.has(s.id)) { seen.add(s.id); unique.push(s); }
        if (unique.length >= 4) break;
      }
      setSellers(unique);
    }).catch(() => {});
  }, []);

  const toggleSave = (item) => {
    const next = new Set(saved);
    next.has(item.id) ? next.delete(item.id) : next.add(item.id);
    setSaved(next);
  };

  const displayListings = listings.length > 0 ? listings : [];
  const displayTrending = trending.length > 0 ? trending : listings.slice(0, 6);

  return (
    <>
      <HeroCollageDefault
        onBrowse={() => document.getElementById('all-listings')?.scrollIntoView({ behavior:'smooth' })}
        onSwap={() => navigate('/swap')}
        onImpact={() => navigate('/profile')}
      />

      <TickerStrip/>

      <CategoryRail active={category} onSelect={setCategory}/>

      <FilterBar
        activeFilters={chipFilters}
        setFilters={setChipFilters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        resultCount={total || 12480}
      />

      <div style={{ height:32 }}/>

      {displayTrending.length > 0 && (
        <TrendingRow listings={displayTrending} navigate={navigate} saved={saved} onSave={toggleSave}/>
      )}

      <EditorialStrip navigate={navigate}/>

      <div style={{ padding:"24px 32px 18px", display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div>
          <div className="eyebrow">All listings</div>
          <h2 className="serif" style={{ margin:"8px 0 0", fontSize:32, letterSpacing:"-.01em" }}>Fresh off the rack.</h2>
        </div>
        <div className="tab-row">
          <button className="tab on">Grid</button>
          <button className="tab">Map</button>
        </div>
      </div>

      <div id="all-listings">
        {loading ? (
          <div style={{
            padding:"0 32px 40px",
            display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:20,
          }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                aspectRatio:"4/5", borderRadius:14,
                background:"var(--surface)",
                animation:"pulse 1.5s ease-in-out infinite",
              }}/>
            ))}
          </div>
        ) : displayListings.length === 0 ? (
          <div style={{ textAlign:"center", padding:"64px 0" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🧥</div>
            <div style={{ fontSize:18, fontWeight:600, color:"var(--ink-mute)" }}>Nothing here yet</div>
            <div style={{ fontSize:14, color:"var(--ink-mute)", marginTop:8 }}>Try different filters</div>
          </div>
        ) : (
          <>
            <ListingsGrid listings={displayListings} navigate={navigate} saved={saved} onSave={toggleSave}/>
            {totalPages > 1 && (
              <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:40 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <I.ArrowLeft size={14}/> Prev
                </button>
                {[...Array(Math.min(totalPages, 7))].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`btn btn-sm${page === i + 1 ? " btn-primary" : " btn-ghost"}`}
                    style={{ minWidth:36, padding:"0 10px" }}>
                    {i + 1}
                  </button>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next <I.Arrow size={14}/>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <SellerRow sellers={sellers} navigate={navigate}/>

      <Footer/>
    </>
  );
}
