// listing.jsx — Listing detail page
const { useState: useStateLD } = React;

function ListingPage({ onNav, palette, mode, listing }) {
  const item = listing || window.thriftData.sampleListingDetail;
  const [activeImg, setActiveImg] = useStateLD(0);
  const [saved, setSaved] = useStateLD(false);
  const [readMore, setReadMore] = useStateLD(false);
  const [variant, setVariant] = useStateLD("Buy"); // Buy | Swap | Rent

  return (
    <Page palette={palette} mode={mode} height={2200}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      {/* Breadcrumb */}
      <div style={{ padding:"20px 32px 8px", display:"flex", alignItems:"center", gap:8, fontSize:12.5, color:"var(--ink-mute)" }}>
        <span style={{ cursor:"pointer" }} onClick={() => onNav?.("home")}>Browse</span>
        <I.ChevronR size={12}/>
        <span style={{ cursor:"pointer" }}>{item.cat}</span>
        <I.ChevronR size={12}/>
        <span style={{ color:"var(--ink)" }}>{item.title}</span>
      </div>

      {/* Main two-column */}
      <section style={{
        padding:"24px 32px 32px",
        display:"grid", gridTemplateColumns:"1.15fr 1fr", gap: 36,
      }}>
        {/* Gallery */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ position:"relative", borderRadius: 22, overflow:"hidden" }}>
            <Photo variant={item.gallery[activeImg]} aspect="4/5"
              key={activeImg}
              className="fade-in"
              style={{ borderRadius: 22 }}>
              {/* badges over the photo */}
              <div style={{ position:"absolute", top:18, left:18, display:"flex", gap:6, zIndex:2 }}>
                <span className="pill pill-dark" style={{ fontSize:11 }}>VERIFIED</span>
                {item.swap && <span className="pill" style={{ fontSize:11, background:"var(--bg)" }}>SWAP</span>}
                {item.rent && <span className="pill" style={{ fontSize:11, background:"var(--accent)", color:"#fff", border:0 }}>RENT</span>}
              </div>
              <button className="icon-btn" onClick={() => setSaved(!saved)}
                style={{
                  position:"absolute", top:14, right:14, zIndex:2,
                  width:44, height:44, background:"color-mix(in srgb, var(--bg) 80%, transparent)",
                  color: saved ? "var(--accent)" : "var(--ink)", backdropFilter:"blur(8px)",
                }}>
                <I.Heart size={20} filled={saved}/>
              </button>
              {/* image counter */}
              <span style={{
                position:"absolute", bottom:14, right:14, zIndex:2,
                padding:"5px 10px", borderRadius:99,
                background:"color-mix(in srgb, var(--primary) 85%, transparent)", color:"var(--primary-ink)",
                fontSize:11, fontFamily:"var(--mono)",
              }}>{activeImg + 1} / {item.gallery.length}</span>
            </Photo>
          </div>

          {/* Thumb row */}
          <div style={{ display:"flex", gap:10 }}>
            {item.gallery.map((g, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                style={{
                  flex:1, padding: 0, border: 0, borderRadius: 10, overflow:"hidden",
                  outline: activeImg === i ? "2px solid var(--accent)" : "2px solid transparent",
                  outlineOffset: 2, cursor:"pointer", transition:"outline-color .2s",
                }}>
                <Photo variant={g} aspect="1/1" style={{ borderRadius: 10 }}/>
              </button>
            ))}
          </div>

          {/* Description */}
          <div style={{ marginTop: 24 }}>
            <h3 className="eyebrow" style={{ marginBottom: 12 }}>Description</h3>
            <p style={{
              margin: 0, fontSize: 15, color:"var(--ink-2)", lineHeight: 1.7,
              maxHeight: readMore ? "none" : 110, overflow:"hidden", position:"relative",
            }}>
              {item.description}
              {!readMore && (
                <span style={{
                  position:"absolute", bottom:0, left:0, right:0, height:50,
                  background:"linear-gradient(to bottom, transparent, var(--bg))",
                }}/>
              )}
            </p>
            <button className="btn btn-ghost btn-sm" onClick={() => setReadMore(!readMore)}
              style={{ marginTop: 6, padding:"6px 0", color:"var(--ink)" }}>
              {readMore ? "Show less" : "Read more"} <I.Chevron size={14} style={{ transform: readMore ? "rotate(180deg)" : "none" }}/>
            </button>
          </div>

          {/* Measurements */}
          <div style={{ marginTop:24 }}>
            <h3 className="eyebrow" style={{ marginBottom:12 }}>Measurements</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {item.measurements.map(m => (
                <div key={m.k} className="card" style={{ padding:"14px 16px", borderRadius:12 }}>
                  <div className="small muted" style={{ fontSize:11, textTransform:"uppercase", letterSpacing:".08em" }}>{m.k}</div>
                  <div className="serif" style={{ fontSize:24, marginTop:4 }}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <aside style={{ display:"flex", flexDirection:"column", gap:20, position:"relative" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <span className="pill pill-dark">FOR SALE</span>
            {item.swap && <span className="pill">SWAP AVAILABLE</span>}
            {item.rent && <span className="pill pill-accent">RENTABLE</span>}
          </div>

          <div>
            <div className="small muted" style={{ marginBottom:6 }}>{item.brand} · {item.cat}</div>
            <h1 className="serif" style={{ margin:0, fontSize:48, lineHeight:1.05, letterSpacing:"-.015em" }}>
              {item.title}
            </h1>
          </div>

          <div style={{ display:"flex", alignItems:"baseline", gap:14 }}>
            <span className="serif" style={{ fontSize:42, lineHeight:1 }}>
              ₹{item.price.toLocaleString("en-IN")}
            </span>
            <span className="pill" style={{ background:"var(--sage)", color:"var(--ink)", borderColor:"transparent" }}>
              <span style={{ color:"var(--accent)", marginRight: 4, fontWeight:700 }}>{item.grade}</span>
              {item.gradeLabel}
            </span>
          </div>

          {item.rent && (
            <div className="card" style={{ padding: 14, borderRadius: 12, display:"flex", alignItems:"center", gap: 14, background:"var(--surface)" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"var(--accent)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I.Calendar size={18}/>
              </div>
              <div style={{ display:"flex", flexDirection:"column", lineHeight:1.3 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>Or rent it for ₹{item.rentPerDay}/day</span>
                <span className="small muted">+ ₹{item.deposit} refundable deposit</span>
              </div>
            </div>
          )}

          <hr className="divider"/>

          {/* meta grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { k:"Size",      v:item.size },
              { k:"Category",  v:item.cat },
              { k:"Condition", v:`${item.grade} · ${item.gradeLabel}` },
              { k:"City",      v:item.city, icon:<I.Pin size={13}/> },
            ].map(m => (
              <div key={m.k}>
                <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:4 }}>{m.k}</div>
                <div style={{ fontSize:14.5, display:"inline-flex", alignItems:"center", gap:5 }}>{m.icon}{m.v}</div>
              </div>
            ))}
          </div>

          <hr className="divider"/>

          {/* Variant switch */}
          <div className="tab-row" style={{ width:"100%" }}>
            {["Buy", "Swap", "Rent"].map(v => (
              <button key={v} className={`tab ${variant === v ? "on" : ""}`}
                onClick={() => setVariant(v)} style={{ flex:1, padding:"10px 16px" }}>
                {v === "Buy" && <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Cart size={14}/> Buy</span>}
                {v === "Swap" && <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Swap size={14}/> Swap</span>}
                {v === "Rent" && <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Calendar size={14}/> Rent</span>}
              </button>
            ))}
          </div>

          {/* Primary action */}
          {variant === "Buy" && (
            <button className="btn btn-primary btn-lg" style={{ width:"100%", padding:"16px" }} onClick={() => onNav?.("cart", item)}>
              Buy now — ₹{item.price.toLocaleString("en-IN")} <I.Arrow size={16}/>
            </button>
          )}
          {variant === "Swap" && (
            <button className="btn btn-primary btn-lg" style={{ width:"100%", padding:"16px" }}>
              <I.Swap size={16}/> Propose a swap
            </button>
          )}
          {variant === "Rent" && (
            <button className="btn btn-accent btn-lg" style={{ width:"100%", padding:"16px" }} onClick={() => onNav?.("rent", item)}>
              <I.Calendar size={16}/> Book rental — ₹{item.rentPerDay}/day
            </button>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button className="btn" style={{ flex:1 }}><I.Spark size={14}/> Virtual try-on</button>
            <button className="btn" style={{ flex:1 }}><I.Chat size={14}/> Message seller</button>
          </div>

          {/* Engagement stats */}
          <div style={{ display:"flex", gap:18, fontSize:12.5, color:"var(--ink-mute)" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Eye size={14}/> {item.views} views</span>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Heart size={14}/> {item.saves} saves</span>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><I.Shield size={14}/> Escrow protected</span>
          </div>

          {/* Seller card */}
          <div className="card" style={{ padding: 18, borderRadius: 16, marginTop: 8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <Photo variant={window.thriftData.sampleSeller.ph} style={{ width:54, height:54, borderRadius:"50%", flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:600, fontSize:15 }}>{window.thriftData.sampleSeller.name}</span>
                  <I.Verified size={15} style={{ color:"var(--accent)" }}/>
                </div>
                <div className="small muted" style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                  <Stars value={window.thriftData.sampleSeller.score} size={11}/>
                  <span>· {window.thriftData.sampleSeller.sales} sales</span>
                </div>
              </div>
              <button className="btn btn-sm">View store <I.Arrow size={13}/></button>
            </div>
            <p className="small muted" style={{ margin:"12px 0 0", lineHeight:1.55 }}>
              {window.thriftData.sampleSeller.bio}
            </p>
          </div>

          {/* Trust badges */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 8, padding:"14px 0 0", borderTop:"1px solid var(--border)" }}>
            {[
              { icon:<I.Shield size={16}/>, l:"Escrow held", s:"Until delivered" },
              { icon:<I.Truck size={16}/>,  l:"Pan-India",   s:"Or meet in person" },
              { icon:<I.Reload size={16}/>, l:"48-hr returns", s:"Condition mismatch" },
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

      {/* You might also like */}
      <section style={{ padding:"24px 32px 56px", borderTop:"1px solid var(--border)", marginTop:24 }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <div className="eyebrow">More from this seller</div>
            <h2 className="serif" style={{ margin:"8px 0 0", fontSize:30, letterSpacing:"-.01em" }}>You might also like these.</h2>
          </div>
          <button className="btn btn-ghost btn-sm">All from {window.thriftData.sampleSeller.name.split(" ")[0]} <I.Arrow size={14}/></button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:20 }}>
          {window.thriftData.sampleListings.slice(1, 5).map(it => (
            <ListingCard key={it.id} item={it} layout="editorial" onOpen={(i) => onNav?.("listing", i)}/>
          ))}
        </div>
      </section>

      <Footer/>
    </Page>
  );
}

window.ListingPage = ListingPage;
