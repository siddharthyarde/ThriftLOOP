import { useNavigate } from 'react-router-dom';
import { Photo } from './Shared';
import * as I from './Icons';

const PH_VARIANTS = ["ph-soft","ph-warm","ph-dots","ph-stripes","ph-grid"];

function getPh(item) {
  if (!item) return "ph-soft";
  const phMap = { ph:"ph", "ph-soft":"ph-soft", "ph-warm":"ph-warm", "ph-dots":"ph-dots", "ph-stripes":"ph-stripes", "ph-grid":"ph-grid" };
  return phMap[item.ph] || PH_VARIANTS[(item.id?.charCodeAt(0) || 0) % PH_VARIANTS.length];
}

export function formatPrice(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

export function ConditionBadge({ grade, label }) {
  const g = grade || 'A';
  const l = label || { A:"Like New", B:"Good", C:"Fair", D:"Worn" }[g] || g;
  return (
    <span className="pill" style={{ padding:"2px 8px", fontSize:10, background:"var(--bg)", color:"var(--ink-mute)", letterSpacing:".05em" }}>
      <span style={{ color:"var(--accent)", marginRight: 2, fontWeight:700 }}>{g}</span>{l}
    </span>
  );
}

export default function ListingCard({ item, layout = "editorial", onOpen, saved, onSave }) {
  const navigate = useNavigate();
  const compact = layout === "compact";
  const ph = getPh(item);

  const handleClick = () => {
    if (onOpen) { onOpen(item); return; }
    navigate(`/listing/${item.id}`);
  };

  return (
    <article className="lift" style={{ cursor:"pointer", display:"flex", flexDirection:"column", gap: compact ? 8 : 12 }}
      onClick={handleClick}
    >
      <div style={{ position:"relative" }}>
        <Photo
          variant={ph}
          aspect={compact ? "1 / 1.15" : "4 / 5"}
          style={{ borderRadius: compact ? 10 : 14 }}
        >
          <div style={{ position:"absolute", top:10, left:10, display:"flex", gap:6, zIndex:1 }}>
            {item.swap_ok && <span className="pill" style={{ background:"var(--bg)", fontSize:10, padding:"3px 8px" }}>SWAP</span>}
            {item.rent_ok && <span className="pill" style={{ background:"var(--primary)", color:"var(--primary-ink)", fontSize:10, padding:"3px 8px", border:0 }}>RENT</span>}
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
          <span style={{ fontFamily:"var(--serif)", fontSize: compact ? 16 : 19, color:"var(--ink)" }}>
            {formatPrice(item.price)}
          </span>
          <ConditionBadge grade={item.condition_grade || item.grade} label={item.condition_label || item.gradeLabel}/>
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
