import React from 'react';
import * as I from './Icons';

// Photo placeholder
export function Photo({ variant = "ph-soft", label, style, children, className = "", aspect, ...p }) {
  return (
    <div
      className={`ph ${variant} ${className}`}
      style={{ aspectRatio: aspect, ...style }}
      {...p}
    >
      {label && <span className="ph-label">{label}</span>}
      {children}
    </div>
  );
}

// Stars
export function Stars({ value = 4.9, size = 13, showNumber = true }) {
  const full = Math.floor(value);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, color:"var(--accent)" }}>
      <span style={{ display:"inline-flex", gap:1 }}>
        {[0,1,2,3,4].map(i => <I.Star key={i} size={size} filled={i < full} />)}
      </span>
      {showNumber && <span className="small" style={{ color:"var(--ink)" }}>{value.toFixed(1)}</span>}
    </span>
  );
}

// Avatar (initials)
export function Avatar({ name = "A", size = 36 }) {
  const initials = name.split(" ").map(s => s[0]).slice(0,2).join("");
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--surface-2)", color: "var(--ink)",
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      fontWeight: 600, fontSize: size * 0.4, letterSpacing:".02em",
      border: "1px solid var(--border)",
      flexShrink:0,
    }}>{initials}</span>
  );
}

// Footer
export function Footer() {
  return (
    <footer style={{
      background:"var(--primary)", color:"var(--primary-ink)",
      padding:"56px 32px 28px", marginTop: 32,
    }}>
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 1fr 1.4fr", gap:32, marginBottom: 40 }}>
        <div>
          <div style={{ color:"var(--primary-ink)" }}><I.ThriftMark size={20}/></div>
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
          { h:"Shop",  l:["New arrivals","Trending","Swap engine","Rentals","Sale"] },
          { h:"Sell",  l:["Start selling","Pricing guide","Seller hub","Verified program","Shipping"] },
          { h:"Trust", l:["Escrow protection","Grading guide","Returns","Disputes","Terms"] },
        ].map(col => (
          <div key={col.h}>
            <h4 style={{ margin:"6px 0 14px", fontSize:13, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>{col.h}</h4>
            <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:8 }}>
              {col.l.map(i => <li key={i} style={{ fontSize:13.5, opacity:.75, cursor:"pointer" }}>{i}</li>)}
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
        <span style={{ fontFamily:"var(--mono)" }}>v1.4 · thrift</span>
      </div>
    </footer>
  );
}

// Section heading row
export function SectionHead({ eyebrow, title, action, hint }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap: 16, marginBottom: 20 }}>
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>}
        <h2 className="serif" style={{ margin:0, fontSize: 38, lineHeight: 1, letterSpacing: "-.01em" }}>{title}</h2>
        {hint && <p className="muted" style={{ margin: "8px 0 0", fontSize: 13.5 }}>{hint}</p>}
      </div>
      {action}
    </div>
  );
}

// Field row (label + input)
export function FieldRow({ label, children }) {
  return (
    <div>
      <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>{label}</label>
      {children}
    </div>
  );
}
