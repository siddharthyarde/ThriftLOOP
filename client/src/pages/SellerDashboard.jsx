import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import ListingCard, { formatPrice } from '../components/ListingCard';
import { Photo, Footer } from '../components/Shared';
import * as I from '../components/Icons';

const CAT_BREAKDOWN = [
  { cat:"Tops", n:4 }, { cat:"Outerwear", n:3 }, { cat:"Bottoms", n:2 }, { cat:"Dresses", n:2 }, { cat:"Accessories", n:1 },
];

function StatCard({ k, v, d, icon, good }) {
  const positive = d?.startsWith("+") || good;
  return (
    <div className="card lift" style={{ padding:18, borderRadius:14, background:"var(--surface)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ width:30, height:30, borderRadius:8, background:"var(--bg)", color:"var(--ink-2)", display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</span>
        {d && d !== "—" && (
          <span className="mono" style={{ fontSize:11, color: positive ? "var(--accent)" : "var(--ink-mute)" }}>{d}</span>
        )}
      </div>
      <div className="serif" style={{ fontSize:30, letterSpacing:"-.01em", lineHeight:1 }}>{v}</div>
      <div className="small muted" style={{ fontSize:11.5, letterSpacing:".06em", textTransform:"uppercase", marginTop:6 }}>{k}</div>
    </div>
  );
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics/seller'),
      api.get('/api/listings/me/all'),
    ]).then(([analyticsRes, listingsRes]) => {
      setData(analyticsRes.data);
      setListings(listingsRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const summary = data?.summary || {};
  const topListing = data?.top_listing;
  const rawCats = data?.category_breakdown;
  const catBreakdown = rawCats && Object.keys(rawCats).length
    ? Object.entries(rawCats).map(([cat, count]) => ({ cat, count }))
    : CAT_BREAKDOWN;
  const recentActivity = data?.recent_activity || [];
  const max = Math.max(...catBreakdown.map(c => c.n ?? c.count ?? 1), 1);

  const stats = [
    { k:"Active listings",  v: summary.active_listings ?? "—",  d:"+2 this week",  icon:<I.Tag size={16}/>      },
    { k:"Items sold",       v: summary.items_sold ?? "—",        d:"+5 this month", icon:<I.Cart size={16}/>     },
    { k:"Total revenue",    v: summary.revenue ? formatPrice(summary.revenue) : "—", d:"+18%", icon:<span className="serif" style={{ fontSize:16 }}>₹</span> },
    { k:"Total views",      v: summary.views?.toLocaleString("en-IN") ?? "—",    d:"+24%",  icon:<I.Eye size={16}/>      },
    { k:"Total saves",      v: summary.saves?.toLocaleString("en-IN") ?? "—",    d:"+12%",  icon:<I.Heart size={16}/>    },
    { k:"Conversion rate",  v: summary.conversion_rate ? `${summary.conversion_rate}%` : "—", d:"+0.4%", icon:<I.Spark size={16}/> },
    { k:"Avg. days to sell",v: summary.avg_days_to_sell ? `${summary.avg_days_to_sell}d` : "—", d:"−1.2d", icon:<I.Calendar size={16}/>, good:true },
    { k:"Open disputes",    v: summary.open_disputes ?? "0",     d:"—",            icon:<I.Shield size={16}/>   },
  ];

  return (
    <>
      <section style={{ padding:"32px 32px 8px", display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16 }}>
        <div>
          <div className="eyebrow">Seller</div>
          <h1 className="serif" style={{ margin:"10px 0 4px", fontSize:52, letterSpacing:"-.015em" }}>Dashboard</h1>
          <p className="muted" style={{ margin:0, fontSize:14 }}>
            {summary.revenue ? `You've earned ${formatPrice(summary.revenue)} from ${summary.items_sold || 0} items. Keep going.` : "Loading your stats…"}
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/create-listing')}>
          <I.Plus size={16}/> New listing
        </button>
      </section>

      <section style={{ padding:"24px 32px 8px" }}>
        <div className="tab-row">
          {["Overview","My listings"].map(t => (
            <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </section>

      {loading && (
        <section style={{ padding:"16px 32px 56px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height:120, borderRadius:14, background:"var(--surface)", animation:"pulse 1.5s infinite" }}/>
            ))}
          </div>
        </section>
      )}

      {!loading && tab === "Overview" && (
        <section style={{ padding:"16px 32px 32px", display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
            {stats.map(s => <StatCard key={s.k} {...s}/>)}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16 }}>
            {/* Best performing */}
            <div className="card" style={{ padding:20, borderRadius:18, background:"var(--surface)" }}>
              <div className="eyebrow" style={{ marginBottom:14 }}>Best performing listing</div>
              {topListing ? (
                <div style={{ display:"flex", gap:18, alignItems:"center" }}>
                  <div style={{ width:120, aspectRatio:"1/1", borderRadius:14, overflow:"hidden", background:"var(--surface-2)", flexShrink:0 }}>
                    {topListing.images?.[0]
                      ? <img src={topListing.images[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <Photo variant="ph-soft" aspect="1/1" style={{ borderRadius:14 }}/>
                    }
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:"var(--ink-mute)" }}>{topListing.brand}</div>
                    <div className="serif" style={{ fontSize:22, letterSpacing:"-.005em", marginTop:2 }}>{topListing.title}</div>
                    <div style={{ display:"flex", gap:18, marginTop:14, fontSize:12.5, color:"var(--ink-mute)" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Eye size={14}/> {topListing.views || 0} views</span>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Heart size={14}/> {topListing.saves || 0} saves</span>
                      <span className="serif" style={{ color:"var(--ink)", fontSize:18 }}>{formatPrice(topListing.price)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="muted small">No listings yet. <span style={{ color:"var(--accent)", cursor:"pointer" }} onClick={() => navigate('/create-listing')}>Create your first →</span></p>
              )}
            </div>

            {/* Category breakdown */}
            <div className="card" style={{ padding:20, borderRadius:18, background:"var(--surface)" }}>
              <div className="eyebrow" style={{ marginBottom:14 }}>By category</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {catBreakdown.slice(0, 5).map(c => (
                  <div key={c.cat || c.category}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4 }}>
                      <span>{c.cat || c.category}</span><span className="muted">{c.n || c.count}</span>
                    </div>
                    <div style={{ height:8, borderRadius:99, background:"var(--bg)", overflow:"hidden" }}>
                      <div style={{ width:`${((c.n || c.count) / max) * 100}%`, height:"100%", background:"var(--primary)", borderRadius:"inherit", transition:"width .8s cubic-bezier(.2,.7,.3,1)" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity table */}
          <div className="card" style={{ padding:20, borderRadius:18, background:"var(--surface)" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:14 }}>
              <div className="eyebrow">Recent activity</div>
              <button className="btn btn-ghost btn-sm">View all <I.Arrow size={12}/></button>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ fontSize:11, color:"var(--ink-mute)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  {["Item","Buyer","Amount","Status","Date"].map(h => (
                    <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding:"10px 8px", borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentActivity.length > 0 ? recentActivity.map((r, i) => (
                  <tr key={i} style={{ fontSize:13.5 }}>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>{r.item || r.title}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>{r.buyer}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)", textAlign:"right", fontFamily:"var(--serif)" }}>{formatPrice(r.amount)}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>
                      <span className="pill" style={{ fontSize:11, padding:"3px 9px", background:"var(--bg)" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block", marginRight:6 }}/>{r.status}
                      </span>
                    </td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)", color:"var(--ink-mute)" }}>{r.date || r.created_at}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{ padding:"24px 8px", textAlign:"center", color:"var(--ink-mute)", fontSize:13 }}>No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === "My listings" && (
        <section style={{ padding:"16px 32px 56px" }}>
          {listings.length === 0 ? (
            <div style={{ textAlign:"center", padding:"64px 0" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🏷️</div>
              <div style={{ fontSize:18, fontWeight:500, color:"var(--ink-mute)", marginBottom:8 }}>No listings yet</div>
              <button className="btn btn-primary" onClick={() => navigate('/create-listing')}><I.Plus size={14}/> Create your first listing</button>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:18 }}>
              {listings.map(it => (
                <div key={it.id} style={{ position:"relative" }}>
                  <ListingCard item={it}/>
                  <button className="btn btn-sm" style={{
                    position:"absolute", top:10, right:42, background:"var(--bg)", border:"1px solid var(--border-2)",
                  }} onClick={() => navigate(`/create-listing?edit=${it.id}`)}>Edit</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Footer/>
    </>
  );
}
