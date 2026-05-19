// rental.jsx — Rental booking page
const { useState: useStateR, useMemo: useMemoR } = React;

// Mini calendar
function MiniCalendar({ selected = [], onPick }) {
  const today = new Date(2026, 4, 19); // May 19, 2026
  const [view, setView] = useStateR({ y: 2026, m: 4 }); // May
  const monthName = new Date(view.y, view.m).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const [from, to] = selected;
  const inRange = (d) => {
    if (!from || !to) return false;
    const t = new Date(view.y, view.m, d).getTime();
    return t > from.getTime() && t < to.getTime();
  };
  const isEnd = (d, end) => end && end.getDate() === d && end.getMonth() === view.m && end.getFullYear() === view.y;

  return (
    <div style={{ background:"var(--bg)", border:"1px solid var(--border)", borderRadius:14, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => setView({ y: view.m === 0 ? view.y-1 : view.y, m: (view.m + 11) % 12 })}>
          <I.ArrowLeft size={16}/>
        </button>
        <span style={{ fontWeight:600, fontSize:14 }}>{monthName}</span>
        <button className="icon-btn" onClick={() => setView({ y: view.m === 11 ? view.y+1 : view.y, m: (view.m + 1) % 12 })}>
          <I.Arrow size={16}/>
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:6, fontSize:11, color:"var(--ink-mute)", textTransform:"uppercase", letterSpacing:".06em" }}>
        {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} style={{ textAlign:"center", padding:6 }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>;
          const date = new Date(view.y, view.m, d);
          const isFrom = isEnd(d, from);
          const isTo   = isEnd(d, to);
          const isToday = d === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();
          const past = date < today;
          const within = inRange(d);
          return (
            <button key={i} disabled={past} onClick={() => onPick(date)}
              style={{
                aspectRatio:"1/1", border:0, borderRadius:8,
                background: (isFrom || isTo) ? "var(--primary)" : within ? "var(--sage)" : "transparent",
                color: (isFrom || isTo) ? "var(--primary-ink)" : past ? "var(--ink-mute)" : "var(--ink)",
                opacity: past ? .35 : 1,
                fontWeight: (isFrom || isTo) ? 600 : isToday ? 600 : 400,
                fontSize:13, cursor: past ? "not-allowed" : "pointer",
                outline: isToday ? "1px solid var(--accent)" : "none",
                transition:"background .15s ease",
              }}>{d}</button>
          );
        })}
      </div>
    </div>
  );
}

function RentalPage({ onNav, palette, mode, listing }) {
  const item = listing || window.thriftData.sampleListingDetail;
  const [range, setRange] = useStateR([null, null]);
  const [shipping, setShipping] = useStateR("ship"); // ship | meet

  const pickDate = (d) => {
    const [f, t] = range;
    if (!f || (f && t)) setRange([d, null]);
    else if (d < f) setRange([d, f]);
    else setRange([f, d]);
  };

  const days = useMemoR(() => {
    if (!range[0] || !range[1]) return 0;
    return Math.round((range[1] - range[0]) / 86400000) + 1;
  }, [range]);
  const rental = days * item.rentPerDay;
  const total = rental + item.deposit;

  const fmt = (d) => d ? d.toLocaleDateString("en-IN", { day:"numeric", month:"short" }) : "—";

  return (
    <Page palette={palette} mode={mode} height={1600}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <div style={{ padding:"24px 32px 8px" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onNav?.("listing", item)}>
          <I.ArrowLeft size={14}/> Back to listing
        </button>
      </div>

      <section style={{ padding:"8px 32px 24px", display:"grid", gridTemplateColumns:"1fr 1.1fr", gap:36 }}>
        {/* Left — item preview */}
        <div className="card" style={{ padding: 20, borderRadius:18 }}>
          <Photo variant={item.ph} aspect="4/5" style={{ borderRadius:14 }}>
            <span className="pill pill-accent" style={{ position:"absolute", top:14, left:14 }}>RENTAL</span>
          </Photo>
          <div style={{ marginTop:18 }}>
            <div className="small muted" style={{ marginBottom:4 }}>{item.brand}</div>
            <h2 className="serif" style={{ margin:0, fontSize:30, letterSpacing:"-.01em" }}>{item.title}</h2>
            <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:10 }}>
              <span className="serif" style={{ fontSize:26, color:"var(--accent)" }}>₹{item.rentPerDay}<span style={{ fontSize:14, color:"var(--ink-mute)" }}>/day</span></span>
              <span className="pill" style={{ background:"var(--sage)", borderColor:"transparent" }}>
                <span style={{ color:"var(--accent)", fontWeight:700, marginRight:4 }}>{item.grade}</span>{item.gradeLabel}
              </span>
            </div>
            <p className="small muted" style={{ marginTop:14, lineHeight:1.55 }}>
              ₹{item.deposit.toLocaleString("en-IN")} refundable security deposit. Returned in full when the item is sent back in original condition.
            </p>
          </div>

          {/* Seller mini */}
          <div style={{ marginTop:18, padding:14, background:"var(--bg)", borderRadius:12, display:"flex", alignItems:"center", gap:12 }}>
            <Photo variant={window.thriftData.sampleSeller.ph} style={{ width:42, height:42, borderRadius:"50%" }}/>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13.5, fontWeight:500 }}>
                {window.thriftData.sampleSeller.name}
                <I.Verified size={13} style={{ color:"var(--accent)" }}/>
              </div>
              <Stars value={window.thriftData.sampleSeller.score} size={10}/>
            </div>
            <button className="icon-btn"><I.Chat size={18}/></button>
          </div>
        </div>

        {/* Right — booking */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div>
            <div className="eyebrow">Rent · Step 1 of 2</div>
            <h1 className="serif" style={{ margin:"10px 0 0", fontSize:44, lineHeight:1.05, letterSpacing:"-.015em" }}>
              Select your rental dates.
            </h1>
            <p className="muted" style={{ margin:"10px 0 0", fontSize:14 }}>
              Pick a range — minimum 1 day, maximum 14. Pricing updates as you go.
            </p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div className="card" style={{ padding:12, borderRadius:12 }}>
              <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>From</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                <I.Calendar size={16}/>
                <span style={{ fontSize:16 }}>{fmt(range[0])}</span>
              </div>
            </div>
            <div className="card" style={{ padding:12, borderRadius:12 }}>
              <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>To</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                <I.Calendar size={16}/>
                <span style={{ fontSize:16 }}>{fmt(range[1])}</span>
              </div>
            </div>
          </div>

          <MiniCalendar selected={range} onPick={pickDate}/>

          {/* Delivery */}
          <div>
            <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Delivery</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                { id:"ship", icon:<I.Truck size={18}/>, l:"Ship it", s:"2-4 days · ₹80" },
                { id:"meet", icon:<I.Pin size={18}/>,   l:"Meet in person", s:"Mumbai · Free" },
              ].map(opt => (
                <button key={opt.id} onClick={() => setShipping(opt.id)}
                  className="lift"
                  style={{
                    textAlign:"left", padding: 14, cursor:"pointer",
                    border: `1.5px solid ${shipping === opt.id ? "var(--ink)" : "var(--border)"}`,
                    background: shipping === opt.id ? "var(--surface)" : "var(--bg)",
                    borderRadius: 12, display:"flex", gap:12, alignItems:"center",
                    transition:"all .2s ease",
                  }}>
                  <span style={{
                    width:36, height:36, borderRadius:10,
                    background: shipping === opt.id ? "var(--primary)" : "var(--surface)",
                    color: shipping === opt.id ? "var(--primary-ink)" : "var(--ink)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>{opt.l}</div>
                    <div className="small muted">{opt.s}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="card" style={{ padding:20, borderRadius:14, background:"var(--surface)" }}>
            <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>Cost breakdown</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <CostRow label={`Rental — ${days || 0} day${days === 1 ? "" : "s"} × ₹${item.rentPerDay}`} v={`₹${rental.toLocaleString("en-IN")}`}/>
              <CostRow label="Security deposit (refundable)" v={`₹${item.deposit.toLocaleString("en-IN")}`}/>
              <CostRow label={shipping === "ship" ? "Shipping (round-trip)" : "Meetup"} v={shipping === "ship" ? "₹80" : "Free"}/>
              <hr className="divider"/>
              <CostRow label="Total today" v={`₹${(total + (shipping === "ship" ? 80 : 0)).toLocaleString("en-IN")}`} bold/>
            </div>
            <div style={{ marginTop:14, display:"flex", alignItems:"flex-start", gap:8, padding:12, background:"var(--bg)", borderRadius:10 }}>
              <I.Lock size={14} style={{ color:"var(--accent)", flexShrink:0, marginTop:2 }}/>
              <p className="small muted" style={{ margin:0, lineHeight:1.5 }}>
                Payment is held in escrow until the rental period ends. Deposit returns within 48 hours of safe return.
              </p>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" disabled={!days}
            onClick={() => onNav?.("cart", { ...item, rental: true, days, total: total + (shipping === "ship" ? 80 : 0) })}
            style={{ width:"100%", padding:"16px", opacity: days ? 1 : .5, cursor: days ? "pointer" : "not-allowed" }}>
            Continue to checkout <I.Arrow size={16}/>
          </button>
        </div>
      </section>

      <Footer/>
    </Page>
  );
}

function CostRow({ label, v, bold }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", fontSize: bold ? 17 : 14 }}>
      <span className={bold ? "" : "muted"} style={{ fontWeight: bold ? 500 : 400 }}>{label}</span>
      <span className={bold ? "serif" : ""} style={{ fontWeight: bold ? 400 : 500, fontSize: bold ? 22 : 14 }}>{v}</span>
    </div>
  );
}

window.RentalPage = RentalPage;
