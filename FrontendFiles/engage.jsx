// engage.jsx — Storefront, Swap Engine, Chat, Order Tracking
const { useState: useStateE, useEffect: useEffectE, useRef: useRefE } = React;

// ── Storefront ──────────────────────────────────────────────────────────
function StorefrontPage({ onNav, palette, mode }) {
  const s = window.thriftData.sampleSeller;
  return (
    <Page palette={palette} mode={mode} height={2000}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <section style={{ padding:"32px 32px 0" }}>
        <div className="card" style={{
          padding: 0, borderRadius: 22, overflow:"hidden",
          display:"grid", gridTemplateColumns:"1fr 1.4fr", minHeight: 320,
        }}>
          <div style={{ padding: 36, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <Photo variant={s.ph} style={{ width:72, height:72, borderRadius:"50%" }}/>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <h1 className="serif" style={{ margin:0, fontSize: 32, letterSpacing:"-.01em" }}>{s.name}</h1>
                    <span className="pill pill-accent"><I.Verified size={11}/> Verified</span>
                  </div>
                  <div className="small muted" style={{ marginTop:4, display:"flex", alignItems:"center", gap:8 }}>
                    {s.handle} · <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}><I.Pin size={11}/>{s.city}</span>
                  </div>
                </div>
              </div>
              <p className="muted" style={{ margin:"24px 0 0", fontSize: 15, lineHeight:1.65, maxWidth: 420 }}>{s.bio}</p>
            </div>
            <div style={{ display:"flex", gap:10, marginTop: 28 }}>
              <button className="btn btn-primary"><I.Plus size={14}/> Follow</button>
              <button className="btn"><I.Chat size={14}/> Message</button>
              <button className="btn"><I.ArrowUR size={14}/> Share</button>
            </div>
          </div>
          <div style={{
            background:"var(--primary)", color:"var(--primary-ink)", padding: 36,
            display:"grid", gridTemplateColumns:"1fr 1fr", gap: 24, alignItems:"center", position:"relative", overflow:"hidden",
          }}>
            <div>
              <div className="serif" style={{ fontSize: 52, lineHeight:1 }}>{s.score}</div>
              <div style={{ marginTop:4 }}><Stars value={s.score} size={14}/></div>
              <div className="small" style={{ opacity:.7, marginTop:6 }}>{s.reviews} reviews</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 52, lineHeight:1 }}>{s.sales}</div>
              <div className="small" style={{ opacity:.7, marginTop:8 }}>Items sold all-time</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 36, lineHeight:1, color:"var(--accent)" }}>12</div>
              <div className="small" style={{ opacity:.7, marginTop:6 }}>Active listings</div>
            </div>
            <div>
              <div className="serif" style={{ fontSize: 36, lineHeight:1, color:"var(--accent)" }}>{"<24h"}</div>
              <div className="small" style={{ opacity:.7, marginTop:6 }}>Avg. response time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Vouches */}
      <section style={{ padding:"24px 32px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, padding: 14, background:"var(--surface)", borderRadius:14, border:"1px solid var(--border)" }}>
          <div style={{ display:"flex" }}>
            {["ph-soft","ph-warm","ph-dots","ph-stripes","ph-grid"].map((p, i) => (
              <Photo key={i} variant={p} style={{ width:30, height:30, borderRadius:"50%", marginLeft: i ? -8 : 0, border:"2px solid var(--surface)" }}/>
            ))}
            <span style={{
              width:30, height:30, borderRadius:"50%", marginLeft:-8, background:"var(--primary)", color:"var(--primary-ink)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, border:"2px solid var(--surface)",
            }}>+22</span>
          </div>
          <span style={{ fontSize: 14 }}>Vouched by <b>27 people</b> · including 3 mutuals</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft:"auto", color:"var(--ink)" }}>See vouches <I.Arrow size={12}/></button>
        </div>
      </section>

      {/* Listings */}
      <section style={{ padding:"32px 32px 56px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <div className="eyebrow">Active listings</div>
            <h2 className="serif" style={{ margin:"8px 0 0", fontSize: 32, letterSpacing:"-.01em" }}>What's on the rail today.</h2>
          </div>
          <div className="tab-row">
            {["All","Buy","Swap","Rent"].map(t => <button key={t} className={`tab ${t === "All" ? "on" : ""}`}>{t}</button>)}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:20 }}>
          {window.thriftData.sampleListings.slice(0, 8).map(it => (
            <ListingCard key={it.id} item={it} layout="editorial" onOpen={(i) => onNav?.("listing", i)}/>
          ))}
        </div>
      </section>

      <Footer/>
    </Page>
  );
}

// ── Swap Engine ─────────────────────────────────────────────────────────
function SwapEnginePage({ onNav, palette, mode }) {
  const [tab, setTab] = useStateE("Browse");
  const [theirs, setTheirs] = useStateE(window.thriftData.sampleListings[6]);
  const [mine, setMine] = useStateE(window.thriftData.sampleListings[1].id);

  const myItems = window.thriftData.sampleListings.slice(0, 5);
  const swapItems = window.thriftData.sampleListings.filter(l => l.swap);

  return (
    <Page palette={palette} mode={mode} height={2000}>
      <Nav onNav={onNav} active="swap" cartCount={2}/>

      <section style={{ padding:"32px 32px 0" }}>
        <div className="eyebrow">Swap engine</div>
        <h1 className="serif" style={{ margin:"10px 0 4px", fontSize: 56, letterSpacing:"-.02em", lineHeight: 1 }}>
          Trade what you don't wear<br/><span style={{ color:"var(--accent)", fontStyle:"italic" }}>for something you will.</span>
        </h1>
        <p className="muted" style={{ margin:"14px 0 0", fontSize: 15, maxWidth: 540 }}>
          Browse pieces marked as swap-available, then offer one of your listings in return. Pay the gap, ship in a tagged kit, done.
        </p>
      </section>

      <section style={{ padding:"24px 32px 8px" }}>
        <div className="tab-row">
          {["Browse","Propose","My swaps"].map(t => (
            <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </section>

      {tab === "Browse" && (
        <section style={{ padding:"16px 32px 32px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:20 }}>
            {swapItems.slice(0,8).map(it => (
              <div key={it.id} className="lift card" style={{ padding:12, borderRadius:16 }}>
                <Photo variant={it.ph} aspect="4/5" style={{ borderRadius: 10 }}>
                  <span className="pill" style={{ position:"absolute", top:10, left:10, fontSize:10, background:"var(--bg)" }}>SWAP</span>
                </Photo>
                <div style={{ padding:"12px 4px 4px" }}>
                  <div style={{ fontSize:14, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{it.title}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
                    <span className="serif" style={{ fontSize:18 }}>~₹{it.price.toLocaleString("en-IN")}</span>
                    <span className="small muted">{it.city}</span>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width:"100%", marginTop:12, padding:"9px 14px" }}
                    onClick={() => { setTheirs(it); setTab("Propose"); }}>
                    <I.Swap size={13}/> Propose swap
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "Propose" && (
        <section style={{ padding:"16px 32px 32px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 18 }}>
          {/* They offer */}
          <div className="card" style={{ padding:20, borderRadius:18, background:"var(--surface)" }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>They offer</div>
            {theirs ? (
              <div>
                <Photo variant={theirs.ph} aspect="4/5" style={{ borderRadius:14 }}/>
                <div className="serif" style={{ fontSize: 22, marginTop:14, letterSpacing:"-.005em" }}>{theirs.title}</div>
                <div className="small muted" style={{ marginTop:4 }}>{theirs.brand} · Size {theirs.size}</div>
                <div className="serif" style={{ marginTop: 10, fontSize: 26 }}>₹{theirs.price.toLocaleString("en-IN")}</div>
              </div>
            ) : (
              <div className="muted">Pick something from the Browse tab.</div>
            )}
          </div>

          {/* You offer */}
          <div className="card" style={{ padding:20, borderRadius:18, background:"var(--surface)" }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>You offer</div>
            <div style={{ display:"flex", flexDirection:"column", gap: 8, maxHeight: 460, overflow:"auto" }}>
              {myItems.map(it => {
                const on = mine === it.id;
                return (
                  <button key={it.id} onClick={() => setMine(it.id)}
                    style={{
                      display:"flex", gap:12, alignItems:"center", padding:10,
                      border:`1.5px solid ${on ? "var(--ink)" : "var(--border)"}`,
                      background: on ? "var(--bg)" : "transparent",
                      borderRadius:12, cursor:"pointer", textAlign:"left",
                    }}>
                    <Photo variant={it.ph} aspect="1/1" style={{ width:54, borderRadius:8, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{it.title}</div>
                      <div className="small muted">Size {it.size} · {it.brand}</div>
                    </div>
                    <span className="serif" style={{ fontSize:16 }}>₹{it.price.toLocaleString("en-IN")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Swap summary */}
          <div className="card" style={{ padding:20, borderRadius:18, background:"var(--primary)", color:"var(--primary-ink)" }}>
            <div className="eyebrow" style={{ color:"color-mix(in srgb, var(--primary-ink) 65%, transparent)", marginBottom:14 }}>Swap summary</div>
            {(() => {
              const myItem = myItems.find(m => m.id === mine);
              const gap = theirs && myItem ? theirs.price - myItem.price : 0;
              const deposit = 500;
              return (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <SwapRow l={`Their item — ${theirs?.title}`} v={`₹${theirs?.price.toLocaleString("en-IN")}`}/>
                  <SwapRow l={`Your item — ${myItem?.title}`} v={`₹${myItem?.price.toLocaleString("en-IN")}`}/>
                  <hr style={{ border:0, borderTop:"1px solid color-mix(in srgb, var(--primary-ink) 18%, transparent)" }}/>
                  <SwapRow l={gap >= 0 ? "Gap (you pay)" : "Gap (you receive)"} v={`₹${Math.abs(gap).toLocaleString("en-IN")}`} bold/>
                  <SwapRow l="Safety deposit (refundable)" v={`₹${deposit}`}/>
                  <hr style={{ border:0, borderTop:"1px solid color-mix(in srgb, var(--primary-ink) 18%, transparent)" }}/>
                  <SwapRow l="Total today" v={`₹${(Math.max(gap, 0) + deposit).toLocaleString("en-IN")}`} big/>
                  <button className="btn btn-lg" style={{ marginTop: 12, background:"var(--accent)", color:"#fff", border:0 }}>
                    <I.Swap size={16}/> Propose swap
                  </button>
                  <p className="small" style={{ margin:"6px 0 0", opacity:.7, lineHeight:1.5, fontSize:12 }}>
                    Both parties get a tagged shipping kit. Escrow holds gap + deposit until both items arrive.
                  </p>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {tab === "My swaps" && (
        <section style={{ padding:"16px 32px 32px", display:"flex", flexDirection:"column", gap: 14 }}>
          {[
            { mine: window.thriftData.sampleListings[0], theirs: window.thriftData.sampleListings[6], status: "Pending",  color: "var(--ink-mute)", action: "Cancel" },
            { mine: window.thriftData.sampleListings[1], theirs: window.thriftData.sampleListings[4], status: "Matched",  color: "var(--accent)",   action: "Pay & proceed" },
            { mine: window.thriftData.sampleListings[3], theirs: window.thriftData.sampleListings[5], status: "Escrow held", color: "var(--accent-2)", action: "Track" },
            { mine: window.thriftData.sampleListings[2], theirs: window.thriftData.sampleListings[7], status: "Completed",color: "var(--accent)",   action: "Leave review" },
          ].map((sw, i) => (
            <div key={i} className="card" style={{ padding:16, borderRadius:14, display:"flex", alignItems:"center", gap: 16 }}>
              <SwapItem item={sw.mine} label="You sent"/>
              <div style={{ flexShrink:0, color:"var(--ink-mute)" }}><I.Swap size={26}/></div>
              <SwapItem item={sw.theirs} label="You receive"/>
              <div style={{ flexShrink:0, marginLeft: 12, textAlign:"right", display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
                <span className="pill" style={{ background:"var(--bg)" }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: sw.color, display:"inline-block" }}/> {sw.status}
                </span>
                <button className={`btn btn-sm ${sw.status === "Matched" ? "btn-primary" : ""}`}>{sw.action} <I.Arrow size={12}/></button>
              </div>
            </div>
          ))}
        </section>
      )}

      <Footer/>
    </Page>
  );
}

function SwapItem({ item, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0 }}>
      <Photo variant={item.ph} aspect="1/1" style={{ width:60, borderRadius:10, flexShrink:0 }}/>
      <div style={{ minWidth:0 }}>
        <div className="small muted" style={{ fontSize:11, letterSpacing:".06em", textTransform:"uppercase" }}>{label}</div>
        <div style={{ fontSize:14, fontWeight:500, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.title}</div>
        <div className="serif" style={{ fontSize:16, marginTop:2 }}>₹{item.price.toLocaleString("en-IN")}</div>
      </div>
    </div>
  );
}

function SwapRow({ l, v, bold, big }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", fontSize: big ? 16 : 13 }}>
      <span style={{ opacity: bold ? 1 : .8 }}>{l}</span>
      <span className={big ? "serif" : ""} style={{ fontSize: big ? 24 : 14, fontWeight: bold ? 600 : 400 }}>{v}</span>
    </div>
  );
}

// ── Chat ─────────────────────────────────────────────────────────────────
function ChatPage({ onNav, palette, mode }) {
  const [messages, setMessages] = useStateE([
    { side:"in",  text:"Hey! Is the overcoat still available?", time:"9:42 AM", read:true,  day:"Yesterday" },
    { side:"out", text:"Yes it is — clean and ready to ship.", time:"9:45 AM", read:true,  day:"Yesterday" },
    { side:"in",  text:"Would you do ₹1,700 + free shipping?", time:"9:46 AM", read:true,  day:"Yesterday" },
    { side:"out", text:"Can do ₹1,750 with free shipping, that's the lowest I can go on this one.", time:"9:50 AM", read:true,  day:"Yesterday" },
    { side:"in",  text:"Works for me. Can I get a photo of the inner lining?", time:"10:12 AM", read:true, day:"Today" },
    { side:"out", text:"Sure, sending now.", time:"10:14 AM", read:true, day:"Today" },
    { side:"out", text:"", time:"10:14 AM", read:true, day:"Today", attach: true },
    { side:"in",  text:"Perfect. I'll buy it tonight.", time:"10:18 AM", read:false, day:"Today" },
  ]);
  const [draft, setDraft] = useStateE("");
  const [typing, setTyping] = useStateE(true);
  const send = () => {
    if (!draft.trim()) return;
    setMessages([...messages, { side:"out", text: draft, time:"now", read:false, day:"Today" }]);
    setDraft("");
  };

  useEffectE(() => {
    const t = setTimeout(() => setTyping(false), 4500);
    return () => clearTimeout(t);
  }, []);

  // Build days
  let lastDay = null;

  return (
    <Page palette={palette} mode={mode} height={1100}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <section style={{ padding:"24px 32px", height: "calc(100% - 80px)" }}>
        <div className="card" style={{
          borderRadius: 20, overflow:"hidden", height: 980, display:"grid",
          gridTemplateColumns: "320px 1fr",
        }}>
          {/* Chat list */}
          <aside style={{ borderRight:"1px solid var(--border)", background:"var(--surface)", display:"flex", flexDirection:"column" }}>
            <div style={{ padding: "18px 18px 12px" }}>
              <h2 className="serif" style={{ margin:0, fontSize: 22, letterSpacing:"-.01em" }}>Messages</h2>
              <div style={{ position:"relative", marginTop:12 }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--ink-mute)" }}>
                  <I.Search size={14}/>
                </span>
                <input className="input" placeholder="Search" style={{ padding:"9px 12px 9px 34px", background:"var(--bg)", fontSize: 13 }}/>
              </div>
            </div>
            <div style={{ overflow:"auto", flex:1 }}>
              {[
                { name:"Aanya R.",  last:"Sure, sending now.",          time:"10:14", unread: 1, on:true, active:true,  ph:"ph-soft" },
                { name:"Kabir M.",  last:"Thanks for the swap!",        time:"Yest",  unread: 0, on:false, ph:"ph-warm" },
                { name:"Diya S.",   last:"Is this still available?",     time:"Yest",  unread: 2, on:true, ph:"ph-dots" },
                { name:"Rohan T.",  last:"I can ship tomorrow",          time:"Mon",   unread: 0, on:false, ph:"ph-stripes" },
                { name:"Meera D.",  last:"The size works perfectly 🙏",   time:"Sun",   unread: 0, on:false, ph:"ph-grid" },
              ].map(c => (
                <button key={c.name}
                  style={{
                    display:"flex", gap:12, alignItems:"center", padding:"12px 18px", width:"100%",
                    background: c.active ? "var(--bg)" : "transparent", textAlign:"left",
                    cursor:"pointer", borderBottom:"1px solid var(--border)",
                  }}>
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <Photo variant={c.ph} style={{ width:40, height:40, borderRadius:"50%" }}/>
                    {c.on && <span style={{ position:"absolute", bottom:0, right:0, width:10, height:10, borderRadius:"50%", background:"var(--accent)", border:"2px solid var(--surface)" }}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13.5, fontWeight: c.unread ? 600 : 500 }}>{c.name}</span>
                      <span className="small muted" style={{ fontSize:11 }}>{c.time}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2 }}>
                      <span className="small muted" style={{ fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:180 }}>{c.last}</span>
                      {c.unread > 0 && <span style={{ minWidth:18, height:18, padding:"0 5px", borderRadius:99, background:"var(--accent)", color:"#fff", fontSize:10, display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:600 }}>{c.unread}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Chat window */}
          <div style={{ display:"flex", flexDirection:"column" }}>
            {/* Header */}
            <div style={{ padding:"14px 22px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:14 }}>
              <button className="icon-btn"><I.ArrowLeft size={16}/></button>
              <div style={{ position:"relative" }}>
                <Photo variant="ph-soft" style={{ width:38, height:38, borderRadius:"50%" }}/>
                <span style={{ position:"absolute", bottom:0, right:0, width:10, height:10, borderRadius:"50%", background:"var(--accent)", border:"2px solid var(--bg)" }}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:14, fontWeight:500 }}>Aanya R.</span>
                  <I.Verified size={12} style={{ color:"var(--accent)" }}/>
                </div>
                <div className="small muted" style={{ fontSize:11 }}>Online · usually replies in &lt;1h</div>
              </div>
              {/* Product pill */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 8px 6px 6px", background:"var(--surface)", borderRadius:99, border:"1px solid var(--border)" }}>
                <Photo variant="ph-soft" style={{ width:28, height:28, borderRadius:"50%" }}/>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:11.5, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:160 }}>Wool-Blend Overcoat</div>
                  <div className="serif" style={{ fontSize:12, color:"var(--ink-mute)" }}>₹1,899</div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, padding:"22px 26px", overflow:"auto", display:"flex", flexDirection:"column", gap:10, background:"var(--bg)" }}>
              {messages.map((m, i) => {
                const newDay = m.day !== lastDay; lastDay = m.day;
                return (
                  <React.Fragment key={i}>
                    {newDay && (
                      <div style={{ display:"flex", justifyContent:"center", margin:"10px 0 6px" }}>
                        <span className="pill" style={{ background:"var(--surface)", fontSize:10, letterSpacing:".1em" }}>{m.day}</span>
                      </div>
                    )}
                    <ChatBubble m={m}/>
                  </React.Fragment>
                );
              })}
              {typing && <TypingBubble/>}
            </div>

            {/* Input */}
            <div style={{ padding:"14px 22px", borderTop:"1px solid var(--border)", display:"flex", gap:10, alignItems:"center", background:"var(--surface)" }}>
              <button className="icon-btn"><I.Plus size={18}/></button>
              <input className="input" value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Type a message…" style={{ flex:1, background:"var(--bg)" }}/>
              <button className="btn btn-primary" onClick={send} style={{ padding:"10px 14px" }}>
                <I.Arrow size={16}/>
              </button>
            </div>
          </div>
        </div>
      </section>
    </Page>
  );
}

function ChatBubble({ m }) {
  const out = m.side === "out";
  return (
    <div style={{ display:"flex", justifyContent: out ? "flex-end" : "flex-start", gap:10 }}>
      {!out && <Photo variant="ph-soft" style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, marginTop:"auto" }}/>}
      <div style={{ maxWidth:"68%", display:"flex", flexDirection:"column", alignItems: out ? "flex-end" : "flex-start", gap:3 }}>
        {m.attach ? (
          <Photo variant="ph-warm" aspect="4/3" style={{ width: 220, borderRadius: 14 }}/>
        ) : (
          <div style={{
            padding:"10px 14px", borderRadius: 16,
            background: out ? "var(--primary)" : "var(--surface)",
            color: out ? "var(--primary-ink)" : "var(--ink)",
            borderBottomRightRadius: out ? 4 : 16,
            borderBottomLeftRadius:  out ? 16 : 4,
            fontSize: 14, lineHeight: 1.5,
          }}>{m.text}</div>
        )}
        <span className="small muted" style={{ fontSize:10.5, display:"inline-flex", alignItems:"center", gap:4 }}>
          {m.time}
          {out && (m.read
            ? <span style={{ display:"inline-flex", color:"var(--accent)" }}><I.Check size={12} stroke={2.2}/><I.Check size={12} stroke={2.2} style={{ marginLeft:-6 }}/></span>
            : <I.Check size={12} stroke={2}/>)
          }
        </span>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
      <Photo variant="ph-soft" style={{ width:28, height:28, borderRadius:"50%" }}/>
      <div style={{ padding:"10px 14px", borderRadius: 16, background:"var(--surface)" }}>
        <span style={{ display:"inline-flex", gap:4 }}>
          {[0,1,2].map(i => <span key={i} style={{
            width:6, height:6, borderRadius:"50%", background:"var(--ink-mute)",
            animation: `pulse 1.2s ${i*0.15}s infinite`,
          }}/>)}
        </span>
      </div>
    </div>
  );
}

// ── Order Tracking ──────────────────────────────────────────────────────
function TrackingPage({ onNav, palette, mode }) {
  const [stepIdx, setStepIdx] = useStateE(2); // 0..3
  const steps = [
    { l:"Payment",   d:"Captured" },
    { l:"Escrow",    d:"Held" },
    { l:"In transit",d:"Shipped" },
    { l:"Complete",  d:"Delivered" },
  ];

  return (
    <Page palette={palette} mode={mode} height={1400}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <section style={{ padding:"32px 32px 8px" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onNav?.("home")}>
          <I.ArrowLeft size={14}/> Back to home
        </button>
        <h1 className="serif" style={{ margin:"14px 0 0", fontSize: 44, letterSpacing:"-.015em" }}>Order tracking</h1>
        <p className="muted" style={{ margin:"6px 0 0", fontSize: 14 }}>Transaction <span className="mono" style={{ color:"var(--ink)" }}>#TR-3941</span> · Aanya R. · You are the buyer</p>
      </section>

      <section style={{ padding:"24px 32px 0" }}>
        {/* Item summary */}
        <div className="card" style={{ padding: 20, borderRadius: 18, display:"flex", gap:18, alignItems:"center" }}>
          <Photo variant="ph-soft" aspect="1/1" style={{ width: 90, borderRadius:12 }}/>
          <div style={{ flex:1 }}>
            <div className="small muted">Uniqlo · M</div>
            <div className="serif" style={{ fontSize:22, marginTop:2 }}>Wool-Blend Overcoat</div>
            <div style={{ display:"flex", gap:14, marginTop: 8, fontSize:12.5, color:"var(--ink-mute)" }}>
              <span>Placed 19 May</span>
              <span>·</span>
              <span>Expected by 23 May</span>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div className="serif" style={{ fontSize: 26 }}>₹1,899</div>
            <span className="pill pill-accent" style={{ fontSize:11, marginTop:6 }}><span style={{ width:6, height:6, borderRadius:"50%", background:"#fff", display:"inline-block" }}/> In transit</span>
          </div>
        </div>
      </section>

      {/* Stepper */}
      <section style={{ padding:"32px 32px 0" }}>
        <div className="card" style={{ padding: 28, borderRadius: 18 }}>
          <div style={{ display:"flex", alignItems:"center" }}>
            {steps.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <React.Fragment key={s.l}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, position:"relative" }}>
                    <div style={{
                      width: 44, height:44, borderRadius:"50%",
                      background: done ? "var(--accent)" : active ? "var(--primary)" : "var(--surface)",
                      color: done || active ? "var(--primary-ink)" : "var(--ink-mute)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      border: active ? "3px solid color-mix(in srgb, var(--accent) 35%, transparent)" : "1px solid var(--border)",
                      transition:"all .35s ease",
                    }}>
                      {done ? <I.Check size={18} stroke={2.2}/> : i === 0 ? <span className="serif" style={{ fontSize:15 }}>₹</span> : i === 1 ? <I.Shield size={18}/> : i === 2 ? <I.Truck size={18}/> : <I.Box size={18}/>}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: active ? 500 : 400, color: done || active ? "var(--ink)" : "var(--ink-mute)" }}>{s.l}</div>
                    <div className="small muted" style={{ fontSize:11, marginTop:2 }}>{s.d}</div>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ flex:1, height:2, background: i < stepIdx ? "var(--accent)" : "var(--border)", margin:"0 8px", transition:"background .4s", marginBottom: 28 }}/>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Escrow status */}
          <div style={{ marginTop: 28, padding: 16, borderRadius: 12, background:"var(--surface)", display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ width:40, height:40, borderRadius:"50%", background:"var(--accent)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <I.Lock size={18}/>
            </span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13.5, fontWeight:500 }}>₹1,899 held in escrow</div>
              <div className="small muted">Released to Aanya when you confirm delivery, or automatically after 48h.</div>
            </div>
            <button className="btn btn-sm">View escrow</button>
          </div>
        </div>
      </section>

      {/* Action section */}
      <section style={{ padding:"24px 32px 32px", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap: 18 }}>
        <div className="card" style={{ padding: 22, borderRadius:18 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Next step</div>
          <h2 className="serif" style={{ margin: 0, fontSize: 28, letterSpacing:"-.005em" }}>Your overcoat is on its way.</h2>
          <p className="muted" style={{ margin:"8px 0 18px", fontSize: 14 }}>
            Tracking shows it left the Mumbai sorting hub at 7:42 AM today. Confirm when it arrives.
          </p>
          <div style={{ display:"flex", gap: 10 }}>
            <button className="btn btn-primary btn-lg" onClick={() => setStepIdx(3)}>
              <I.Check size={16}/> I received it
            </button>
            <button className="btn btn-lg"><I.Chat size={16}/> Message Aanya</button>
          </div>

          <div style={{ marginTop: 22, padding: 14, borderRadius: 10, background:"color-mix(in srgb, var(--accent) 12%, transparent)", border:"1px solid var(--border-2)", display:"flex", gap:10, alignItems:"flex-start" }}>
            <I.Shield size={16} style={{ color:"var(--accent)", flexShrink:0, marginTop:2 }}/>
            <p style={{ margin:0, fontSize: 13, lineHeight:1.55 }}>
              Issue with your order? You have <b>48 hours</b> after delivery to{" "}
              <a style={{ color:"var(--ink)", borderBottom:"1px solid var(--accent)", cursor:"pointer" }} onClick={() => onNav?.("dispute")}>file a dispute</a>.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 22, borderRadius:18, background:"var(--surface)" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Activity</div>
          <div style={{ display:"flex", flexDirection:"column", gap:16, position:"relative", paddingLeft: 4 }}>
            {[
              { d:"Today, 7:42 AM",   t:"Left Mumbai sorting hub", st:"In transit" },
              { d:"Today, 6:10 AM",   t:"Picked up by courier",    st:"Shipped" },
              { d:"Yesterday, 4:30 PM",t:"Aanya marked as shipped",st:"Escrow"  },
              { d:"19 May, 11:02 AM", t:"Payment captured",         st:"Paid"    },
            ].map((e, i) => (
              <div key={i} style={{ display:"flex", gap:14, position:"relative" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background: i === 0 ? "var(--accent)" : "var(--ink-mute)" }}/>
                  {i < 3 && <span style={{ width:1.5, flex:1, background:"var(--border)", marginTop:4 }}/>}
                </div>
                <div style={{ paddingBottom: i < 3 ? 6 : 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{e.t}</div>
                  <div className="small muted" style={{ fontSize: 12 }}>{e.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer/>
    </Page>
  );
}

Object.assign(window, { StorefrontPage, SwapEnginePage, ChatPage, TrackingPage });
