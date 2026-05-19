import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import * as I from './Icons';
import { Avatar } from './Shared';

const NAV_ITEMS = [
  { id: "home",      label: "Browse",  path: "/" },
  { id: "swap",      label: "Swap",    path: "/swap" },
  { id: "rent",      label: "Rent",    path: "/" },
];

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifsRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = location.pathname === '/' ? 'home' : location.pathname.replace('/', '');

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      display:"flex", alignItems:"center", gap: 24,
      padding: "16px 32px",
      background: "color-mix(in srgb, var(--bg) 88%, transparent)",
      backdropFilter: "blur(14px) saturate(140%)",
      WebkitBackdropFilter: "blur(14px) saturate(140%)",
      borderBottom: "1px solid var(--border)",
    }}>
      <Link to="/" style={{ cursor:"pointer", textDecoration:"none", color:"var(--ink)", flexShrink:0 }}>
        <I.ThriftMark size={16} />
      </Link>

      <nav style={{ display:"flex", gap:4, marginLeft: 8 }}>
        {NAV_ITEMS.map(it => (
          <Link key={it.id} to={it.path}
            className="btn btn-ghost btn-sm"
            style={{
              fontWeight: active === it.id ? 600 : 500,
              color: active === it.id ? "var(--ink)" : "var(--ink-mute)",
              padding: "6px 12px",
              textDecoration: "none",
            }}>{it.label}</Link>
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
        {user ? (
          <>
            <button className="btn btn-sm" style={{ borderRadius: 999 }} onClick={() => navigate('/create-listing')}>
              <I.Plus size={14}/> Sell
            </button>

            {/* Notifications */}
            <div ref={notifsRef} style={{ position:"relative" }}>
              <button className="icon-btn" onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }} style={{ position:"relative" }}>
                <I.Bell size={18}/>
                {unreadCount > 0 && (
                  <span style={{ position:"absolute", top:8, right:9, width:8, height:8, borderRadius:"50%", background:"var(--accent)", border:"2px solid var(--bg)" }}/>
                )}
              </button>
              {showNotifs && (
                <div style={{
                  position:"absolute", top:"calc(100% + 10px)", right:0, zIndex:50,
                  width:320, background:"var(--surface)", borderRadius:18,
                  border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)",
                  maxHeight:380, overflowY:"auto",
                }}>
                  <div style={{ padding:"14px 16px 10px", borderBottom:"1px solid var(--border)" }}>
                    <span style={{ fontSize:14, fontWeight:600 }}>Notifications</span>
                  </div>
                  {(notifications || []).length === 0 ? (
                    <div style={{ padding:"24px 16px", textAlign:"center", color:"var(--ink-mute)", fontSize:13 }}>All caught up</div>
                  ) : (notifications || []).slice(0,8).map((n, i) => (
                    <div key={i} style={{
                      padding:"12px 16px", borderBottom:"1px solid var(--border)",
                      borderLeft: !n.read ? "3px solid var(--accent)" : "3px solid transparent",
                      background: !n.read ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "transparent",
                    }}>
                      <div style={{ fontSize:13, fontWeight:500, color:"var(--ink)" }}>{n.title || n.type}</div>
                      {n.body && <div style={{ fontSize:12, color:"var(--ink-mute)", marginTop:2 }}>{n.body}</div>}
                      <div style={{ fontSize:10, color:"var(--ink-mute)", marginTop:4, fontFamily:"var(--mono)" }}>{n.time || n.created_at}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User menu */}
            <div ref={userRef} style={{ position:"relative" }}>
              <button className="icon-btn" onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
                style={{ padding:0, width:36, height:36, borderRadius:"50%", overflow:"hidden" }}>
                <Avatar name={profile?.full_name || user?.email || "U"} size={36} />
              </button>
              {showUser && (
                <div style={{
                  position:"absolute", top:"calc(100% + 10px)", right:0, zIndex:50,
                  width:200, background:"var(--surface)", borderRadius:14,
                  border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)", overflow:"hidden",
                }}>
                  {[
                    { label:"My Profile",  path:"/profile" },
                    { label:"Dashboard",   path:"/dashboard" },
                    { label:"Sell Item",   path:"/create-listing" },
                    ...(profile?.role === 'admin' ? [{ label:"Admin", path:"/admin" }] : []),
                  ].map(it => (
                    <button key={it.label} onClick={() => { navigate(it.path); setShowUser(false); }}
                      style={{
                        display:"block", width:"100%", textAlign:"left",
                        padding:"11px 16px", fontSize:14, color:"var(--ink)",
                        borderBottom:"1px solid var(--border)", background:"transparent", cursor:"pointer",
                      }}>{it.label}</button>
                  ))}
                  <div style={{ height:1, background:"var(--border)" }}/>
                  <button onClick={async () => { await signOut(); navigate('/login'); setShowUser(false); }}
                    style={{
                      display:"block", width:"100%", textAlign:"left",
                      padding:"11px 16px", fontSize:14, color:"#C84A3A",
                      background:"transparent", cursor:"pointer",
                    }}>Sign Out</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Join Thrift</button>
          </>
        )}
      </div>
    </header>
  );
}
