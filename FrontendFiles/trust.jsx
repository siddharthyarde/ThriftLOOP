// trust.jsx — Dispute Filing, Admin Panel
const { useState: useStateT } = React;

// ── Dispute Filing ──────────────────────────────────────────────────────
function DisputePage({ onNav, palette, mode }) {
  const [type, setType] = useStateT("condition");
  const [photos, setPhotos] = useStateT([
    { ph:"ph-warm" },
    { ph:"ph-dots" },
  ]);

  return (
    <Page palette={palette} mode={mode} height={1500}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <section style={{ padding:"32px 32px 8px" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onNav?.("tracking")}>
          <I.ArrowLeft size={14}/> Back to order
        </button>
      </section>

      <section style={{ padding:"16px 32px 32px", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:28 }}>
        <div>
          <div className="eyebrow">File a dispute</div>
          <h1 className="serif" style={{ margin:"10px 0 8px", fontSize: 48, letterSpacing:"-.015em", lineHeight:1.05 }}>
            What went wrong?
          </h1>
          <p className="muted" style={{ margin:"0 0 28px", fontSize: 15, maxWidth: 520 }}>
            Tell us what happened. Be specific — clear evidence helps us resolve disputes faster and fairly.
          </p>

          <div className="card" style={{ padding:24, borderRadius:18, background:"var(--surface)", display:"flex", flexDirection:"column", gap:24 }}>
            {/* Type */}
            <div>
              <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Dispute type</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
                {[
                  { id:"condition", l:"Condition mismatch", d:"Item arrived in worse shape than listed", icon:<I.Tag size={18}/> },
                  { id:"rental",    l:"Rental damage",      d:"Returned item had damage that wasn't there", icon:<I.Reload size={18}/> },
                  { id:"swap",      l:"Swap misrepresented",d:"Their item didn't match its listing", icon:<I.Swap size={18}/> },
                ].map(t => {
                  const on = type === t.id;
                  return (
                    <button key={t.id} onClick={() => setType(t.id)}
                      className="lift"
                      style={{
                        padding:16, cursor:"pointer", textAlign:"left",
                        border: `1.5px solid ${on ? "var(--ink)" : "var(--border)"}`,
                        background: on ? "var(--bg)" : "transparent",
                        borderRadius: 14, transition:"all .2s ease",
                        display:"flex", flexDirection:"column", gap:10, minHeight: 130,
                      }}>
                      <span style={{
                        width:36, height:36, borderRadius:10,
                        background: on ? "var(--accent)" : "var(--surface-2)",
                        color: on ? "#fff" : "var(--ink-2)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:500 }}>{t.l}</div>
                        <div className="small muted" style={{ fontSize:11.5, marginTop:4, lineHeight:1.45 }}>{t.d}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Describe */}
            <div>
              <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:8 }}>Describe the problem</div>
              <textarea className="input" rows={5} style={{ resize:"vertical", fontFamily:"inherit", lineHeight: 1.6 }}
                placeholder="What did you receive? How does it differ from the listing? Include dates, photos, and any communication with the seller."
                defaultValue="The overcoat was listed as Grade A — Like New, but the inner lining has visible tearing near the right pocket that wasn't shown in any of the photos. Buttons are also loose on the cuff."/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                <span className="small muted" style={{ fontSize:11 }}>Minimum 80 characters.</span>
                <span className="small muted" style={{ fontSize:11 }}>198 / 800</span>
              </div>
            </div>

            {/* Evidence */}
            <div>
              <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Evidence photos (up to 5)</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position:"relative", width: 110 }}>
                    <Photo variant={p.ph} aspect="1/1" style={{ borderRadius: 12 }}/>
                    <button className="icon-btn" style={{ position:"absolute", top:6, right:6, width:24, height:24, background:"color-mix(in srgb, var(--bg) 85%, transparent)" }}
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>
                      <I.Close size={12}/>
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button className="lift" onClick={() => setPhotos([...photos, { ph: ["ph-soft","ph-stripes","ph-grid"][photos.length % 3] }])}
                    style={{
                      width: 110, aspectRatio:"1/1", borderRadius: 12, border:"1.5px dashed var(--border-2)",
                      background:"transparent", color:"var(--ink-mute)", cursor:"pointer",
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4,
                    }}>
                    <I.Camera size={20}/>
                    <span className="small" style={{ fontSize:11 }}>Add photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Warning */}
            <div style={{ display:"flex", gap:10, padding:14, background:"color-mix(in srgb, var(--accent) 14%, transparent)", borderRadius: 12, alignItems:"flex-start" }}>
              <I.Shield size={16} style={{ color:"var(--accent)", flexShrink:0, marginTop:2 }}/>
              <p style={{ margin:0, fontSize:13, lineHeight:1.55 }}>
                <b>False disputes affect your trust score.</b> Our team reviews every claim with both sides' evidence. Be honest and specific.
              </p>
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button className="btn" onClick={() => onNav?.("tracking")}>Cancel</button>
              <button className="btn btn-primary btn-lg">Submit dispute <I.Arrow size={16}/></button>
            </div>
          </div>
        </div>

        {/* Side: order context */}
        <aside style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card" style={{ padding:20, borderRadius:16 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>About this order</div>
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              <Photo variant="ph-soft" aspect="1/1" style={{ width:80, borderRadius:12 }}/>
              <div>
                <div className="small muted">Uniqlo</div>
                <div className="serif" style={{ fontSize:18, marginTop:2, letterSpacing:"-.005em" }}>Wool-Blend Overcoat</div>
                <div className="serif" style={{ fontSize:18, marginTop:4, color:"var(--accent)" }}>₹1,899</div>
              </div>
            </div>
            <hr className="divider" style={{ margin:"14px 0" }}/>
            <div style={{ display:"flex", flexDirection:"column", gap: 6, fontSize: 13 }}>
              <DispRow l="Transaction" v="#TR-3941"/>
              <DispRow l="Delivered"   v="Today, 4:12 PM"/>
              <DispRow l="Seller"      v="Aanya R."/>
              <DispRow l="Window left" v="47h 32m"/>
            </div>
          </div>

          <div className="card" style={{ padding:20, borderRadius:16, background:"var(--surface)" }}>
            <div className="eyebrow" style={{ marginBottom:10 }}>How disputes work</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, fontSize: 13, lineHeight:1.55 }}>
              {[
                "We freeze the escrow payment until resolved.",
                "Aanya gets 48 hours to respond with their evidence.",
                "Our team reviews both sides and decides within 72 hours.",
                "Common outcomes: full refund, partial refund, or no action.",
              ].map((s,i) => (
                <div key={i} style={{ display:"flex", gap:10 }}>
                  <span className="mono" style={{ color:"var(--accent)", fontSize:11, fontWeight:600 }}>{String(i+1).padStart(2,"0")}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <Footer/>
    </Page>
  );
}

function DispRow({ l, v }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      <span className="muted">{l}</span>
      <span style={{ fontFamily: l.includes("Window") ? "var(--mono)" : "inherit" }}>{v}</span>
    </div>
  );
}

// ── Admin Panel ─────────────────────────────────────────────────────────
function AdminPage({ onNav, palette, mode }) {
  const [tab, setTab] = useStateT("Overview");

  const stats = [
    { k:"Total users",        v:"42,180",   d:"+412 this week",  icon:<I.User size={16}/> },
    { k:"Active listings",    v:"12,840",   d:"+218",            icon:<I.Tag size={16}/> },
    { k:"Total transactions", v:"38,420",   d:"+1.2k",           icon:<I.Cart size={16}/> },
    { k:"Total revenue",      v:"₹4.2 Cr",  d:"+18%",            icon:<span className="serif" style={{ fontSize:16 }}>₹</span> },
    { k:"Open disputes",      v:"24",       d:"+3",              icon:<I.Shield size={16}/>, bad:true },
    { k:"Flagged no-shows",    v:"6",        d:"−2",              icon:<I.Close size={16}/> },
    { k:"CO₂ saved",          v:"12.4 t",   d:"+2.1t",           icon:<I.Leaf size={16}/> },
    { k:"Water saved",        v:"24M L",    d:"+3.4M",           icon:<I.Globe size={16}/> },
  ];

  return (
    <Page palette={palette} mode={mode} height={2200}>
      {/* Admin top bar — distinct */}
      <header style={{
        padding:"14px 32px", background:"var(--primary)", color:"var(--primary-ink)",
        display:"flex", alignItems:"center", gap:16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:26, height:26, borderRadius:6, background:"var(--accent)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <I.Sliders size={14}/>
          </span>
          <span className="serif" style={{ fontSize:18, letterSpacing:"-.005em" }}>Admin panel</span>
          <span className="pill" style={{ background:"color-mix(in srgb, var(--primary-ink) 14%, transparent)", color:"var(--primary-ink)", border:0, fontSize:10 }}>RESTRICTED</span>
        </div>
        <div style={{ flex:1, maxWidth: 360, marginLeft: 12 }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", opacity:.6 }}>
              <I.Search size={14}/>
            </span>
            <input className="input" placeholder="Search users, listings, transactions…"
              style={{
                background:"color-mix(in srgb, var(--primary-ink) 10%, transparent)",
                border:"1px solid color-mix(in srgb, var(--primary-ink) 20%, transparent)",
                color:"var(--primary-ink)", paddingLeft:36, fontSize:13,
              }}/>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:"auto" }}>
          <button className="icon-btn" style={{ color:"var(--primary-ink)", position:"relative" }}>
            <I.Bell size={16}/>
            <span style={{ position:"absolute", top:8, right:9, width:7, height:7, borderRadius:"50%", background:"var(--accent)" }}/>
          </button>
          <Photo variant="ph-soft" style={{ width:32, height:32, borderRadius:"50%" }}/>
          <div style={{ fontSize: 12.5 }}>
            <div style={{ fontWeight:500 }}>Priya N.</div>
            <div style={{ opacity:.65, fontSize: 11 }}>Senior Admin</div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <section style={{ padding:"24px 32px 8px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {["Overview","Disputes","Users","Listings","No-shows"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding:"12px 18px", background:"transparent",
                border:0, cursor:"pointer", fontSize: 14,
                color: tab === t ? "var(--ink)" : "var(--ink-mute)",
                fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? "2px solid var(--ink)" : "2px solid transparent",
                marginBottom: -1,
              }}>
              {t}
              {t === "Disputes" && <span style={{ marginLeft:6, padding:"1px 6px", borderRadius:99, fontSize:10, background:"var(--accent)", color:"#fff" }}>24</span>}
              {t === "No-shows" && <span style={{ marginLeft:6, padding:"1px 6px", borderRadius:99, fontSize:10, background:"var(--surface-2)", color:"var(--ink)" }}>6</span>}
            </button>
          ))}
        </div>
      </section>

      {tab === "Overview" && (
        <section style={{ padding:"24px 32px 32px", display:"flex", flexDirection:"column", gap: 18 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 12 }}>
            {stats.map(s => <StatCard key={s.k} {...s}/>)}
          </div>

          {/* Recent transactions */}
          <div className="card" style={{ padding:20, borderRadius: 18 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 14 }}>
              <div className="eyebrow">Recent transactions</div>
              <div style={{ display:"flex", gap:6 }}>
                <button className="chip">All</button>
                <button className="chip on">Last 24h</button>
                <button className="chip">This week</button>
                <button className="btn btn-sm" style={{ marginLeft:8 }}>Export CSV</button>
              </div>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ fontSize: 11, color:"var(--ink-mute)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  {["TXN","Buyer","Seller","Item","Amount","Status",""].map((h,i) => (
                    <th key={h+i} style={{ textAlign:i === 4 ? "right" : "left", padding:"10px 8px", borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { id:"TR-3941", b:"Riya V.",    s:"Aanya R.",  it:"Wool overcoat",     amt:"₹1,899", st:"In transit", col:"var(--accent-2)" },
                  { id:"TR-3940", b:"Kabir M.",   s:"Diya S.",   it:"Slip dress",         amt:"₹1,250", st:"Escrow",     col:"var(--ink-mute)" },
                  { id:"TR-3939", b:"Aanya R.",   s:"Rohan T.",  it:"Cargo pants",        amt:"₹1,399", st:"Completed",  col:"var(--accent)" },
                  { id:"TR-3938", b:"Meera D.",   s:"Priya N.",  it:"Kurta set",          amt:"₹1,799", st:"Disputed",   col:"#C84A3A" },
                  { id:"TR-3937", b:"Diya S.",    s:"Kabir M.",  it:"Sneakers",           amt:"₹2,100", st:"Completed",  col:"var(--accent)" },
                  { id:"TR-3936", b:"Rohan T.",   s:"Aanya R.",  it:"Crossbody bag",      amt:"₹2,400", st:"Pending",    col:"var(--ink-mute)" },
                ].map(r => (
                  <tr key={r.id} style={{ fontSize: 13.5 }}>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }} className="mono">{r.id}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>{r.b}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>{r.s}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>{r.it}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)", textAlign:"right", fontFamily:"var(--serif)" }}>{r.amt}</td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)" }}>
                      <span className="pill" style={{ fontSize:11, padding:"3px 9px", background:"var(--bg)" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:r.col, display:"inline-block" }}/> {r.st}
                      </span>
                    </td>
                    <td style={{ padding:"14px 8px", borderBottom:"1px solid var(--border)", textAlign:"right" }}>
                      <button className="btn btn-ghost btn-sm">View <I.ChevronR size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "Disputes" && (
        <section style={{ padding:"24px 32px 32px", display:"flex", flexDirection:"column", gap: 14 }}>
          {[
            { id:"DP-218", type:"Condition mismatch", status:"Open · Awaiting evidence", days:"2d ago",
              filer:{ name:"Riya V.", score:4.7, ph:"ph-warm" },
              def:{ name:"Aanya R.", score:4.9, ph:"ph-soft" },
              desc:"Coat lining torn, not shown in listing photos. Buttons loose on right cuff." },
            { id:"DP-217", type:"Swap misrepresented", status:"Open · Ready to resolve", days:"4d ago",
              filer:{ name:"Kabir M.", score:4.5, ph:"ph-dots" },
              def:{ name:"Diya S.",  score:4.8, ph:"ph-stripes" },
              desc:"Item received was Size M, listed as L. They are not interchangeable for me." },
          ].map(d => <DisputeCard key={d.id} d={d}/>)}
        </section>
      )}

      {tab === "Users" && (
        <section style={{ padding:"24px 32px 32px" }}>
          <div style={{ display:"flex", gap: 10, marginBottom: 14 }}>
            <div style={{ position:"relative", flex:1, maxWidth: 360 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--ink-mute)" }}>
                <I.Search size={14}/>
              </span>
              <input className="input" placeholder="Search by name, email, city…" style={{ paddingLeft:36, fontSize:13 }}/>
            </div>
            <button className="chip on">All roles</button>
            <button className="chip">Buyers</button>
            <button className="chip">Sellers</button>
            <button className="chip">Admins</button>
          </div>
          <div className="card" style={{ padding: 8, borderRadius: 16 }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ fontSize: 11, color:"var(--ink-mute)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  {["User","City","Trust","Role","Verified",""].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"14px 12px", borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { n:"Aanya R.",   c:"Mumbai",    s:94, r:"Seller", v:true,  ph:"ph-soft" },
                  { n:"Kabir M.",   c:"Bengaluru", s:88, r:"Seller", v:true,  ph:"ph-warm" },
                  { n:"Diya S.",    c:"Delhi",     s:96, r:"Seller", v:true,  ph:"ph-dots" },
                  { n:"Riya V.",    c:"Mumbai",    s:71, r:"Buyer",  v:false, ph:"ph-stripes" },
                  { n:"Priya N.",   c:"Mumbai",    s:99, r:"Admin",  v:true,  ph:"ph-grid"  },
                  { n:"Rohan T.",   c:"Pune",      s:82, r:"Seller", v:false, ph:"ph-soft"  },
                ].map((u, i) => (
                  <tr key={i} style={{ fontSize: 13.5 }}>
                    <td style={{ padding:"14px 12px", borderBottom:"1px solid var(--border)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Photo variant={u.ph} style={{ width:32, height:32, borderRadius:"50%" }}/>
                        <span style={{ fontWeight:500 }}>{u.n}</span>
                      </div>
                    </td>
                    <td style={{ padding:"14px 12px", borderBottom:"1px solid var(--border)", color:"var(--ink-mute)" }}>{u.c}</td>
                    <td style={{ padding:"14px 12px", borderBottom:"1px solid var(--border)" }}>
                      <input className="input" defaultValue={u.s} style={{ width: 62, padding:"5px 8px", fontSize:13, textAlign:"center", background:"var(--bg)" }}/>
                    </td>
                    <td style={{ padding:"14px 12px", borderBottom:"1px solid var(--border)" }}>
                      <span className="pill" style={{ fontSize:11, padding:"2px 9px", background: u.r === "Admin" ? "var(--primary)" : "var(--bg)", color: u.r === "Admin" ? "var(--primary-ink)" : "var(--ink)", borderColor: u.r === "Admin" ? "transparent" : undefined }}>{u.r}</span>
                    </td>
                    <td style={{ padding:"14px 12px", borderBottom:"1px solid var(--border)" }}>
                      <button className={`chip ${u.v ? "on" : ""}`} style={{ padding:"4px 10px", fontSize:12 }}>
                        {u.v ? <><I.Verified size={11}/> Verified</> : "Not yet"}
                      </button>
                    </td>
                    <td style={{ padding:"14px 12px", borderBottom:"1px solid var(--border)", textAlign:"right" }}>
                      <button className="btn btn-ghost btn-sm">View store <I.Arrow size={12}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "Listings" && (
        <section style={{ padding:"24px 32px 32px" }}>
          <div className="card" style={{ padding: 8, borderRadius: 16 }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ fontSize: 11, color:"var(--ink-mute)", letterSpacing:".08em", textTransform:"uppercase" }}>
                  {["Item","Seller","Price","Status",""].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"14px 12px", borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {window.thriftData.sampleListings.slice(0, 8).map(it => (
                  <tr key={it.id} style={{ fontSize: 13.5 }}>
                    <td style={{ padding:"12px", borderBottom:"1px solid var(--border)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <Photo variant={it.ph} style={{ width:42, height:42, borderRadius:8 }}/>
                        <div>
                          <div style={{ fontWeight:500 }}>{it.title}</div>
                          <div className="small muted" style={{ fontSize:11 }}>{it.brand} · {it.cat}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"12px", borderBottom:"1px solid var(--border)", color:"var(--ink-mute)" }}>Aanya R.</td>
                    <td style={{ padding:"12px", borderBottom:"1px solid var(--border)", fontFamily:"var(--serif)" }}>₹{it.price.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"12px", borderBottom:"1px solid var(--border)" }}>
                      <span className="pill" style={{ fontSize:11, padding:"3px 9px", background:"var(--bg)" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block" }}/> Active
                      </span>
                    </td>
                    <td style={{ padding:"12px", borderBottom:"1px solid var(--border)", textAlign:"right" }}>
                      <button className="btn btn-ghost btn-sm" style={{ color:"#C84A3A" }}>Delist</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "No-shows" && (
        <section style={{ padding:"24px 32px 32px", display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { id:"NS-44", item:"Wool overcoat", parties:["Riya V.","Aanya R."], flagged:["buyer"], date:"Today" },
            { id:"NS-43", item:"Slip dress",    parties:["Kabir M.","Diya S."], flagged:["seller"], date:"Yesterday" },
            { id:"NS-42", item:"Cargo pants",   parties:["Aanya R.","Rohan T."],flagged:["buyer","seller"], date:"3d ago" },
          ].map(n => (
            <div key={n.id} className="card" style={{ padding: 18, borderRadius:14, display:"flex", alignItems:"center", gap: 18 }}>
              <Photo variant="ph-soft" style={{ width:54, height:54, borderRadius:10, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span className="mono" style={{ fontSize:11, color:"var(--ink-mute)" }}>{n.id}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 500 }}>{n.item}</span>
                </div>
                <div className="small muted" style={{ marginTop:4 }}>{n.parties.join(" ↔ ")} · {n.date}</div>
              </div>
              <div style={{ display:"flex", gap: 6 }}>
                {n.flagged.includes("buyer") && <span className="pill" style={{ fontSize:10, background:"#FFE7DF", color:"#C84A3A", borderColor:"transparent" }}>Buyer flagged</span>}
                {n.flagged.includes("seller") && <span className="pill" style={{ fontSize:10, background:"#FFE7DF", color:"#C84A3A", borderColor:"transparent" }}>Seller flagged</span>}
              </div>
              <button className="btn btn-sm">Investigate <I.Arrow size={12}/></button>
            </div>
          ))}
        </section>
      )}

      <Footer/>
    </Page>
  );
}

function DisputeCard({ d }) {
  const [res, setRes] = useStateT("no-action");
  return (
    <div className="card" style={{ padding: 22, borderRadius:18 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, marginBottom: 16 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className="mono" style={{ fontSize:11, color:"var(--ink-mute)" }}>{d.id}</span>
            <span className="pill" style={{ fontSize:10, background:"var(--surface-2)" }}>{d.type}</span>
          </div>
          <div className="serif" style={{ fontSize:18, marginTop:8, letterSpacing:"-.005em" }}>{d.desc}</div>
          <div className="small muted" style={{ marginTop:6 }}>{d.status} · {d.days}</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button className="icon-btn"><I.Chat size={16}/></button>
          <button className="icon-btn"><I.ArrowUR size={16}/></button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label:"Filer", p: d.filer, photos:["ph-warm","ph-dots"] },
          { label:"Defendant", p: d.def, photos:["ph-soft","ph-stripes"] },
        ].map((side, i) => (
          <div key={i} className="card" style={{ padding: 14, borderRadius: 12, background:"var(--bg)" }}>
            <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom: 10 }}>{side.label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <Photo variant={side.p.ph} style={{ width:36, height:36, borderRadius:"50%" }}/>
              <div>
                <div style={{ fontSize:13, fontWeight: 500 }}>{side.p.name}</div>
                <Stars value={side.p.score} size={10}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {side.photos.map((p, j) => <Photo key={j} variant={p} style={{ width: 56, height: 56, borderRadius:8 }}/>)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, padding: 14, background:"var(--surface)", borderRadius:12 }}>
        <span className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Resolution</span>
        <select value={res} onChange={e => setRes(e.target.value)}
          style={{ flex:1, padding:"8px 12px", border:"1px solid var(--border)", borderRadius:8, background:"var(--bg)", fontFamily:"inherit", fontSize:13 }}>
          <option value="no-action">No action</option>
          <option value="buyer">Buyer wins (full refund)</option>
          <option value="partial">Partial refund</option>
          <option value="seller">Seller wins</option>
        </select>
        {res === "partial" && (
          <input className="input fade-in" placeholder="Refund ₹" style={{ width: 120, padding:"8px 12px", fontSize:13 }}/>
        )}
        <button className="btn btn-primary">Resolve <I.Arrow size={14}/></button>
      </div>
    </div>
  );
}

Object.assign(window, { DisputePage, AdminPage });
