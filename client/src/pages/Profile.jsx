import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Photo, Stars, Footer } from '../components/Shared';
import * as I from '../components/Icons';

function FieldRow({ label, children }) {
  return (
    <div>
      <label className="small muted" style={{ display:"block", marginBottom:6, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function ImpactStat({ n, k, d }) {
  return (
    <div>
      <div className="serif" style={{ fontSize:40, letterSpacing:"-.01em", lineHeight:1 }}>{n}</div>
      <div style={{ marginTop:6, fontSize:13, opacity:.85 }}>{k} <span style={{ opacity:.55, marginLeft:4, fontSize:11 }}>{d}</span></div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useAuth();
  const [form, setForm] = useState({ name:'', locality:'', bio:'' });
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("Profile");
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', locality: profile.locality || '', bio: profile.bio || '' });
    }
    fetchPhotos();
    api.get('/api/analytics/sustainability').then(r => {
      const d = r.data;
      setImpact({ co2_saved_kg: d.co2_saved ?? d.co2_saved_kg ?? 0, water_saved_liters: d.water_saved ?? d.water_saved_liters ?? 0, transactions: d.transactions ?? 0 });
    }).catch(() => {});
  }, [profile]); // eslint-disable-line

  const fetchPhotos = async () => {
    try {
      const { data } = await api.get('/api/user-photos');
      setPhotos(data || []);
    } catch { setPhotos([]); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/api/auth/profile', form);
      await fetchProfile(profile.id);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        await api.post('/api/user-photos', { imageBase64: base64, mimeType: file.type, label: 'My Photo' });
        await fetchPhotos();
        toast.success('Photo saved');
      } catch { toast.error('Photo upload failed'); }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.delete(`/api/user-photos/${photoId}`);
      setPhotos(photos.filter(p => p.id !== photoId));
      toast.success('Photo removed');
    } catch { toast.error('Delete failed'); }
  };

  if (!profile) return null;

  return (
    <>
      {/* Profile header */}
      <section style={{ padding:"32px 32px 8px" }}>
        <div className="card" style={{ padding:28, borderRadius:20, background:"var(--surface)" }}>
          <div style={{ display:"flex", gap:24, alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.name} style={{ width:120, height:120, borderRadius:"50%", objectFit:"cover" }}/>
                : <Photo variant="ph-soft" style={{ width:120, height:120, borderRadius:"50%" }}/>
              }
              <button className="icon-btn" style={{ position:"absolute", bottom:0, right:0, background:"var(--primary)", color:"var(--primary-ink)", width:36, height:36 }}>
                <I.Camera size={14}/>
              </button>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <h1 className="serif" style={{ margin:0, fontSize:38, letterSpacing:"-.015em" }}>{profile.name || 'Your Profile'}</h1>
                {profile.verified && <span className="pill pill-accent"><I.Verified size={11}/> Verified</span>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:8, fontSize:13, color:"var(--ink-mute)" }}>
                <Stars value={(profile.trust_score || 0) / 20} size={12}/>
                {profile.sales_count != null && <><span>·</span><span>{profile.sales_count} sales</span></>}
                {profile.locality && <><span>·</span><span style={{ display:"inline-flex", alignItems:"center", gap:4 }}><I.Pin size={12}/> {profile.locality}</span></>}
              </div>
            </div>
            <button className="btn" onClick={() => navigate(`/storefront/${profile.id}`)}>View public store <I.ArrowUR size={14}/></button>
          </div>
        </div>
      </section>

      {/* Sustainability impact */}
      {impact && (
        <section style={{ padding:"16px 32px 8px" }}>
          <div className="card" style={{ padding:24, borderRadius:20, background:"var(--primary)", color:"var(--primary-ink)", overflow:"hidden", position:"relative" }}>
            <div style={{ position:"absolute", right:-40, top:-40, opacity:.08, fontSize:240, fontFamily:"var(--serif)", color:"var(--primary-ink)", lineHeight:1 }}>⊕</div>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
              <I.Leaf size={20}/>
              <h2 className="serif" style={{ margin:0, fontSize:26, color:"var(--primary-ink)" }}>Your impact</h2>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:24, position:"relative" }}>
              <ImpactStat n={`${(impact.co2_saved_kg || 0).toFixed(1)} kg`}   k="CO₂ saved"    d="vs new"/>
              <ImpactStat n={`${(impact.water_saved_liters || 0).toLocaleString("en-IN")} L`} k="Water saved" d="vs new"/>
              <ImpactStat n={impact.transactions || 0}  k="Transactions" d="all-time"/>
            </div>
          </div>
        </section>
      )}

      {/* Tabs */}
      <section style={{ padding:"16px 32px 0" }}>
        <div className="tab-row">
          {["Profile","Try-on photos","Wishlist"].map(t => (
            <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </section>

      {/* Profile tab */}
      {tab === "Profile" && (
        <section style={{ padding:"16px 32px 32px", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:24 }}>
          <div className="card" style={{ padding:24, borderRadius:18 }}>
            <div className="eyebrow" style={{ marginBottom:18 }}>Your details</div>
            <form onSubmit={handleSave} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <FieldRow label="Full name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name"/></FieldRow>
              <FieldRow label="City"><input className="input" value={form.locality} onChange={e => setForm({ ...form, locality: e.target.value })} placeholder="Mumbai"/></FieldRow>
              <FieldRow label="Bio">
                <textarea className="input" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={3} style={{ resize:"vertical", fontFamily:"inherit" }}
                  placeholder="Looking for forever-pieces — silk slips, oversized blazers…"/>
              </FieldRow>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
                <button type="button" className="btn" onClick={() => setForm({ name: profile.name||'', locality: profile.locality||'', bio: profile.bio||'' })}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>

          <div className="card" style={{ padding:24, borderRadius:18, background:"var(--surface)" }}>
            <div className="eyebrow" style={{ marginBottom:18 }}>Vouches</div>
            <p className="small muted" style={{ margin:"0 0 16px", fontSize:13, lineHeight:1.6 }}>
              Build trust by completing purchases and swaps with other verified users.
            </p>
            <div style={{ marginTop:16 }}>
              <div className="eyebrow" style={{ marginBottom:10 }}>Trust score</div>
              <div className="serif" style={{ fontSize:54, color:"var(--accent)", lineHeight:1 }}>
                {profile.trust_score || 0}<span style={{ fontSize:24, color:"var(--ink-mute)" }}>/100</span>
              </div>
              <div className="small muted" style={{ fontSize:12, marginTop:6 }}>Based on your transaction history.</div>
            </div>
          </div>
        </section>
      )}

      {/* Try-on photos tab */}
      {tab === "Try-on photos" && (
        <section style={{ padding:"16px 32px 32px" }}>
          <label style={{
            display:"block", padding:36, border:"1.5px dashed var(--border-2)", borderRadius:18, textAlign:"center",
            background:"var(--surface)", cursor:"pointer",
          }}>
            <div style={{ width:56, height:56, borderRadius:"50%", margin:"0 auto 16px", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)" }}>
              <I.Camera size={22}/>
            </div>
            <h3 className="serif" style={{ margin:"0 0 6px", fontSize:24 }}>Upload try-on photos</h3>
            <p className="muted" style={{ margin:"0 auto 18px", maxWidth:400, fontSize:13 }}>
              Drag and drop or click to upload. We'll use them for virtual try-on, never shared.
            </p>
            <span className="btn btn-primary"><I.Plus size={14}/> Choose photos</span>
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload}/>
          </label>

          <div style={{ marginTop:24, display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:14 }}>
            {photos.map((p, i) => (
              <div key={p.id || i} style={{ position:"relative" }}>
                <img src={p.photo_url} alt={p.label} style={{ width:"100%", aspectRatio:"3/4", objectFit:"cover", borderRadius:14, display:"block" }}/>
                <button className="icon-btn" style={{ position:"absolute", top:8, right:8, width:30, height:30, background:"color-mix(in srgb, var(--bg) 85%, transparent)" }}
                  onClick={() => handleDeletePhoto(p.id)}>
                  <I.Close size={14}/>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Wishlist tab */}
      {tab === "Wishlist" && (
        <section style={{ padding:"16px 32px 32px" }}>
          <p className="muted small" style={{ textAlign:"center", padding:"64px 0" }}>Your wishlist will appear here.</p>
        </section>
      )}

      <Footer/>
    </>
  );
}
