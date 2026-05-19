import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Photo } from '../components/Shared';
import * as I from '../components/Icons';

const GRADES = [
  { id:"A", l:"Like New",  d:"Worn once or twice, no flaws" },
  { id:"B", l:"Good",      d:"Minor signs of wear, no defects" },
  { id:"C", l:"Fair",      d:"Noticeable wear, all functional" },
  { id:"D", l:"Worn",      d:"Visible defects, declare them" },
];

function FormCard({ step, title, sub, children }) {
  return (
    <div className="card" style={{ padding:24, borderRadius:18, background:"var(--surface)" }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:18 }}>
        <div>
          <div className="mono" style={{ fontSize:11, color:"var(--ink-mute)", letterSpacing:".15em" }}>{step}</div>
          <h2 className="serif" style={{ margin:"4px 0 4px", fontSize:26, letterSpacing:"-.005em" }}>{title}</h2>
          <p className="small muted" style={{ margin:0, fontSize:12.5 }}>{sub}</p>
        </div>
      </div>
      {children}
    </div>
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

function CheckRow({ done, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
      <span style={{
        width:18, height:18, borderRadius:"50%",
        background: done ? "var(--accent)" : "var(--surface-2)",
        color: done ? "#fff" : "var(--ink-mute)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>{done ? <I.Check size={11}/> : <I.Close size={10}/>}</span>
      <span style={{ color: done ? "var(--ink)" : "var(--ink-mute)" }}>{label}</span>
    </div>
  );
}

export default function CreateListing() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', category: '', size: '', condition: '',
    price: '', available_for: ['buy'], locality: '',
    rental_price_per_day: '', rental_deposit: '',
  });
  const [images, setImages] = useState([null, null, null, null, null]);
  const [grade, setGrade] = useState('A');
  const [avail, setAvail] = useState({ buy:true, swap:false, rent:false });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const SLOT_LABELS = ['Front', 'Back', 'Defect', 'Extra', 'Extra'];

  const handlePhotoSelect = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const updated = [...images];
    updated[index] = { file, preview, url: null, uploading: true };
    setImages(updated);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const { data } = await api.post('/api/uploads/listing-image', { imageBase64: base64, mimeType: file.type, index });
        setImages(prev => {
          const next = [...prev];
          next[index] = { file, preview, url: data.url, uploading: false };
          return next;
        });
        toast.success(`Photo ${index + 1} uploaded`);
      } catch {
        toast.error(`Photo ${index + 1} upload failed`);
        setImages(prev => { const next = [...prev]; next[index] = null; return next; });
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index) => {
    setImages(prev => { const next = [...prev]; next[index] = null; return next; });
  };

  const filledPhotos = images.filter(Boolean);
  const requiredFilled = images.slice(0, 3).filter(Boolean).length;
  const uploadedUrls = images.filter(i => i?.url).map(i => i.url);
  const canSubmit = requiredFilled >= 3 && form.title && form.category && form.size && form.price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploadedUrls.length < 3) return toast.error('Please upload all 3 required photos');
    setSubmitting(true);
    try {
      const availFor = Object.entries(avail).filter(([, v]) => v).map(([k]) => k === 'rent' ? 'rental' : k);
      const payload = {
        ...form,
        condition: grade,
        price: parseFloat(form.price),
        images: uploadedUrls,
        available_for: availFor,
        rental_price_per_day: avail.rent ? parseFloat(form.rental_price_per_day) : undefined,
        rental_deposit:       avail.rent ? parseFloat(form.rental_deposit) : undefined,
      };
      const { data } = await api.post('/api/listings', payload);
      toast.success('Listing created!');
      navigate(`/listing/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Breadcrumb + heading */}
      <section style={{ padding:"32px 32px 8px" }}>
        <div className="small muted" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ cursor:"pointer" }} onClick={() => navigate('/dashboard')}>Dashboard</span>
          <I.ChevronR size={12}/>
          <span style={{ color:"var(--ink)" }}>New listing</span>
        </div>
        <h1 className="serif" style={{ margin:"14px 0 4px", fontSize:52, letterSpacing:"-.015em" }}>List an item.</h1>
        <p className="muted" style={{ margin:0, fontSize:15 }}>A few clean photos, an honest grade, and you're live in 2 minutes.</p>
      </section>

      <form onSubmit={handleSubmit}>
        <section style={{ padding:"24px 32px 120px", display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:28 }}>
          {/* Left column */}
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

            {/* Section 1 — Photos */}
            <FormCard step="01" title="Photos" sub="3 required · up to 5 total">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:10 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position:"relative", aspectRatio:"1/1" }}>
                    {img ? (
                      <>
                        <img src={img.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:12, display:"block" }}/>
                        {img.uploading && (
                          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.4)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11 }}>
                            uploading…
                          </div>
                        )}
                        <button type="button" onClick={() => removePhoto(i)} className="icon-btn"
                          style={{ position:"absolute", top:6, right:6, width:24, height:24, background:"color-mix(in srgb, var(--bg) 85%, transparent)" }}>
                          <I.Close size={12}/>
                        </button>
                      </>
                    ) : (
                      <label className="lift" style={{
                        width:"100%", height:"100%", borderRadius:12,
                        border:`1.5px dashed ${i < 3 ? "var(--accent)" : "var(--border-2)"}`,
                        background:"transparent", color:"var(--ink-mute)", cursor:"pointer",
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4,
                      }}>
                        <I.Camera size={20}/>
                        <span className="small" style={{ fontSize:11 }}>{SLOT_LABELS[i]}</span>
                        {i < 3 && <span style={{ fontSize:10, color:"var(--accent)" }}>required</span>}
                        <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => handlePhotoSelect(e, i)}/>
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop:14, padding:"6px 0", color:"var(--ink-mute)" }}>
                <I.Camera size={14}/> Photo guidelines & tips
              </button>
            </FormCard>

            {/* Section 2 — Details */}
            <FormCard step="02" title="Details" sub="The basics — keep it honest.">
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <FieldRow label="Title">
                  <input className="input" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Vintage Levi's Denim Jacket" required/>
                </FieldRow>
                <FieldRow label="Description">
                  <textarea className="input" name="description" value={form.description} onChange={handleChange}
                    rows={4} style={{ resize:"vertical", fontFamily:"inherit", lineHeight:1.5 }}
                    placeholder="Pre-loved condition, lining intact. Pairs well with knits and slip dresses."/>
                </FieldRow>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <FieldRow label="Category">
                    <select className="input" name="category" value={form.category} onChange={handleChange} required>
                      <option value="">Select…</option>
                      {["Tops","Bottoms","Dresses","Outerwear","Shoes","Bags","Ethnic","Accessories"].map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Size">
                    <select className="input" name="size" value={form.size} onChange={handleChange} required>
                      <option value="">Select…</option>
                      {["XS","S","M","L","XL","XXL","One Size"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </FieldRow>
                </div>

                <div>
                  <label className="small muted" style={{ display:"block", marginBottom:8, fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Condition grade</label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
                    {GRADES.map(g => {
                      const on = grade === g.id;
                      return (
                        <button key={g.id} type="button" onClick={() => setGrade(g.id)} className="lift"
                          style={{
                            padding:14, cursor:"pointer", textAlign:"left",
                            border:`1.5px solid ${on ? "var(--ink)" : "var(--border)"}`,
                            background: on ? "var(--surface)" : "var(--bg)",
                            borderRadius:12, transition:"all .2s ease",
                          }}>
                          <div className="serif" style={{ fontSize:28, color: on ? "var(--accent)" : "var(--ink-2)", lineHeight:1 }}>{g.id}</div>
                          <div style={{ fontSize:13, fontWeight:500, marginTop:8 }}>{g.l}</div>
                          <div className="small muted" style={{ fontSize:11, marginTop:2, lineHeight:1.4 }}>{g.d}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </FormCard>

            {/* Section 3 — Location & Pricing */}
            <FormCard step="03" title="Location & pricing" sub="Where it ships from + what you'd like for it.">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <FieldRow label="City">
                  <input className="input" name="locality" value={form.locality} onChange={handleChange} placeholder="Mumbai"/>
                </FieldRow>
                <FieldRow label="Sale price (₹)">
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--ink-mute)", fontFamily:"var(--serif)" }}>₹</span>
                    <input className="input" name="price" value={form.price} onChange={handleChange} type="number" min="0" placeholder="1,899" style={{ paddingLeft:28 }} required/>
                  </div>
                </FieldRow>
              </div>
              <div style={{ marginTop:14, padding:14, background:"var(--sage)", borderRadius:12, display:"flex", alignItems:"center", gap:12 }}>
                <I.Spark size={18} style={{ color:"var(--accent)" }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>AI price suggestion will appear after you fill in details</div>
                  <div className="small muted" style={{ fontSize:12 }}>Based on similar items sold recently.</div>
                </div>
              </div>
            </FormCard>

            {/* Section 4 — Availability */}
            <FormCard step="04" title="Availability" sub="What's possible with this item?">
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[
                  { id:"buy",  l:"Buy",  icon:<I.Cart size={14}/> },
                  { id:"swap", l:"Swap", icon:<I.Swap size={14}/> },
                  { id:"rent", l:"Rent", icon:<I.Calendar size={14}/> },
                ].map(o => (
                  <button key={o.id} type="button" onClick={() => setAvail({ ...avail, [o.id]: !avail[o.id] })}
                    className={`chip${avail[o.id] ? " on" : ""}`}
                    style={{ padding:"10px 18px", fontSize:14 }}>
                    {o.icon} {o.l}
                  </button>
                ))}
              </div>
              {avail.rent && (
                <div className="fade-in" style={{ marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <FieldRow label="Rent per day (₹)">
                    <input className="input" name="rental_price_per_day" value={form.rental_price_per_day} onChange={handleChange} placeholder="120"/>
                  </FieldRow>
                  <FieldRow label="Security deposit (₹)">
                    <input className="input" name="rental_deposit" value={form.rental_deposit} onChange={handleChange} placeholder="1,500"/>
                  </FieldRow>
                </div>
              )}
            </FormCard>
          </div>

          {/* Right column — preview */}
          <aside>
            <div style={{ position:"sticky", top:96 }}>
              <div className="eyebrow" style={{ marginBottom:14 }}>Live preview</div>
              <div className="card lift" style={{ padding:14, borderRadius:16 }}>
                <Photo variant={["ph-soft","ph-warm","ph-dots","ph-stripes","ph-grid"][0]} aspect="4/5" style={{ borderRadius:12 }}>
                  <div style={{ position:"absolute", top:12, left:12, display:"flex", gap:6 }}>
                    {avail.swap && <span className="pill" style={{ background:"var(--bg)", fontSize:10 }}>SWAP</span>}
                    {avail.rent && <span className="pill pill-accent" style={{ fontSize:10 }}>RENT</span>}
                  </div>
                  <span className="ph-label" style={{ alignSelf:"flex-end" }}>{form.title || "Your item"}</span>
                </Photo>
                <div style={{ padding:"12px 4px 4px" }}>
                  <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>{form.title || "Your item title"}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span className="serif" style={{ fontSize:22 }}>₹{form.price || "—"}</span>
                    <span className="pill" style={{ background:"var(--bg)", fontSize:10, padding:"2px 8px" }}>
                      <span style={{ color:"var(--accent)", fontWeight:700, marginRight:4 }}>{grade}</span>
                      {GRADES.find(g => g.id === grade)?.l}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop:16, padding:16, background:"var(--surface)", borderRadius:14 }}>
                <div className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Listing checklist</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <CheckRow done={requiredFilled >= 3} label="3 required photos uploaded"/>
                  <CheckRow done={!!form.title} label="Title and description"/>
                  <CheckRow done={!!(form.category && form.size)} label="Category, size, condition"/>
                  <CheckRow done={!!form.price} label="Location and price set"/>
                  <CheckRow done={Object.values(avail).some(Boolean)} label="At least one availability option"/>
                </div>
              </div>

              <p className="small muted" style={{ marginTop:14, lineHeight:1.5 }}>
                Listings are reviewed by our team within 4 hours. Verified sellers go live instantly.
              </p>
            </div>
          </aside>
        </section>

        {/* Sticky submit bar */}
        <div style={{
          position:"sticky", bottom:0, left:0, right:0, zIndex:20,
          padding:"14px 32px",
          background:"color-mix(in srgb, var(--bg) 92%, transparent)",
          borderTop:"1px solid var(--border)",
          backdropFilter:"blur(14px)",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--surface)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--accent)" }}>
              <I.Camera size={16}/>
            </div>
            <div>
              <div style={{ fontSize:13.5, fontWeight:500 }}>{requiredFilled} of 3 required photos uploaded · {filledPhotos.length} total</div>
              <div className="small muted" style={{ fontSize:11 }}>{requiredFilled < 3 ? "Add front, back, and defect photos to publish." : "Ready to publish."}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="button" className="btn" onClick={() => navigate('/dashboard')}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={!canSubmit || submitting}
              style={{ opacity: canSubmit ? 1 : .4 }}>
              {submitting ? "Publishing…" : <>List item <I.Arrow size={16}/></>}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
