// components.jsx — shared building blocks: Nav, ListingCard, Stars, Avatar, Photo

const { useState, useEffect, useRef, useMemo } = React;

// ─── Photo placeholder ───────────────────────────────────────────────────
function Photo({ variant = "ph-soft", label, style, children, className = "", aspect, ...p }) {
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

// ─── Stars ──────────────────────────────────────────────────────────────
function Stars({ value = 4.9, size = 13, showNumber = true }) {
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

// ─── Avatar (initials over placeholder) ──────────────────────────────────
function Avatar({ name = "A", size = 36, ph = "ph-soft" }) {
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

// ─── Top Nav ────────────────────────────────────────────────────────────
function Nav({ active = "home", onNav, compact = false, cartCount = 2 }) {
  const items = [
    { id:"home",  label:"Browse" },
    { id:"swap",  label:"Swap" },
    { id:"rent",  label:"Rent" },
  ];
  const navStyle = {
    position: "sticky", top: 0, zIndex: 30,
    display:"flex", alignItems:"center", gap: 24,
    padding: compact ? "12px 24px" : "16px 32px",
    background: "color-mix(in srgb, var(--bg) 88%, transparent)",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    borderBottom: "1px solid var(--border)",
  };
  return (
    <header style={navStyle}>
      <a onClick={() => onNav?.("home")} style={{ cursor:"pointer", textDecoration:"none", color:"var(--ink)", flexShrink:0 }}>
        <ThriftMark size={16} />
      </a>
      <nav style={{ display:"flex", gap:4, marginLeft: 8 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => onNav?.(it.id)}
            className={`btn btn-ghost btn-sm`}
            style={{
              fontWeight: active === it.id ? 600 : 500,
              color: active === it.id ? "var(--ink)" : "var(--ink-mute)",
              padding: "6px 12px",
            }}>{it.label}</button>
        ))}
      </nav>
      <div style={{ flex:1, maxWidth: 480, marginLeft: 12 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--ink-mute)" }}>
            <I.Search size={16} />
          </span>
          <input className="input" placeholder="Search clothes, brands, styles…"
            style={{ paddingLeft: 40, background: "var(--surface)", border:"1px solid var(--border)" }} />
          <kbd style={{
            position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
            fontFamily:"var(--mono)", fontSize:11, padding:"3px 6px",
            background:"var(--bg)", border:"1px solid var(--border)", borderRadius: 6, color:"var(--ink-mute)",
          }}>⌘ K</kbd>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap: 8, marginLeft:"auto" }}>
        <button className="btn btn-sm" style={{ borderRadius: 999 }}>
          <I.Plus size={14}/> Sell
        </button>
        <button className="icon-btn" title="Notifications" style={{ position:"relative" }}>
          <I.Bell size={18}/>
          <span style={{ position:"absolute", top:8, right:9, width:8, height:8, borderRadius:"50%", background:"var(--accent)", border:"2px solid var(--bg)" }}/>
        </button>
        <button className="icon-btn" title="Cart" style={{ position:"relative" }} onClick={() => onNav?.("cart")}>
          <I.Cart size={18}/>
          {cartCount > 0 && (
            <span style={{ position:"absolute", top:4, right:4, minWidth:16, height:16, padding:"0 4px",
              borderRadius: 99, background:"var(--primary)", color:"var(--primary-ink)",
              fontSize:10, fontWeight:600, display:"inline-flex", alignItems:"center", justifyContent:"center"
            }}>{cartCount}</span>
          )}
        </button>
        <Avatar name="You" size={32} />
      </div>
    </header>
  );
}

// ─── Listing Card (two layouts) ──────────────────────────────────────────
function ListingCard({ item, layout = "editorial", onOpen, saved, onSave }) {
  const compact = layout === "compact";
  return (
    <article className="lift" style={{
      cursor:"pointer", display:"flex", flexDirection:"column",
      gap: compact ? 8 : 12,
    }}
      onClick={() => onOpen?.(item)}
    >
      <div style={{ position:"relative" }}>
        <Photo
          variant={item.ph}
          aspect={compact ? "1 / 1.15" : "4 / 5"}
          style={{ borderRadius: compact ? 10 : 14 }}
        >
          {/* badges */}
          <div style={{ position:"absolute", top:10, left:10, display:"flex", gap:6, zIndex:1 }}>
            {item.swap && <span className="pill" style={{ background:"var(--bg)", fontSize:10, padding:"3px 8px" }}>SWAP</span>}
            {item.rent && <span className="pill" style={{ background:"var(--primary)", color:"var(--primary-ink)", fontSize:10, padding:"3px 8px", border:0 }}>RENT</span>}
          </div>
          <button className="icon-btn"
            onClick={(e) => { e.stopPropagation(); onSave?.(item); }}
            style={{
              position:"absolute", top:8, right:8, zIndex:1,
              width: 32, height: 32, background:"color-mix(in srgb, var(--bg) 80%, transparent)",
              color: saved ? "var(--accent)" : "var(--ink)",
              backdropFilter:"blur(8px)",
            }}>
            <I.Heart size={16} filled={saved} />
          </button>
          {/* item label corner pin */}
          <span className="ph-label" style={{ alignSelf:"flex-end" }}>{item.title}</span>
        </Photo>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap: 4, padding: compact ? "0 2px" : 0 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap: 8 }}>
          <h3 style={{
            margin:0, fontSize: compact ? 13 : 14.5, fontWeight: 500,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>{item.title}</h3>
          {!compact && (
            <span style={{ fontSize:11, color:"var(--ink-mute)", whiteSpace:"nowrap" }}>{item.brand}</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span className="serif" style={{ fontSize: compact ? 16 : 19, color:"var(--ink)" }}>
            ₹{item.price.toLocaleString("en-IN")}
          </span>
          <span className="pill" style={{
            padding:"2px 8px", fontSize:10, background:"var(--bg)",
            color:"var(--ink-mute)", letterSpacing:".05em",
          }}>
            <span style={{ color:"var(--accent)", marginRight: 2, fontWeight:700 }}>{item.grade}</span>
            {item.gradeLabel}
          </span>
        </div>
        {!compact && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginTop:2 }}>
            <span className="small muted" style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
              <I.Pin size={12}/> {item.city}
            </span>
            <span className="small muted">Size {item.size}</span>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Section Heading row ─────────────────────────────────────────────────
function SectionHead({ eyebrow, title, action, hint }) {
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

// ─── Page chrome — gives every artboard a frame ──────────────────────────
function Page({ children, palette, mode, width = 1280, height }) {
  return (
    <div className="thrift-root" data-palette={palette} data-mode={mode}
      style={{ width, minHeight: height, background:"var(--bg)", color:"var(--ink)", overflow:"hidden", borderRadius:"inherit" }}>
      {children}
    </div>
  );
}

Object.assign(window, {
  Photo, Stars, Avatar, Nav, ListingCard, SectionHead, Page,
});
