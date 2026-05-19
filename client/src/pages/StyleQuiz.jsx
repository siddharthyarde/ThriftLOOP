import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { ThriftMark } from '../components/Icons';
import * as I from '../components/Icons';

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
    { id:"xs", l:"XS", g:"XS" }, { id:"s", l:"S", g:"S" }, { id:"m", l:"M", g:"M" },
    { id:"l",  l:"L",  g:"L"  }, { id:"xl",l:"XL",g:"XL"}, { id:"xxl",l:"XXL",g:"XXL" },
  ] },
  { q:"What's your budget range?", multi:false, options:[
    { id:"b1", l:"Under ₹500",      g:"₹"    },
    { id:"b2", l:"₹500 – ₹1,500",   g:"₹₹"   },
    { id:"b3", l:"₹1,500 – ₹5,000", g:"₹₹₹"  },
    { id:"b4", l:"Above ₹5,000",    g:"₹₹₹₹" },
  ] },
];

export default function StyleQuiz() {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState({ 0:new Set(), 1:new Set(), 2:new Set() });
  const [saving, setSaving] = useState(false);

  const cur = QUIZ[step];
  const sel = picks[step] || new Set();
  const progress = ((step + 1) / QUIZ.length) * 100;

  const toggle = (id) => {
    const next = { ...picks };
    const s = new Set(next[step]);
    if (s.has(id)) {
      s.delete(id);
    } else {
      if (!cur.multi) s.clear();
      s.add(id);
    }
    next[step] = s;
    setPicks(next);
  };

  const handleNext = async () => {
    if (step < QUIZ.length - 1) {
      setStep(s => s + 1);
    } else {
      setSaving(true);
      try {
        const answers = {
          style: [...(picks[0] || [])],
          sizes: [...(picks[1] || [])],
          budget: [...(picks[2] || [])][0],
        };
        await api.put('/api/auth/profile', { style_prefs: answers });
        if (profile) await fetchProfile(profile.id);
        toast.success('Style preferences saved!');
        navigate('/');
      } catch {
        toast.error('Could not save preferences');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ padding:"24px 48px", display:"flex", alignItems:"center", gap:32, borderBottom:"1px solid var(--border)" }}>
        <ThriftMark size={16}/>
        <div style={{ flex:1, maxWidth:720 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span className="small muted" style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase" }}>Personalize your feed</span>
            <span className="mono" style={{ fontSize:11, color:"var(--ink-mute)" }}>Step {step + 1} of {QUIZ.length}</span>
          </div>
          <div className="progress"><span style={{ width:`${progress}%` }}/></div>
        </div>
        <span className="small muted" style={{ cursor:"pointer", fontSize:13 }} onClick={() => navigate('/')}>Skip for now →</span>
      </div>

      {/* Content */}
      <section style={{ padding:"64px 48px 48px", maxWidth:920, margin:"0 auto", width:"100%" }}>
        <div className="eyebrow" style={{ marginBottom:16 }}>{cur.multi ? "Choose all that apply" : "Pick one"}</div>
        <h1 className="serif" style={{ margin:"0 0 40px", fontSize:56, lineHeight:1, letterSpacing:"-.02em" }}>
          {cur.q}
        </h1>

        <div style={{
          display:"grid",
          gridTemplateColumns: cur.options.length > 4 ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
          gap:14,
        }}>
          {cur.options.map(o => {
            const on = sel.has(o.id);
            return (
              <button key={o.id} onClick={() => toggle(o.id)}
                className="lift"
                style={{
                  padding:24, textAlign:"left", cursor:"pointer",
                  border:`1.5px solid ${on ? "var(--ink)" : "var(--border)"}`,
                  background: on ? "var(--surface)" : "var(--bg)",
                  borderRadius:16, position:"relative", overflow:"hidden",
                  transition:"all .25s ease", minHeight:160,
                  display:"flex", flexDirection:"column", justifyContent:"space-between",
                }}>
                <div style={{
                  width:56, height:56, borderRadius:14,
                  background: on ? "var(--primary)" : "var(--surface-2)",
                  color: on ? "var(--primary-ink)" : "var(--ink)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"var(--serif)", fontSize:24, fontWeight:500,
                  letterSpacing:"-.02em",
                }}>{o.g}</div>
                <div>
                  <div style={{ fontSize:17, fontWeight:500, letterSpacing:"-.005em" }}>{o.l}</div>
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

        <div style={{ marginTop:48, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          {step > 0 ? (
            <button className="btn" onClick={() => setStep(step - 1)}><I.ArrowLeft size={14}/> Back</button>
          ) : <span/>}
          <button className="btn btn-primary btn-lg" disabled={!sel.size || saving}
            onClick={handleNext}
            style={{ opacity: sel.size ? 1 : .4, padding:"14px 24px" }}>
            {saving ? "Saving…" : step === QUIZ.length - 1 ? "Finish & explore" : "Next"} {!saving && <I.Arrow size={16}/>}
          </button>
        </div>
      </section>
    </div>
  );
}
