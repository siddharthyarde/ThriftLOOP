// auth.jsx — Login, Register, Style Quiz onboarding
const { useState: useStateAuth } = React;

// ── Shared chrome: split layout with photo on one side ──────────────────
function AuthShell({ children, side = "left", phVariant = "ph-soft", phLabel = "Drop 09 · Lookbook", quote }) {
  const photo = (
    <div style={{ position:"relative", overflow:"hidden", borderRadius: side === "left" ? "0 32px 32px 0" : "32px 0 0 32px" }}>
      <Photo variant={phVariant} style={{ height:"100%", borderRadius: 0 }} label={phLabel}/>
      {quote && (
        <div style={{
          position:"absolute", left:32, right:32, bottom:36, padding: 22,
          background:"color-mix(in srgb, var(--primary) 88%, transparent)",
          color:"var(--primary-ink)", borderRadius: 18, backdropFilter:"blur(10px)",
        }}>
          <span className="eyebrow" style={{ color:"color-mix(in srgb, var(--primary-ink) 70%, transparent)" }}>{quote.label}</span>
          <p className="serif" style={{ margin:"10px 0 14px", fontSize: 22, lineHeight: 1.25, letterSpacing:"-.005em" }}>
            "{quote.text}"
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Photo variant="ph-warm" style={{ width:30, height:30, borderRadius:"50%" }}/>
            <div style={{ fontSize:12, opacity:.85 }}>{quote.by}</div>
          </div>
        </div>
      )}
    </div>
  );
  const content = (
    <div style={{ display:"flex", flexDirection:"column", padding: "56px 56px", justifyContent:"center", minHeight:"100%" }}>
      <div style={{ marginBottom: 36 }}><ThriftMark size={18}/></div>
      {children}
    </div>
  );
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:"100%", background:"var(--bg)" }}>
      {side === "left" ? <>{content}{photo}</> : <>{photo}{content}</>}
    </div>
  );
}

// ── Login ───────────────────────────────────────────────────────────────
function LoginPage({ onNav, palette, mode }) {
  const [show, setShow] = useStateAuth(false);
  const [busy, setBusy] = useStateAuth(false);

  return (
    <Page palette={palette} mode={mode} height={1100}>
      <AuthShell phVariant="ph-soft" phLabel="Curated · Sunday drop"
        quote={{ label:"Reseller spotlight", text:"Thrift made my closet a side hustle. I've sent ₹2.4 L of clothes to new homes.", by:"Aanya R. · Mumbai · ✓ Verified" }}>
        <div style={{ maxWidth: 380 }}>
          <h1 className="serif" style={{ margin:"0 0 8px", fontSize: 44, letterSpacing:"-.015em", lineHeight: 1.05 }}>
            Welcome back.
          </h1>
          <p className="muted" style={{ margin:"0 0 28px", fontSize: 15 }}>
            Sign in to your Thrift account to keep shopping, swapping, and selling.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); setBusy(true); }} style={{ display:"flex", flexDirection:"column", gap: 14 }}>
            <div>
              <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Email</label>
              <input className="input" type="email" placeholder="you@email.com" defaultValue="riya@thrift.in"/>
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <label className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Password</label>
                <a className="small" style={{ color:"var(--accent)", cursor:"pointer", fontSize:12 }}>Forgot password?</a>
              </div>
              <div style={{ position:"relative" }}>
                <input className="input" type={show ? "text" : "password"} defaultValue="••••••••••"/>
                <button type="button" onClick={() => setShow(!show)}
                  className="icon-btn"
                  style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", width:34, height:34, color:"var(--ink-mute)" }}>
                  <I.Eye size={16}/>
                </button>
              </div>
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"var(--ink-2)", margin:"2px 0" }}>
              <input type="checkbox" defaultChecked style={{ accentColor:"var(--accent)" }}/>
              Keep me signed in
            </label>
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}
              style={{ marginTop: 6, padding:"15px 22px" }}>
              {busy ? <>Signing in<span style={{ marginLeft:6, display:"inline-flex", gap:3 }}>
                {[0,1,2].map(i => <span key={i} style={{
                  width:4, height:4, borderRadius:"50%", background:"currentColor", opacity:.7,
                  animation:`pulse 1s ${i*0.15}s infinite`,
                }}/>)}
              </span></> : <>Sign in <I.Arrow size={16}/></>}
            </button>

            <div style={{ display:"flex", alignItems:"center", gap:12, margin:"14px 0 4px" }}>
              <hr className="divider" style={{ flex:1 }}/>
              <span className="small muted" style={{ fontSize:11, letterSpacing:".06em", textTransform:"uppercase" }}>or</span>
              <hr className="divider" style={{ flex:1 }}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <button type="button" className="btn"><span style={{ fontFamily:"var(--serif)", fontSize:18 }}>G</span> Google</button>
              <button type="button" className="btn"><span style={{ fontFamily:"var(--serif)", fontSize:18 }}></span> Apple</button>
            </div>
          </form>

          <div style={{ marginTop: 28, fontSize: 13.5, color:"var(--ink-mute)" }}>
            Don't have an account?{" "}
            <a style={{ color:"var(--ink)", fontWeight:500, cursor:"pointer", borderBottom:"1px solid var(--accent)" }} onClick={() => onNav?.("register")}>Join Thrift</a>
          </div>
        </div>
      </AuthShell>
      <style>{`@keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:1 } }`}</style>
    </Page>
  );
}

// ── Register ────────────────────────────────────────────────────────────
function RegisterPage({ onNav, palette, mode }) {
  const [pwd, setPwd] = useStateAuth("");
  const strength = pwd.length === 0 ? 0 : pwd.length < 6 ? 1 : pwd.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Too short", "Decent", "Strong"][strength];
  return (
    <Page palette={palette} mode={mode} height={1200}>
      <AuthShell side="right" phVariant="ph-warm" phLabel="New seller · Day 1"
        quote={{ label:"₹12,420 earned in 30 days", text:"My grandmother's saree just got a second life with someone in Pune. That's what I joined for.", by:"Meera D. · Bengaluru" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 className="serif" style={{ margin:"0 0 8px", fontSize: 44, letterSpacing:"-.015em", lineHeight: 1.05 }}>
            Create your account.
          </h1>
          <p className="muted" style={{ margin:"0 0 28px", fontSize: 15 }}>
            Join thousands buying and selling sustainably.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); onNav?.("quiz"); }} style={{ display:"flex", flexDirection:"column", gap: 14 }}>
            <FieldRow label="Full name"><input className="input" placeholder="Your name"/></FieldRow>
            <FieldRow label="Email">    <input className="input" placeholder="you@email.com"/></FieldRow>
            <FieldRow label="Password">
              <div style={{ position:"relative" }}>
                <input className="input" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="At least 8 characters"/>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                <div style={{ display:"flex", gap:4 }}>
                  {[1,2,3].map(n => (
                    <span key={n} style={{
                      width: 26, height: 4, borderRadius: 99,
                      background: strength >= n ? (strength === 3 ? "var(--accent)" : strength === 2 ? "var(--accent-2)" : "var(--ink-mute)") : "var(--surface-2)",
                      transition:"background .25s",
                    }}/>
                  ))}
                </div>
                <span className="small muted" style={{ fontSize:11 }}>{strengthLabel}</span>
              </div>
            </FieldRow>
            <FieldRow label="City">
              <select className="input">
                {["Mumbai","Delhi","Bengaluru","Pune","Chennai","Hyderabad","Kolkata","Jaipur","Ahmedabad","Lucknow"].map(c => <option key={c}>{c}</option>)}
              </select>
            </FieldRow>

            <p className="small muted" style={{ margin:"6px 0", fontSize:12, lineHeight:1.55 }}>
              By joining, you agree to our{" "}
              <a style={{ color:"var(--ink)", borderBottom:"1px solid var(--border-2)" }}>Terms</a> and{" "}
              <a style={{ color:"var(--ink)", borderBottom:"1px solid var(--border-2)" }}>Privacy Policy</a>.
            </p>

            <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 4, padding:"15px 22px" }}>
              Create account <I.Arrow size={16}/>
            </button>
          </form>

          <div style={{ marginTop: 26, fontSize: 13.5, color:"var(--ink-mute)" }}>
            Already have an account?{" "}
            <a style={{ color:"var(--ink)", fontWeight:500, cursor:"pointer", borderBottom:"1px solid var(--accent)" }} onClick={() => onNav?.("login")}>Sign in</a>
          </div>
        </div>
      </AuthShell>
    </Page>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

// ── Style Quiz ──────────────────────────────────────────────────────────
const QUIZ = [
  { q:"What do you usually wear?", multi:true, options:[
      { id:"casual",   l:"Casual",     g:"01" },
      { id:"street",   l:"Streetwear", g:"02" },
      { id:"formal",   l:"Formal",     g:"03" },
      { id:"ethnic",   l:"Ethnic",     g:"04" },
      { id:"boho",     l:"Bohemian",   g:"05" },
      { id:"sporty",   l:"Sporty",     g:"06" },
  ] },
  { q:"What sizes do you wear?", multi:true, options:[
      { id:"xs", l:"XS", g:"XS"}, { id:"s", l:"S", g:"S"}, { id:"m", l:"M", g:"M"},
      { id:"l",  l:"L",  g:"L"},  { id:"xl",l:"XL",g:"XL"},{ id:"xxl",l:"XXL",g:"XXL"},
  ] },
  { q:"What's your budget range?", multi:false, options:[
      { id:"b1", l:"Under ₹500",     g:"₹"   },
      { id:"b2", l:"₹500 – ₹1,500",   g:"₹₹"  },
      { id:"b3", l:"₹1,500 – ₹5,000", g:"₹₹₹" },
      { id:"b4", l:"Above ₹5,000",   g:"₹₹₹₹"},
  ] },
];

function StyleQuizPage({ onNav, palette, mode }) {
  const [step, setStep] = useStateAuth(0);
  const [picks, setPicks] = useStateAuth({ 0:new Set(["casual","street"]), 1:new Set(["m"]), 2:new Set(["b3"]) });
  const cur = QUIZ[step];
  const sel = picks[step] || new Set();
  const toggle = (id) => {
    const next = { ...picks };
    const s = new Set(next[step]);
    if (s.has(id)) s.delete(id);
    else { if (!cur.multi) s.clear(); s.add(id); }
    next[step] = s;
    setPicks(next);
  };
  const progress = ((step + 1) / QUIZ.length) * 100;

  return (
    <Page palette={palette} mode={mode} height={1000}>
      <div style={{ padding:"24px 48px", display:"flex", alignItems:"center", gap:32, borderBottom:"1px solid var(--border)" }}>
        <ThriftMark size={16}/>
        <div style={{ flex:1, maxWidth: 720 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Personalize your feed</span>
            <span className="mono" style={{ fontSize:11, color:"var(--ink-mute)" }}>Step {step + 1} of {QUIZ.length}</span>
          </div>
          <div className="progress"><span style={{ width: `${progress}%` }}/></div>
        </div>
        <a className="small muted" style={{ cursor:"pointer", fontSize:13 }} onClick={() => onNav?.("home")}>Skip for now →</a>
      </div>

      <section style={{ padding:"64px 48px 48px", maxWidth: 920, margin:"0 auto" }}>
        <div className="eyebrow" style={{ marginBottom:16 }}>{cur.multi ? "Choose all that apply" : "Pick one"}</div>
        <h1 className="serif" style={{ margin:"0 0 40px", fontSize: 56, lineHeight:1, letterSpacing:"-.02em" }}>
          {cur.q}
        </h1>

        <div style={{
          display:"grid",
          gridTemplateColumns: cur.options.length > 4 ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
          gap: 14,
        }}>
          {cur.options.map(o => {
            const on = sel.has(o.id);
            return (
              <button key={o.id} onClick={() => toggle(o.id)}
                className="lift"
                style={{
                  padding:24, textAlign:"left", cursor:"pointer",
                  border: `1.5px solid ${on ? "var(--ink)" : "var(--border)"}`,
                  background: on ? "var(--surface)" : "var(--bg)",
                  borderRadius: 16, position:"relative", overflow:"hidden",
                  transition:"all .25s ease", minHeight: 160,
                  display:"flex", flexDirection:"column", justifyContent:"space-between",
                }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: on ? "var(--primary)" : "var(--surface-2)",
                  color: on ? "var(--primary-ink)" : "var(--ink)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"var(--serif)", fontSize: 24, fontWeight: 500,
                  letterSpacing:"-.02em",
                }}>{o.g}</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight:500, letterSpacing:"-.005em" }}>{o.l}</div>
                </div>
                {on && (
                  <span style={{
                    position:"absolute", top:14, right:14,
                    width:24, height:24, borderRadius:"50%", background:"var(--accent)", color:"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <I.Check size={14}/>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 48, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {step > 0 ? (
            <button className="btn" onClick={() => setStep(step - 1)}><I.ArrowLeft size={14}/> Back</button>
          ) : <span/>}
          <button className="btn btn-primary btn-lg" disabled={!sel.size}
            onClick={() => step === QUIZ.length - 1 ? onNav?.("home") : setStep(step + 1)}
            style={{ opacity: sel.size ? 1 : .4, padding:"14px 24px" }}>
            {step === QUIZ.length - 1 ? "Finish & explore" : "Next"} <I.Arrow size={16}/>
          </button>
        </div>
      </section>
    </Page>
  );
}

Object.assign(window, { LoginPage, RegisterPage, StyleQuizPage });
