// sell.jsx — Create Listing, Seller Dashboard, Profile
const { useState: useStateS, useMemo: useMemoS } = React;

// ── Create Listing ───────────────────────────────────────────────────────
function CreateListingPage({ onNav, palette, mode }) {
  const [photos, setPhotos] = useStateS([
    { slot:"Front",  filled:true,  ph:"ph-soft"  },
    { slot:"Back",   filled:true,  ph:"ph-warm"  },
    { slot:"Defect", filled:false },
    { slot:"Extra",  filled:false },
    { slot:"Extra",  filled:false },
  ]);
  const [grade, setGrade] = useStateS("A");
  const [avail, setAvail] = useStateS({ buy:true, swap:true, rent:false });
  const [title, setTitle] = useStateS("Wool-Blend Overcoat");
  const filledCount = photos.filter(p => p.filled).length;
  const requiredFilled = photos.slice(0,3).filter(p => p.filled).length;

  return (
    <Page palette={palette} mode={mode} height={2400}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      {/* Breadcrumb + heading */}
      <section style={{ padding:"32px 32px 8px" }}>
        <div className="small muted" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ cursor:"pointer" }} onClick={() => onNav?.("dashboard")}>Dashboard</span>
          <I.ChevronR size={12}/>
          <span style={{ color:"var(--ink)" }}>New listing</span>
        </div>
        <h1 className="serif" style={{ margin:"14px 0 4px", fontSize: 52, letterSpacing:"-.015em" }}>List an item.</h1>
        <p className="muted" style={{ margin:0, fontSize: 15 }}>A few clean photos, an honest grade, and you're live in 2 minutes.</p>
      </section>

      <section style={{ padding:"24px 32px 120px", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap: 28 }}>
        {/* Left column — form */}
        <div style={{ display:"flex", flexDirection:"column", gap: 18 }}>

          {/* Section 1 — Photos */}
          <FormCard step="01" title="Photos" sub="3 required · up to 8 total">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap: 10 }}>
              {photos.map((p, i) => (
                <PhotoSlot key={i} slot={p.slot} filled={p.filled} ph={p.ph}
                  required={i < 3}
                  onToggle={() => {
                    const next = [...photos]; next[i] = { ...next[i], filled: !next[i].filled,
                      ph: next[i].ph || ["ph-soft","ph-warm","ph-dots","ph-stripes","ph-grid"][i % 5] }; setPhotos(next);
                  }}
                />
              ))}
              {photos.length < 8 && (
                <button className="lift" onClick={() => setPhotos([...photos, { slot:"Extra", filled:false }])}
                  style={{
                    aspectRatio:"1/1", borderRadius: 12, border:"1.5px dashed var(--border-2)",
                    background:"transparent", color:"var(--ink-mute)", cursor:"pointer",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6,
                  }}>
                  <I.Plus size={20}/>
                  <span className="small" style={{ fontSize:11 }}>Add photo</span>
                </button>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 14, padding:"6px 0", color:"var(--ink-mute)" }}>
              <I.Camera size={14}/> Photo guidelines & tips
            </button>
          </FormCard>

          {/* Section 2 — Details */}
          <FormCard step="02" title="Details" sub="The basics — keep it honest.">
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <FieldRow label="Title">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}/>
              </FieldRow>
              <FieldRow label="Description">
                <textarea className="input" rows={4} style={{ resize:"vertical", fontFamily:"inherit", lineHeight: 1.5 }}
                  defaultValue="An oversized wool-blend overcoat. Pre-loved, lining intact. Pairs well with knits and slip dresses."/>
              </FieldRow>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <FieldRow label="Category">
                  <select className="input" defaultValue="Outerwear">
                    {["Tops","Bottoms","Dresses","Outerwear","Shoes","Bags","Ethnic","Accessories"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Size">
                  <select className="input" defaultValue="M">{["XS","S","M","L","XL","XXL"].map(s => <option key={s}>{s}</option>)}</select>
                </FieldRow>
              </div>

              <div>
                <label className="small muted" style={{ display:"block", marginBottom: 8, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Condition grade</label>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { id:"A", l:"Like New", d:"Worn once or twice, no flaws" },
                    { id:"B", l:"Good",     d:"Minor signs of wear, no defects" },
                    { id:"C", l:"Fair",     d:"Noticeable wear, all functional" },
                    { id:"D", l:"Worn",     d:"Visible defects, declare them" },
                  ].map(g => {
                    const on = grade === g.id;
                    return (
                      <button key={g.id} onClick={() => setGrade(g.id)} className="lift"
                        style={{
                          padding:14, cursor:"pointer", textAlign:"left",
                          border: `1.5px solid ${on ? "var(--ink)" : "var(--border)"}`,
                          background: on ? "var(--surface)" : "var(--bg)",
                          borderRadius: 12, transition:"all .2s ease",
                        }}>
                        <div className="serif" style={{ fontSize: 28, color: on ? "var(--accent)" : "var(--ink-2)", lineHeight: 1 }}>{g.id}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginTop:8 }}>{g.l}</div>
                        <div className="small muted" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{g.d}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </FormCard>

          {/* Section 3 — Location & Pricing */}
          <FormCard step="03" title="Location & pricing" sub="Where it ships from + what you'd like for it.">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <FieldRow label="City"><input className="input" defaultValue="Mumbai"/></FieldRow>
              <FieldRow label="Sale price (₹)">
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--ink-mute)", fontFamily:"var(--serif)" }}>₹</span>
                  <input className="input" defaultValue="1,899" style={{ paddingLeft: 28 }}/>
                </div>
              </FieldRow>
            </div>
            <div style={{ marginTop:14, padding: 14, background:"var(--sage)", borderRadius: 12, display:"flex", alignItems:"center", gap:12 }}>
              <I.Spark size={18} style={{ color:"var(--accent)" }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize: 13, fontWeight:500 }}>AI suggests ₹1,750 – ₹2,200</div>
                <div className="small muted" style={{ fontSize:12 }}>Based on 42 similar Uniqlo overcoats sold in Mumbai (last 90 days).</div>
              </div>
              <button className="btn btn-sm">Use suggestion</button>
            </div>
          </FormCard>

          {/* Section 4 — Availability */}
          <FormCard step="04" title="Availability" sub="What's possible with this item?">
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {[
                { id:"buy",  l:"Buy",  icon:<I.Cart size={14}/> },
                { id:"swap", l:"Swap", icon:<I.Swap size={14}/> },
                { id:"rent", l:"Rent", icon:<I.Calendar size={14}/> },
              ].map(o => (
                <button key={o.id} onClick={() => setAvail({ ...avail, [o.id]: !avail[o.id] })}
                  className={`chip ${avail[o.id] ? "on" : ""}`}
                  style={{ padding:"10px 18px", fontSize: 14 }}>
                  {o.icon} {o.l}
                </button>
              ))}
            </div>
            {avail.rent && (
              <div className="fade-in" style={{ marginTop: 16, display:"grid", gridTemplateColumns:"1fr 1fr", gap: 14 }}>
                <FieldRow label="Rent per day (₹)">
                  <input className="input" placeholder="120"/>
                </FieldRow>
                <FieldRow label="Security deposit (₹)">
                  <input className="input" placeholder="1,500"/>
                </FieldRow>
              </div>
            )}
          </FormCard>
        </div>

        {/* Right column — live preview */}
        <aside>
          <div style={{ position:"sticky", top: 96 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Live preview</div>
            <div className="card lift" style={{ padding: 14, borderRadius: 16 }}>
              <Photo variant={photos[0]?.ph || "ph-soft"} aspect="4/5" style={{ borderRadius: 12 }}>
                <div style={{ position:"absolute", top:12, left:12, display:"flex", gap:6 }}>
                  {avail.swap && <span className="pill" style={{ background:"var(--bg)", fontSize:10 }}>SWAP</span>}
                  {avail.rent && <span className="pill pill-accent" style={{ fontSize:10 }}>RENT</span>}
                </div>
                <span className="ph-label" style={{ alignSelf:"flex-end" }}>{title}</span>
              </Photo>
              <div style={{ padding:"12px 4px 4px" }}>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>{title}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span className="serif" style={{ fontSize:22 }}>₹1,899</span>
                  <span className="pill" style={{ background:"var(--bg)", fontSize:10, padding:"2px 8px" }}>
                    <span style={{ color:"var(--accent)", fontWeight:700, marginRight:4 }}>{grade}</span>
                    {grade === "A" ? "Like New" : grade === "B" ? "Good" : grade === "C" ? "Fair" : "Worn"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop:16, padding:16, background:"var(--surface)", borderRadius:14 }}>
              <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Listing checklist</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <CheckRow done={requiredFilled === 3} label="3 required photos uploaded"/>
                <CheckRow done={true} label="Title and description"/>
                <CheckRow done={true} label="Category, size, condition"/>
                <CheckRow done={true} label="Location and price set"/>
                <CheckRow done={Object.values(avail).some(Boolean)} label="At least one availability option"/>
              </div>
            </div>

            <p className="small muted" style={{ marginTop: 14, lineHeight:1.5 }}>
              Listings are reviewed by our team within 4 hours. Verified sellers go live instantly.
            </p>
          </div>
        </aside>
      </section>

      {/* Sticky submit bar */}
      <div style={{
        position:"sticky", bottom:0, left:0, right:0, zIndex: 20,
        padding:"14px 32px",
        background:"color-mix(in srgb, var(--bg) 92%, transparent)",
        borderTop:"1px solid var(--border)",
        backdropFilter:"blur(14px)",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap: 16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--surface)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)" }}>
            <I.Camera size={16}/>
          </div>
          <div>
            <div style={{ fontSize:13.5, fontWeight:500 }}>{requiredFilled} of 3 required photos uploaded · {filledCount} total</div>
            <div className="small muted" style={{ fontSize:11 }}>{requiredFilled < 3 ? "Add front, back, and defect photos to publish." : "Ready to publish."}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn">Save draft</button>
          <button className="btn btn-primary btn-lg" disabled={requiredFilled < 3}
            style={{ opacity: requiredFilled < 3 ? .4 : 1 }}>
            List item <I.Arrow size={16}/>
          </button>
        </div>
      </div>
    </Page>
  );
}

function FormCard({ step, title, sub, children }) {
  return (
    <div className="card" style={{ padding:24, borderRadius:18, background:"var(--surface)" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom: 18 }}>
        <div>
          <div className="mono" style={{ fontSize:11, color:"var(--ink-mute)", letterSpacing:".15em" }}>{step}</div>
          <h2 className="serif" style={{ margin:"4px 0 4px", fontSize: 26, letterSpacing:"-.005em" }}>{title}</h2>
          <p className="small muted" style={{ margin:0, fontSize: 12.5 }}>{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function PhotoSlot({ slot, filled, required, ph, onToggle }) {
  return (
    <div style={{ position:"relative", aspectRatio:"1/1" }}>
      {filled ? (
        <>
          <Photo variant={ph} style={{ borderRadius: 12 }} aspect="1/1"/>
          <button onClick={onToggle} className="icon-btn"
            style={{ position:"absolute", top:6, right:6, width:24, height:24, background:"color-mix(in srgb, var(--bg) 85%, transparent)" }}>
            <I.Close size={12}/>
          </button>
        </>
      ) : (
        <button onClick={onToggle} className="lift"
          style={{
            width:"100%", height:"100%", borderRadius: 12,
            border:`1.5px dashed ${required ? "var(--accent)" : "var(--border-2)"}`,
            background:"transparent", color:"var(--ink-mute)", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4,
          }}>
          <I.Camera size={20}/>
          <span className="small" style={{ fontSize:11 }}>{slot}</span>
          {required && <span style={{ fontSize:10, color:"var(--accent)" }}>required</span>}
        </button>
      )}
    </div>
  );
}

function CheckRow({ done, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
      <span style={{
        width:18, height:18, borderRadius:"50%",
        background: done ? "var(--accent)" : "var(--surface-2)",
        color: done ? "#fff" : "var(--ink-mute)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>{done ? <I.Check size={11} stroke={2.2}/> : <I.Close size={10}/>}</span>
      <span style={{ color: done ? "var(--ink)" : "var(--ink-mute)" }}>{label}</span>
    </div>
  );
}

// ── Seller Dashboard ─────────────────────────────────────────────────────
function SellerDashboardPage({ onNav, palette, mode }) {
  const [tab, setTab] = useStateS("Overview");

  const stats = [
    { k:"Active listings", v:"12",       d:"+2 this week", icon:<I.Tag size={16}/> },
    { k:"Items sold",      v:"38",       d:"+5 this month", icon:<I.Cart size={16}/> },
    { k:"Total revenue",   v:"₹42,180",  d:"+18%",         icon:<span className="serif" style={{ fontSize:16 }}>₹</span> },
    { k:"Total views",     v:"12,480",   d:"+24%",         icon:<I.Eye size={16}/> },
    { k:"Total saves",     v:"1,202",    d:"+12%",         icon:<I.Heart size={16}/> },
    { k:"Conversion rate", v:"4.2%",     d:"+0.4%",        icon:<I.Spark size={16}/> },
    { k:"Avg. days to sell", v:"6.4d",   d:"−1.2d",        icon:<I.Calendar size={16}/>, good: true },
    { k:"Open disputes",   v:"0",        d:"—",            icon:<I.Shield size={16}/> },
  ];

  const catBreakdown = [
    { cat:"Tops",       n: 4 },
    { cat:"Outerwear",  n: 3 },
    { cat:"Bottoms",    n: 2 },
    { cat:"Dresses",    n: 2 },
    { cat:"Accessories",n: 1 },
  ];
  const max = Math.max(...catBreakdown.map(c => c.n));

  return (
    <Page palette={palette} mode={mode} height={2100}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <section style={{ padding:"32px 32px 8px", display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16 }}>
        <div>
          <div className="eyebrow">Seller</div>
          <h1 className="serif" style={{ margin:"10px 0 4px", fontSize: 52, letterSpacing:"-.015em" }}>Dashboard</h1>
          <p className="muted" style={{ margin:0, fontSize: 14 }}>You've earned ₹42,180 from 38 items. Keep going.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => onNav?.("create")}>
          <I.Plus size={16}/> New listing
        </button>
      </section>

      <section style={{ padding:"24px 32px 8px" }}>
        <div className="tab-row">
          {["Overview","My listings"].map(t => (
            <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </section>

      {tab === "Overview" && (
        <section style={{ padding:"16px 32px 32px", display:"flex", flexDirection:"column", gap: 20 }}>
          {/* Stat grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 12 }}>
            {stats.map(s => <StatCard key={s.k} {...s}/>)}
          </div>

          {/* Best performing + Category chart */}
          <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap: 16 }}>
            <div className="card" style={{ padding: 20, borderRadius:18, background:"var(--surface)" }}>
              <div className="eyebrow" style={{ marginBottom:14 }}>Best performing listing</div>
              <div style={{ display:"flex", gap:18, alignItems:"center" }}>
                <Photo variant="ph-soft" aspect="1/1" style={{ width:120, borderRadius:14 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:"var(--ink-mute)" }}>Uniqlo</div>
                  <div className="serif" style={{ fontSize:24, letterSpacing:"-.005em", marginTop:2 }}>Wool-Blend Overcoat</div>
                  <div style={{ display:"flex", gap:18, marginTop:14, fontSize:12.5, color:"var(--ink-mute)" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Eye size={14}/> 412 views</span>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Heart size={14}/> 38 saves</span>
                    <span className="serif" style={{ color:"var(--ink)", fontSize:18 }}>₹1,899</span>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="serif" style={{ fontSize:38, color:"var(--accent)", lineHeight:1 }}>9.2%</div>
                  <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginTop:4 }}>Conversion</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding:20, borderRadius:18, background:"var(--surface)" }}>
              <div className="eyebrow" style={{ marginBottom:14 }}>By category</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {catBreakdown.map(c => (
                  <div key={c.cat}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom: 4 }}>
                      <span>{c.cat}</span><span className="muted">{c.n}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background:"var(--bg)", overflow:"hidden" }}>
                      <div style={{ width: `${(c.n / max) * 100}%`, height:"100%", background:"var(--primary)", borderRadius:"inherit", transition:"width .8s cubic-bezier(.2,.7,.3,1)" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity table */}
          <div className="card" style={{ padding: 20, borderRadius: 18, background:"var(--surface)" }}>
            <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom: 14 }}>
              <div className="eyebrow">Recent activity</div>
              <button className="btn btn-ghost btn-sm">View all <I.Arrow size={12}/></button>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ fontSize: 11, color:"var(--ink-mute)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  {["Item","Buyer","Amount","Status","Date"].map(h => (
                    <th key={h} style={{ textAlign: h==="Amount" ? "right" : "left", padding:"10px 8px", borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { item:"Vintage Denim Jacket", buyer:"Riya V.",    amt:"₹1,450", status:"Shipped",    date:"2h ago",  color:"var(--accent)"   },
                  { item:"Linen Trousers",       buyer:"Ananya S.",  amt:"₹799",   status:"Escrow",     date:"5h ago",  color:"var(--ink-mute)" },
                  { item:"Cropped Knit Sweater",  buyer:"Kabir M.",   amt:"₹649",   status:"Completed",  date:"1d ago",  color:"var(--ink-mute)" },
                  { item:"Silk Slip Dress",       buyer:"Diya S.",    amt:"₹1,250", status:"Pending",    date:"2d ago",  color:"var(--ink-mute)" },
                ].map((r,i) => (
                  <tr key={i} style={{ fontSize: 13.5 }}>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>{r.item}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>{r.buyer}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)", textAlign:"right", fontFamily:"var(--serif)" }}>{r.amt}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>
                      <span className="pill" style={{ fontSize:11, padding:"3px 9px", background:"var(--bg)" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:r.color, display:"inline-block" }}/> {r.status}
                      </span>
                    </td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)", color:"var(--ink-mute)" }}>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "My listings" && (
        <section style={{ padding:"16px 32px 56px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:18 }}>
            {window.thriftData.sampleListings.slice(0, 8).map(it => (
              <div key={it.id} style={{ position:"relative" }}>
                <ListingCard item={it} layout="editorial"/>
                <button className="btn btn-sm" style={{
                  position:"absolute", top:10, right:42, background:"var(--bg)", border:"1px solid var(--border-2)",
                }}>Edit</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer/>
    </Page>
  );
}

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
      <div className="serif" style={{ fontSize: 30, letterSpacing:"-.01em", lineHeight: 1 }}>{v}</div>
      <div className="small muted" style={{ fontSize:11.5, letterSpacing:".06em", textTransform:"uppercase", marginTop:6 }}>{k}</div>
    </div>
  );
}

// ── Profile ──────────────────────────────────────────────────────────────
function ProfilePage({ onNav, palette, mode }) {
  const [tab, setTab] = useStateS("Profile");

  return (
    <Page palette={palette} mode={mode} height={1700}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <section style={{ padding:"32px 32px 8px" }}>
        <div className="card" style={{ padding: 28, borderRadius:20, background:"var(--surface)" }}>
          <div style={{ display:"flex", gap:24, alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <Photo variant="ph-soft" style={{ width:120, height:120, borderRadius:"50%" }}/>
              <button className="icon-btn" style={{ position:"absolute", bottom:0, right:0, background:"var(--primary)", color:"var(--primary-ink)", width:36, height:36 }}>
                <I.Camera size={14}/>
              </button>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <h1 className="serif" style={{ margin:0, fontSize: 38, letterSpacing:"-.015em" }}>Riya Verma</h1>
                <span className="pill pill-accent"><I.Verified size={11}/> Verified</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:8, fontSize:13, color:"var(--ink-mute)" }}>
                <Stars value={4.9} size={12}/>
                <span>·</span>
                <span>142 sales</span>
                <span>·</span>
                <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}><I.Pin size={12}/> Mumbai</span>
              </div>
            </div>
            <button className="btn">View public store <I.ArrowUR size={14}/></button>
          </div>
        </div>
      </section>

      {/* Sustainability impact */}
      <section style={{ padding:"24px 32px 8px" }}>
        <div className="card" style={{ padding: 24, borderRadius:20, background:"var(--primary)", color:"var(--primary-ink)", overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", right:-40, top:-40, opacity:.08, fontSize: 240, fontFamily:"var(--serif)", color:"var(--primary-ink)", lineHeight:1 }}>
            ⊕
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom: 18 }}>
            <I.Leaf size={20}/>
            <h2 className="serif" style={{ margin:0, fontSize: 26, color:"var(--primary-ink)" }}>Your impact</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 24, position:"relative" }}>
            <ImpactStat n="142.6 kg"   k="CO₂ saved"     d="vs new"/>
            <ImpactStat n="220,400 L" k="Water saved"    d="vs new"/>
            <ImpactStat n="180"        k="Transactions"  d="all-time"/>
          </div>
          <p style={{ margin:"22px 0 0", fontSize:13, opacity:.7, position:"relative" }}>
            That's enough water for ~1,470 people's daily drinking needs. Quietly proud of you.
          </p>
        </div>
      </section>

      <section style={{ padding:"24px 32px 0" }}>
        <div className="tab-row">
          {["Profile","Try-on photos","Wishlist"].map(t => (
            <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </section>

      {tab === "Profile" && (
        <section style={{ padding:"16px 32px 32px", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:24 }}>
          <div className="card" style={{ padding:24, borderRadius:18 }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>Your details</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <FieldRow label="Full name"><input className="input" defaultValue="Riya Verma"/></FieldRow>
              <FieldRow label="Email"><input className="input" defaultValue="riya@thrift.in"/></FieldRow>
              <FieldRow label="City"><input className="input" defaultValue="Mumbai"/></FieldRow>
              <FieldRow label="Bio">
                <textarea className="input" rows={3} style={{ resize:"vertical", fontFamily:"inherit" }}
                  defaultValue="Looking for forever-pieces — silk slips, oversized blazers, anything tailored."/>
              </FieldRow>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
                <button className="btn">Cancel</button>
                <button className="btn btn-primary">Save changes</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding:24, borderRadius:18, background:"var(--surface)" }}>
            <div className="eyebrow" style={{ marginBottom: 18 }}>Vouches</div>
            <p className="small muted" style={{ margin:"0 0 16px", fontSize:13, lineHeight:1.6 }}>
              4 sellers have vouched for you as a reliable buyer.
            </p>
            <div style={{ display:"flex", marginBottom: 16 }}>
              {["ph-soft","ph-warm","ph-dots","ph-stripes"].map((p, i) => (
                <Photo key={i} variant={p} style={{ width: 38, height: 38, borderRadius:"50%", marginLeft: i ? -10 : 0, border:"2px solid var(--surface)" }}/>
              ))}
              <span style={{
                width:38, height:38, borderRadius:"50%", marginLeft:-10, background:"var(--primary)", color:"var(--primary-ink)",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, border:"2px solid var(--surface)",
              }}>+1</span>
            </div>
            <hr className="divider"/>
            <div style={{ marginTop:16 }}>
              <div className="eyebrow" style={{ marginBottom:10 }}>Trust score</div>
              <div className="serif" style={{ fontSize:54, color:"var(--accent)", lineHeight:1 }}>94<span style={{ fontSize:24, color:"var(--ink-mute)" }}>/100</span></div>
              <div className="small muted" style={{ fontSize:12, marginTop: 6 }}>Higher than 92% of buyers in Mumbai.</div>
            </div>
          </div>
        </section>
      )}

      {tab === "Try-on photos" && (
        <section style={{ padding:"16px 32px 32px" }}>
          <div style={{
            padding: 36, border:"1.5px dashed var(--border-2)", borderRadius:18, textAlign:"center",
            background:"var(--surface)",
          }}>
            <div style={{ width:56, height:56, borderRadius:"50%", margin:"0 auto 16px", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)" }}>
              <I.Camera size={22}/>
            </div>
            <h3 className="serif" style={{ margin:"0 0 6px", fontSize: 24 }}>Upload try-on photos</h3>
            <p className="muted" style={{ margin:"0 auto 18px", maxWidth: 400, fontSize: 13 }}>
              Drag and drop or click to upload. We'll use them for virtual try-on, never shared.
            </p>
            <button className="btn btn-primary"><I.Plus size={14}/> Choose photos</button>
          </div>

          <div style={{ marginTop:24, display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14 }}>
            {["ph-soft","ph-warm","ph-dots","ph-stripes","ph-grid"].map((p,i) => (
              <div key={i} style={{ position:"relative" }}>
                <Photo variant={p} aspect="3/4" style={{ borderRadius:14 }}/>
                <button className="icon-btn" style={{ position:"absolute", top:8, right:8, width:30, height:30, background:"color-mix(in srgb, var(--bg) 85%, transparent)" }}>
                  <I.Close size={14}/>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "Wishlist" && (
        <section style={{ padding:"16px 32px 32px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:18 }}>
            {window.thriftData.sampleListings.slice(0, 4).map(it => (
              <ListingCard key={it.id} item={it} layout="editorial" saved={true}/>
            ))}
          </div>
        </section>
      )}

      <Footer/>
    </Page>
  );
}

function ImpactStat({ n, k, d }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 40, letterSpacing:"-.01em", lineHeight:1 }}>{n}</div>
      <div style={{ marginTop:6, fontSize:13, opacity:.85 }}>{k} <span style={{ opacity:.55, marginLeft:4, fontSize:11 }}>{d}</span></div>
    </div>
  );
}

Object.assign(window, { CreateListingPage, SellerDashboardPage, ProfilePage });
