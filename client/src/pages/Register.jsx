import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Photo } from '../components/Shared';
import { ThriftMark } from '../components/Icons';
import * as I from '../components/Icons';

const CITIES = ["Mumbai","Delhi","Bengaluru","Pune","Chennai","Hyderabad","Kolkata","Jaipur","Ahmedabad","Lucknow"];

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

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', locality: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Too short", "Decent", "Strong"][strength];
  const strengthColor = strength === 3 ? "var(--accent)" : strength === 2 ? "var(--accent-2)" : "var(--ink-mute)";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/api/auth/register', form);
      toast.success('Account created! Welcome to Thrift.');
      navigate('/style-quiz');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      side="right"
      phVariant="ph-warm"
      phLabel="New seller · Day 1"
      quote={{
        label: "₹12,420 earned in 30 days",
        text: "My grandmother's saree just got a second life with someone in Pune. That's what I joined for.",
        by: "Meera D. · Bengaluru",
      }}
    >
      <div style={{ maxWidth:420 }}>
        <h1 className="serif" style={{ margin:"0 0 8px", fontSize:44, letterSpacing:"-.015em", lineHeight:1.05 }}>
          Create your account.
        </h1>
        <p className="muted" style={{ margin:"0 0 28px", fontSize:15 }}>
          Join thousands buying and selling sustainably.
        </p>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Full name</label>
            <input className="input" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required/>
          </div>
          <div>
            <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Email</label>
            <input className="input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@email.com" required/>
          </div>
          <div>
            <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Password</label>
            <input className="input" type="password" name="password" value={form.password} onChange={handleChange} placeholder="At least 8 characters" required/>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
              <div style={{ display:"flex", gap:4 }}>
                {[1,2,3].map(n => (
                  <span key={n} style={{
                    width:26, height:4, borderRadius:99,
                    background: strength >= n ? strengthColor : "var(--surface-2)",
                    transition:"background .25s",
                  }}/>
                ))}
              </div>
              <span className="small muted" style={{ fontSize:11 }}>{strengthLabel}</span>
            </div>
          </div>
          <div>
            <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>City</label>
            <select className="input" name="locality" value={form.locality} onChange={handleChange}>
              <option value="">Select your city</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <p className="small muted" style={{ margin:"6px 0", fontSize:12, lineHeight:1.55 }}>
            By joining, you agree to our{" "}
            <span style={{ color:"var(--ink)", borderBottom:"1px solid var(--border-2)", cursor:"pointer" }}>Terms</span> and{" "}
            <span style={{ color:"var(--ink)", borderBottom:"1px solid var(--border-2)", cursor:"pointer" }}>Privacy Policy</span>.
          </p>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
            style={{ marginTop:4, padding:"15px 22px" }}>
            {loading ? "Creating account…" : <>Create account <I.Arrow size={16}/></>}
          </button>
        </form>

        <div style={{ marginTop:26, fontSize:13.5, color:"var(--ink-mute)" }}>
          Already have an account?{" "}
          <span style={{ color:"var(--ink)", fontWeight:500, cursor:"pointer", borderBottom:"1px solid var(--accent)" }}
            onClick={() => navigate('/login')}>Sign in</span>
        </div>
      </div>
    </AuthShell>
  );
}
