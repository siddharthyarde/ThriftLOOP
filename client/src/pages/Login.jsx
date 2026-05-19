import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import supabase from '../lib/supabaseClient';
import { Photo } from '../components/Shared';
import { ThriftMark } from '../components/Icons';
import * as I from '../components/Icons';

function AuthShell({ children, side = "left", phVariant = "ph-soft", phLabel, quote }) {
  const photo = (
    <div style={{ position:"relative", overflow:"hidden", borderRadius: side === "left" ? "0 32px 32px 0" : "32px 0 0 32px" }}>
      <Photo variant={phVariant} style={{ height:"100%", borderRadius:0 }} label={phLabel}/>
      {quote && (
        <div style={{
          position:"absolute", left:32, right:32, bottom:36, padding:22,
          background:"color-mix(in srgb, var(--primary) 88%, transparent)",
          color:"var(--primary-ink)", borderRadius:18, backdropFilter:"blur(10px)",
        }}>
          <span className="eyebrow" style={{ color:"color-mix(in srgb, var(--primary-ink) 70%, transparent)" }}>{quote.label}</span>
          <p className="serif" style={{ margin:"10px 0 14px", fontSize:22, lineHeight:1.25, letterSpacing:"-.005em" }}>
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
    <div style={{ display:"flex", flexDirection:"column", padding:"56px 56px", justifyContent:"center", minHeight:"100%" }}>
      <div style={{ marginBottom:36, cursor:"pointer" }}>
        <ThriftMark size={18}/>
      </div>
      {children}
    </div>
  );
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", minHeight:"100vh", background:"var(--bg)" }}>
      {side === "left" ? <>{content}{photo}</> : <>{photo}{content}</>}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      phVariant="ph-soft"
      phLabel="Curated · Sunday drop"
      quote={{
        label: "Reseller spotlight",
        text: "Thrift made my closet a side hustle. I've sent ₹2.4 L of clothes to new homes.",
        by: "Aanya R. · Mumbai · ✓ Verified",
      }}
    >
      <div style={{ maxWidth:380 }}>
        <h1 className="serif" style={{ margin:"0 0 8px", fontSize:44, letterSpacing:"-.015em", lineHeight:1.05 }}>
          Welcome back.
        </h1>
        <p className="muted" style={{ margin:"0 0 28px", fontSize:15 }}>
          Sign in to your Thrift account to keep shopping, swapping, and selling.
        </p>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Email</label>
            <input className="input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@email.com" required/>
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <label className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Password</label>
              <span className="small" style={{ color:"var(--accent)", cursor:"pointer", fontSize:12 }}>Forgot password?</span>
            </div>
            <div style={{ position:"relative" }}>
              <input className="input" type={show ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="••••••••••" required/>
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
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
            style={{ marginTop:6, padding:"15px 22px" }}>
            {loading ? (
              <>Signing in<span style={{ marginLeft:6, display:"inline-flex", gap:3 }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width:4, height:4, borderRadius:"50%", background:"currentColor", opacity:.7,
                    animation:`pulse 1s ${i * 0.15}s infinite`,
                  }}/>
                ))}
              </span></>
            ) : <>Sign in <I.Arrow size={16}/></>}
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

        <div style={{ marginTop:28, fontSize:13.5, color:"var(--ink-mute)" }}>
          Don't have an account?{" "}
          <span style={{ color:"var(--ink)", fontWeight:500, cursor:"pointer", borderBottom:"1px solid var(--accent)" }}
            onClick={() => navigate('/register')}>Join Thrift</span>
        </div>
      </div>
    </AuthShell>
  );
}
