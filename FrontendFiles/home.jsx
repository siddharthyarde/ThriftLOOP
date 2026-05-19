// home.jsx — Home / Browse page
const { sampleListings, categories, trustedSellers } = window.thriftData;

function HeroCollage({ variant = "collage", onCTA }) {
  // Three hero variants — exposed via Tweaks.
  if (variant === "split") return <HeroSplit onCTA={onCTA} />;
  if (variant === "type")  return <HeroType  onCTA={onCTA} />;
  return <HeroCollageDefault onCTA={onCTA} />;
}

function HeroCollageDefault({ onCTA }) {
  return (
    <section style={{ padding: "40px 32px 32px", position:"relative" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.15fr 1fr", gap:24, alignItems:"stretch" }}>
        {/* Left — copy */}
        <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-between", gap:24, padding:"24px 8px 24px 0" }}>
          <div className="eyebrow"><span>New drops every day</span> <span style={{ marginLeft:6, color:"var(--ink-mute)" }}>· est. 2024</span></div>

          <h1 className="serif" style={{
            margin:0, fontSize: "clamp(72px, 7vw, 112px)",
            lineHeight: 0.92, letterSpacing:"-0.025em", color:"var(--ink)",
          }}>
            Pre-loved<br/>
            fashion,<br/>
            <span style={{ fontStyle:"italic", color:"var(--accent)" }}>re&shy;imagined.</span>
          </h1>

          <p className="muted" style={{ maxWidth: 460, margin:0, fontSize: 16, lineHeight: 1.55 }}>
            Shop, swap, or rent verified second-hand pieces from real people across India.
            Every item is graded, every seller is vouched for.
          </p>

          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <button className="btn btn-primary btn-lg" onClick={() => onCTA?.("browse")}>
              Browse listings <I.Arrow size={16}/>
            </button>
            <button className="btn btn-lg" onClick={() => onCTA?.("swap")}>
              <I.Swap size={16}/> Swap something
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ display:"flex", gap:32, borderTop:"1px solid var(--border)", paddingTop:20, marginTop:8 }}>
            <Stat n="12.4k" k="active listings"/>
            <Stat n="8.2k"  k="verified sellers"/>
            <Stat n="↑ 96%" k="match rate" accent/>
          </div>
        </div>

        {/* Right — asymmetric collage of placeholder tiles */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"1.1fr 1fr 1fr",
          gridTemplateRows:"140px 110px 110px 120px",
          gap:12, position:"relative",
        }}>
          {/* Big feature photo */}
          <Photo variant="ph-soft" label="Camel overcoat — Aanya R."
            style={{ gridColumn:"1 / span 2", gridRow:"1 / span 2", borderRadius: 16 }}>
            <span className="pill pill-dark" style={{ position:"absolute", top:14, left:14, zIndex:1 }}>FEATURED</span>
          </Photo>
          {/* Stack */}
          <Photo variant="ph-warm"   label="Y2K jacket"        style={{ gridColumn:"3", gridRow:"1", borderRadius: 14 }}/>
          <Photo variant="ph-stripes"label="Vintage Levi's"     style={{ gridColumn:"3", gridRow:"2", borderRadius: 14 }}/>
          <Photo variant="ph-dots"   label="Silk slip dress"    style={{ gridColumn:"1", gridRow:"3", borderRadius: 14 }}/>
          <Photo variant="ph-grid"   label="Crossbody bag"      style={{ gridColumn:"2", gridRow:"3", borderRadius: 14 }}/>
          <Photo variant="ph-deep"   label="Linen trousers"     style={{ gridColumn:"3", gridRow:"3", borderRadius: 14 }}/>
          {/* Mini stat overlay floating between tiles */}
          <div style={{
            gridColumn:"1 / span 3", gridRow:"4",
            display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
            background:"var(--primary)", color:"var(--primary-ink)", borderRadius: 14,
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

function HeroSplit({ onCTA }) {
  return (
    <section style={{ padding: "40px 32px 32px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, alignItems:"center", minHeight: 440 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:18 }}>Spring '26 — refresh, don't restock</div>
          <h1 className="serif" style={{ fontSize:"clamp(64px,6vw,100px)", lineHeight:.95, margin:"0 0 24px", letterSpacing:"-.025em" }}>
            Wear it again, <span style={{ color:"var(--accent)", fontStyle:"italic" }}>for the first time.</span>
          </h1>
          <p className="muted" style={{ maxWidth:480, fontSize:16, margin:"0 0 28px" }}>
            India's verified marketplace for second-hand fashion. Buy. Swap. Rent. Repeat.
          </p>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-primary btn-lg" onClick={() => onCTA?.("browse")}>Start shopping <I.Arrow size={16}/></button>
            <button className="btn btn-lg">How it works</button>
          </div>
        </div>
        <Photo variant="ph-soft" style={{ aspectRatio:"4/5", borderRadius:24 }} label="Lookbook · Spring drop 09"/>
      </div>
    </section>
  );
}

function HeroType({ onCTA }) {
  return (
    <section style={{ padding: "60px 32px 32px", textAlign:"center" }}>
      <div className="eyebrow" style={{ justifyContent:"center", marginBottom:24 }}>The thrift marketplace · India</div>
      <h1 className="serif" style={{ fontSize:"clamp(110px,12vw,200px)", lineHeight:.85, margin:"0 0 30px", letterSpacing:"-.035em" }}>
        Wear<br/>
        <span style={{ fontStyle:"italic", color:"var(--accent)" }}>secondhand</span><br/>
        first.
      </h1>
      <p className="muted" style={{ maxWidth:520, margin:"0 auto 30px", fontSize:16 }}>
        Verified pieces. Real grades. Real people. Shop without the guilt.
      </p>
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        <button className="btn btn-primary btn-lg" onClick={() => onCTA?.("browse")}>Browse listings <I.Arrow size={16}/></button>
        <button className="btn btn-lg"><I.Swap size={16}/> Swap something</button>
      </div>
    </section>
  );
}

function Stat({ n, k, accent }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 28, color: accent ? "var(--accent)" : "var(--ink)", lineHeight:1 }}>{n}</div>
      <div className="small muted" style={{ marginTop:4, textTransform:"uppercase", letterSpacing:".1em", fontSize:10.5 }}>{k}</div>
    </div>
  );
}

// ─── Marquee under hero ─────────────────────────────────────────────────
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
        {items.map((t,i) => (
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

// ─── Categories rail ─────────────────────────────────────────────────────
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(9,1fr)", gap:10 }}>
        {categories.map((c, i) => (
          <button key={c.id} onClick={() => onSelect?.(c.id)}
            className="lift"
            style={{
              border: "1px solid var(--border)",
              background: active === c.id ? "var(--primary)" : "var(--surface)",
              color: active === c.id ? "var(--primary-ink)" : "var(--ink)",
              borderRadius: 12, padding: 10, cursor: "pointer",
              display:"flex", flexDirection:"column", gap:8, alignItems:"flex-start",
              transition: "all .25s ease",
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
              <div className="small" style={{ opacity: .65, fontSize: 10.5 }}>{c.count.toLocaleString("en-IN")}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Filter Bar + Pills ──────────────────────────────────────────────────
function FilterBar({ activeFilters, setFilters, sortBy, setSortBy, showFilters, setShowFilters, resultCount }) {
  return (
    <div style={{ padding: "0 32px" }}>
      <div className="card" style={{
        padding: 14, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
        background:"var(--surface)", borderRadius: 16,
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
        {["For sale", "For swap", "For rent", "Verified seller"].map(t => (
          <button key={t} className={`chip ${activeFilters[t] ? "on" : ""}`}
            onClick={() => setFilters({ ...activeFilters, [t]: !activeFilters[t] })}>
            {t}
          </button>
        ))}
        <span className="muted small" style={{ marginLeft:"auto" }}>
          {resultCount.toLocaleString("en-IN")} listings
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:6, paddingLeft:8, borderLeft:"1px solid var(--border)" }}>
          <I.Sort size={14} style={{ color:"var(--ink-mute)" }}/>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
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

      {/* Expanded filter row */}
      {showFilters && (
        <div className="fade-in" style={{
          marginTop: 10, padding: 18,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16,
          display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 14,
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

// ─── Featured strip: dual editorial cards ────────────────────────────────
function EditorialStrip({ onOpen }) {
  return (
    <div style={{ padding:"40px 32px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap: 16 }}>
        <div className="lift" style={{ borderRadius:18, overflow:"hidden", position:"relative", cursor:"pointer" }} onClick={() => onOpen?.()}>
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
          minHeight: 280,
        }}>
          <div>
            <span className="eyebrow" style={{ color:"color-mix(in srgb, var(--primary-ink) 70%, transparent)" }}>The Swap Engine</span>
            <h3 className="serif" style={{ margin:"10px 0 6px", fontSize:30, lineHeight:1.05 }}>
              Trade what you don't wear for something you will.
            </h3>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Photo variant="ph-warm" style={{ width:80, height:80, borderRadius:10 }} aspect="1/1"/>
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

// ─── Trusted sellers ─────────────────────────────────────────────────────
function SellerRow() {
  return (
    <div style={{ padding:"24px 32px" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Trusted sellers</div>
          <h2 className="serif" style={{ margin:"8px 0 0", fontSize:32, letterSpacing:"-.01em" }}>People you'll love buying from.</h2>
        </div>
        <button className="btn btn-ghost btn-sm">All sellers <I.Arrow size={14}/></button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
        {trustedSellers.map(s => (
          <div key={s.name} className="card lift" style={{ padding:14, borderRadius:14, display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Photo variant={s.ph} style={{ width:44, height:44, borderRadius:"50%" }}/>
              <div style={{ minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13.5, fontWeight:500 }}>
                  {s.name}
                  <I.Verified size={13} style={{ color:"var(--accent)" }}/>
                </div>
                <div className="small muted" style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <I.Pin size={11}/> {s.city}
                </div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop: 8, borderTop:"1px dashed var(--border)" }}>
              <Stars value={s.score} size={11}/>
              <span className="small muted">{s.sales} sales</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Listings grid ───────────────────────────────────────────────────────
function ListingsGrid({ layout, onOpen, saved, onSave, items }) {
  return (
    <div style={{
      padding: "0 32px 40px",
      display: "grid",
      gridTemplateColumns: layout === "compact" ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
      gap: layout === "compact" ? 14 : 20,
    }}>
      {items.map(it => (
        <ListingCard key={it.id} item={it} layout={layout} onOpen={onOpen}
          saved={saved.has(it.id)} onSave={onSave}/>
      ))}
    </div>
  );
}

// ─── Trending — horizontal scroll ────────────────────────────────────────
function TrendingRow({ layout, onOpen, saved, onSave }) {
  const trending = sampleListings.slice(0, 6);
  return (
    <div style={{ padding: "12px 0 24px" }}>
      <div style={{ padding: "0 32px", display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Trending this week</div>
          <h2 className="serif" style={{ margin:"8px 0 0", fontSize:32, letterSpacing:"-.01em" }}>What India is shopping right now.</h2>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button className="icon-btn"><I.ArrowLeft size={16}/></button>
          <button className="icon-btn"><I.Arrow size={16}/></button>
        </div>
      </div>
      <div className="scroll-x" style={{ padding: "0 32px" }}>
        {trending.map(it => (
          <div key={it.id} style={{ width: 220 }}>
            <ListingCard item={it} layout={layout} onOpen={onOpen}
              saved={saved.has(it.id)} onSave={onSave}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      background:"var(--primary)", color:"var(--primary-ink)",
      padding:"56px 32px 28px", marginTop: 32,
    }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr 1.4fr", gap:32, marginBottom: 40 }}>
        <div>
          <div style={{ color:"var(--primary-ink)" }}><ThriftMark size={20}/></div>
          <p style={{ marginTop:16, fontSize:13.5, opacity:.7, maxWidth:280 }}>
            India's verified marketplace for second-hand fashion. Buy. Swap. Rent. Made in Mumbai.
          </p>
          <div style={{ display:"flex", gap:8, marginTop:18 }}>
            {["Ig", "Tw", "Yt", "Pn"].map(s => (
              <span key={s} style={{
                width:32, height:32, borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center",
                background:"color-mix(in srgb, var(--primary-ink) 12%, transparent)", fontSize:11, fontWeight:600,
              }}>{s}</span>
            ))}
          </div>
        </div>
        {[
          { h:"Shop",     l:["New arrivals","Trending","Swap engine","Rentals","Sale"] },
          { h:"Sell",     l:["Start selling","Pricing guide","Seller hub","Verified program","Shipping"] },
          { h:"Trust",    l:["Escrow protection","Grading guide","Returns","Disputes","Terms"] },
        ].map(col => (
          <div key={col.h}>
            <h4 style={{ margin:"6px 0 14px", fontSize:13, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>{col.h}</h4>
            <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:8 }}>
              {col.l.map(i => <li key={i} style={{ fontSize:13.5, opacity:.75 }}>{i}</li>)}
            </ul>
          </div>
        ))}
        <div>
          <h4 style={{ margin:"6px 0 14px", fontSize:13, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>Stay in the loop</h4>
          <p style={{ fontSize:13, opacity:.7, margin:"0 0 12px" }}>Weekly drops, no spam. Promise.</p>
          <div style={{ display:"flex", gap:6 }}>
            <input className="input" placeholder="you@email.com"
              style={{ background:"color-mix(in srgb, var(--primary-ink) 10%, transparent)", border:"1px solid color-mix(in srgb, var(--primary-ink) 20%, transparent)", color:"var(--primary-ink)", flex:1 }}/>
            <button className="btn btn-sm" style={{ background:"var(--accent)", color:"#fff", border:0 }}>Subscribe</button>
          </div>
        </div>
      </div>
      <div style={{
        borderTop:"1px solid color-mix(in srgb, var(--primary-ink) 15%, transparent)",
        paddingTop:18, display:"flex", justifyContent:"space-between", alignItems:"center",
        fontSize:12, opacity:.6,
      }}>
        <span>© 2026 Thrift Marketplace · Made with care in India</span>
        <span className="mono">v1.4 · prototype</span>
      </div>
    </footer>
  );
}

// ─── Main Home page ──────────────────────────────────────────────────────
function HomePage({ onNav, palette, mode, heroVariant, cardLayout }) {
  const [category, setCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("Newest");
  const [saved, setSaved] = useState(new Set(["l4","l9"]));

  const toggleSave = (item) => {
    const next = new Set(saved);
    next.has(item.id) ? next.delete(item.id) : next.add(item.id);
    setSaved(next);
  };

  return (
    <Page palette={palette} mode={mode} height={3000}>
      <Nav onNav={onNav} active="home" cartCount={2}/>
      <HeroCollage variant={heroVariant} onCTA={onNav}/>
      <TickerStrip/>
      <CategoryRail active={category} onSelect={setCategory}/>
      <FilterBar
        activeFilters={filters} setFilters={setFilters}
        sortBy={sortBy} setSortBy={setSortBy}
        showFilters={showFilters} setShowFilters={setShowFilters}
        resultCount={12480}
      />
      <div style={{ height: 32 }}/>
      <TrendingRow layout={cardLayout} onOpen={(it) => onNav?.("listing", it)} saved={saved} onSave={toggleSave}/>
      <EditorialStrip onOpen={() => onNav?.("listing")}/>
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
      <ListingsGrid items={sampleListings} layout={cardLayout} onOpen={(it) => onNav?.("listing", it)} saved={saved} onSave={toggleSave}/>
      <SellerRow/>
      <Footer/>
    </Page>
  );
}

Object.assign(window, { HomePage });
