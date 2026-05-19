// cart.jsx — Cart / Checkout page
const { useState: useStateC } = React;

function CartPage({ onNav, palette, mode, listing }) {
  const item = listing || window.thriftData.sampleListingDetail;
  const isRental = !!item.rental;

  const [step, setStep] = useStateC(1); // 1: cart, 2: address, 3: pay, 4: done
  const [delivery, setDelivery] = useStateC("ship");
  const [pay, setPay] = useStateC("razorpay");

  const subtotal = isRental ? item.total : item.price;
  const fee = Math.round(subtotal * 0.03);
  const shipping = delivery === "ship" ? 80 : 0;
  const total = subtotal + fee + shipping;

  return (
    <Page palette={palette} mode={mode} height={1600}>
      <Nav onNav={onNav} active="home" cartCount={2}/>

      <section style={{ padding:"24px 32px 8px" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onNav?.("listing", item)}>
          <I.ArrowLeft size={14}/> Continue shopping
        </button>
      </section>

      {/* Progress stepper */}
      <section style={{ padding: "16px 32px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", maxWidth: 760 }}>
          {["Cart", "Address", "Payment", "Done"].map((s, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <React.Fragment key={s}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: done ? "var(--accent)" : active ? "var(--primary)" : "var(--surface)",
                    color: done || active ? "var(--primary-ink)" : "var(--ink-mute)",
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    fontWeight: 600, fontSize: 13,
                    border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
                    transition: "all .25s ease",
                  }}>{done ? <I.Check size={14}/> : n}</span>
                  <span style={{ fontSize: 13, color: active ? "var(--ink)" : "var(--ink-mute)", fontWeight: active ? 500 : 400 }}>{s}</span>
                </div>
                {i < 3 && <div style={{ flex:1, height:1, background: step > n ? "var(--accent)" : "var(--border)", margin:"0 14px", transition:"background .3s" }}/>}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      <section style={{ padding:"0 32px 56px", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap: 28 }}>
        <div>
          {step === 1 && <CartStep item={item} isRental={isRental} onNext={() => setStep(2)}/>}
          {step === 2 && <AddressStep delivery={delivery} setDelivery={setDelivery} onNext={() => setStep(3)} onBack={() => setStep(1)}/>}
          {step === 3 && <PaymentStep pay={pay} setPay={setPay} total={total} onNext={() => setStep(4)} onBack={() => setStep(2)}/>}
          {step === 4 && <SuccessStep onNav={onNav}/>}
        </div>

        {/* Order summary */}
        <aside style={{ position:"sticky", top:88, alignSelf:"start" }}>
          <div className="card" style={{ padding:20, borderRadius:18 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>Order summary</div>
            <div style={{ display:"flex", gap:12, marginBottom:14 }}>
              <Photo variant={item.ph} aspect="1/1" style={{ width:84, borderRadius:10 }}/>
              <div style={{ minWidth:0 }}>
                <div className="small muted">{item.brand}</div>
                <div style={{ fontSize:14, fontWeight:500, marginTop:2 }}>{item.title}</div>
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  {isRental
                    ? <span className="pill pill-accent" style={{ fontSize:10, padding:"2px 8px" }}>RENT · {item.days}d</span>
                    : <span className="pill pill-dark" style={{ fontSize:10, padding:"2px 8px" }}>BUY</span>}
                  <span className="pill" style={{ fontSize:10, padding:"2px 8px", background:"var(--bg)" }}>Size {item.size}</span>
                </div>
              </div>
            </div>
            <hr className="divider"/>
            <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"16px 0" }}>
              <CartRow l={isRental ? `Rental (${item.days} days)` : "Item"} v={`₹${subtotal.toLocaleString("en-IN")}`}/>
              <CartRow l="Service fee" v={`₹${fee.toLocaleString("en-IN")}`}/>
              <CartRow l={delivery === "ship" ? "Shipping" : "Meetup"} v={shipping ? `₹${shipping}` : "Free"}/>
            </div>
            <hr className="divider"/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:14 }}>
              <span style={{ fontSize:13, fontWeight:500 }}>Total</span>
              <span className="serif" style={{ fontSize: 32 }}>₹{total.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ marginTop:14, padding:12, background:"var(--bg)", borderRadius:12, display:"flex", gap:10, alignItems:"flex-start" }}>
              <I.Leaf size={16} style={{ color:"var(--accent)", flexShrink:0, marginTop:2 }}/>
              <div className="small" style={{ lineHeight:1.45 }}>
                Buying this saves <b>~2.4 kg CO₂</b> and <b>~3,800 L water</b> vs new.
              </div>
            </div>
          </div>

          <div style={{ marginTop:14, padding:14, display:"flex", alignItems:"center", gap:10, fontSize:12, color:"var(--ink-mute)" }}>
            <I.Shield size={14} style={{ color:"var(--accent)" }}/>
            Escrow-protected · Razorpay-secured · 48-hr return window
          </div>
        </aside>
      </section>

      <Footer/>
    </Page>
  );
}

function CartRow({ l, v }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13.5 }}>
      <span className="muted">{l}</span>
      <span>{v}</span>
    </div>
  );
}

// Step 1
function CartStep({ item, isRental, onNext }) {
  return (
    <div className="card" style={{ padding:24, borderRadius:18 }}>
      <h2 className="serif" style={{ margin:"0 0 6px", fontSize:32, letterSpacing:"-.01em" }}>Your bag</h2>
      <p className="muted" style={{ margin:"0 0 24px", fontSize:14 }}>1 item · ready to check out</p>

      <div style={{ display:"flex", gap:18, padding:18, background:"var(--bg)", borderRadius:14, alignItems:"center" }}>
        <Photo variant={item.ph} aspect="1/1" style={{ width: 130, borderRadius: 12 }}/>
        <div style={{ flex:1 }}>
          <div className="small muted">{item.brand}</div>
          <div className="serif" style={{ fontSize:22, marginTop:4, letterSpacing:"-.01em" }}>{item.title}</div>
          <div style={{ display:"flex", gap:6, marginTop:10 }}>
            <span className="pill" style={{ background:"var(--surface)", fontSize:11 }}>Size {item.size}</span>
            <span className="pill" style={{ background:"var(--surface)", fontSize:11 }}>
              <span style={{ color:"var(--accent)", fontWeight:700, marginRight:3 }}>{item.grade}</span>{item.gradeLabel}
            </span>
            {isRental && <span className="pill pill-accent" style={{ fontSize:11 }}>RENT · {item.days}d</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:14 }}>
            <button className="btn btn-ghost btn-sm" style={{ color:"var(--ink-mute)" }}><I.Bookmark size={13}/> Save for later</button>
            <button className="btn btn-ghost btn-sm" style={{ color:"var(--ink-mute)" }}><I.Close size={13}/> Remove</button>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div className="serif" style={{ fontSize:28 }}>₹{(isRental ? item.total : item.price).toLocaleString("en-IN")}</div>
          {isRental && <div className="small muted">incl. deposit</div>}
        </div>
      </div>

      {/* Suggested */}
      <div style={{ marginTop: 28 }}>
        <div className="eyebrow" style={{ marginBottom:14 }}>You might also want</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
          {window.thriftData.sampleListings.slice(2, 5).map(l => (
            <div key={l.id} className="lift" style={{ display:"flex", gap:10, padding:10, borderRadius:12, background:"var(--bg)", cursor:"pointer", alignItems:"center" }}>
              <Photo variant={l.ph} aspect="1/1" style={{ width: 56, borderRadius:8, flexShrink:0 }}/>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:12.5, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.title}</div>
                <div className="serif" style={{ fontSize:15, marginTop:2 }}>₹{l.price.toLocaleString("en-IN")}</div>
              </div>
              <button className="icon-btn" style={{ width:30, height:30 }}><I.Plus size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={onNext}
        style={{ width:"100%", padding:"16px", marginTop:28 }}>
        Continue to address <I.Arrow size={16}/>
      </button>
    </div>
  );
}

// Step 2
function AddressStep({ delivery, setDelivery, onNext, onBack }) {
  return (
    <div className="card" style={{ padding:24, borderRadius:18 }}>
      <h2 className="serif" style={{ margin:"0 0 6px", fontSize:32, letterSpacing:"-.01em" }}>Where should it go?</h2>
      <p className="muted" style={{ margin:"0 0 24px", fontSize:14 }}>Choose delivery, then fill in your details.</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom: 24 }}>
        {[
          { id:"ship", icon:<I.Truck size={20}/>, l:"Ship to me", s:"2–4 days · ₹80" },
          { id:"meet", icon:<I.Pin size={20}/>,   l:"Meet seller", s:"Mumbai · Free" },
        ].map(opt => (
          <button key={opt.id} onClick={() => setDelivery(opt.id)}
            className="lift"
            style={{
              textAlign:"left", padding: 18, cursor:"pointer",
              border: `1.5px solid ${delivery === opt.id ? "var(--ink)" : "var(--border)"}`,
              background: delivery === opt.id ? "var(--surface)" : "var(--bg)",
              borderRadius: 14, display:"flex", gap:14, alignItems:"center",
              transition:"all .2s ease",
            }}>
            <span style={{
              width:44, height:44, borderRadius:12,
              background: delivery === opt.id ? "var(--primary)" : "var(--surface)",
              color: delivery === opt.id ? "var(--primary-ink)" : "var(--ink)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{opt.icon}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:500 }}>{opt.l}</div>
              <div className="small muted" style={{ marginTop:2 }}>{opt.s}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Field label="Full name" value="Riya Verma"/>
        <Field label="Phone" value="+91 98XX XXX XXX"/>
        <Field label="Street address" wide value="A-204, Mathura Heights, Veera Desai Rd"/>
        <Field label="City" value="Mumbai"/>
        <Field label="PIN code" value="400053"/>
      </div>

      <div style={{ display:"flex", gap:10, marginTop: 28 }}>
        <button className="btn btn-lg" onClick={onBack} style={{ flex:"0 0 auto" }}>
          <I.ArrowLeft size={16}/> Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext} style={{ flex:1, padding:"16px" }}>
          Continue to payment <I.Arrow size={16}/>
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, wide }) {
  return (
    <div style={{ gridColumn: wide ? "1 / span 2" : "auto" }}>
      <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>{label}</label>
      <input className="input" defaultValue={value}/>
    </div>
  );
}

// Step 3
function PaymentStep({ pay, setPay, total, onNext, onBack }) {
  return (
    <div className="card" style={{ padding:24, borderRadius:18 }}>
      <h2 className="serif" style={{ margin:"0 0 6px", fontSize:32, letterSpacing:"-.01em" }}>How would you like to pay?</h2>
      <p className="muted" style={{ margin:"0 0 24px", fontSize:14 }}>Held in escrow. Released to the seller once you receive the item.</p>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { id:"razorpay", l:"UPI / Cards (Razorpay)", s:"Pay with any UPI app, debit, or credit card", glyph:"₹" },
          { id:"upi",      l:"Direct UPI", s:"Send to thrift@upi · for ₹500+ orders", glyph:"@" },
          { id:"bnpl",     l:"Pay in 3 (no interest)", s:"Split into 3 instalments via Simpl",  glyph:"3×" },
        ].map(opt => (
          <button key={opt.id} onClick={() => setPay(opt.id)}
            style={{
              textAlign:"left", padding: 16, cursor:"pointer",
              border: `1.5px solid ${pay === opt.id ? "var(--ink)" : "var(--border)"}`,
              background: pay === opt.id ? "var(--surface)" : "var(--bg)",
              borderRadius: 14, display:"flex", gap:14, alignItems:"center",
            }}>
            <span style={{
              width:40, height:40, borderRadius:10, background:"var(--primary)", color:"var(--primary-ink)",
              display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--serif)", fontSize:18,
            }}>{opt.glyph}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14.5, fontWeight:500 }}>{opt.l}</div>
              <div className="small muted">{opt.s}</div>
            </div>
            <span style={{
              width:20, height:20, borderRadius:"50%",
              background: pay === opt.id ? "var(--accent)" : "transparent",
              border: pay === opt.id ? "none" : "1.5px solid var(--border-2)",
              display:"flex", alignItems:"center", justifyContent:"center", color:"#fff",
            }}>{pay === opt.id && <I.Check size={12}/>}</span>
          </button>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, marginTop: 28 }}>
        <button className="btn btn-lg" onClick={onBack}>
          <I.ArrowLeft size={16}/> Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={onNext} style={{ flex:1, padding:"16px" }}>
          <I.Lock size={16}/> Pay ₹{total.toLocaleString("en-IN")} securely
        </button>
      </div>
    </div>
  );
}

// Step 4
function SuccessStep({ onNav }) {
  return (
    <div className="card" style={{ padding:36, borderRadius:18, textAlign:"center", background:"var(--primary)", color:"var(--primary-ink)" }}>
      <span style={{
        width:64, height:64, borderRadius:"50%", background:"var(--accent)", color:"#fff",
        display:"inline-flex", alignItems:"center", justifyContent:"center", margin:"0 auto",
      }}>
        <I.Check size={28} stroke={2.2}/>
      </span>
      <h2 className="serif" style={{ margin:"20px 0 8px", fontSize:42, letterSpacing:"-.01em", color:"var(--primary-ink)" }}>You did good.</h2>
      <p style={{ margin:"0 auto 24px", maxWidth:420, opacity:.8, lineHeight:1.55 }}>
        Order placed and payment held in escrow. Aanya has 24 hours to confirm and ship. We'll keep you posted.
      </p>
      <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
        <button className="btn btn-lg" onClick={() => onNav?.("home")} style={{ background:"color-mix(in srgb, var(--primary-ink) 12%, transparent)", color:"var(--primary-ink)", border:0 }}>
          Keep shopping
        </button>
        <button className="btn btn-lg" style={{ background:"var(--bg)", color:"var(--ink)", border:0 }}>
          Track order <I.Arrow size={16}/>
        </button>
      </div>

      <div style={{ marginTop:32, padding:20, background:"color-mix(in srgb, var(--primary-ink) 8%, transparent)", borderRadius:14, display:"flex", alignItems:"center", gap:16 }}>
        <I.Leaf size={28} style={{ color:"var(--accent)" }}/>
        <div style={{ textAlign:"left", flex:1 }}>
          <div className="serif" style={{ fontSize:18 }}>+2.4 kg CO₂ saved · +3,800 L water saved</div>
          <div className="small" style={{ opacity:.7, marginTop:2 }}>Added to your impact dashboard.</div>
        </div>
      </div>
    </div>
  );
}

window.CartPage = CartPage;
