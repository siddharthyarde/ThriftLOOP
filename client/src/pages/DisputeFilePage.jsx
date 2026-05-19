import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { formatPrice } from '../components/ListingCard';
import { Photo, Footer } from '../components/Shared';
import * as I from '../components/Icons';

function DispRow({ l, v, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span className="muted">{l}</span>
      <span style={{ fontFamily: mono ? 'var(--mono)' : 'inherit' }}>{v}</span>
    </div>
  );
}

export default function DisputeFilePage() {
  const { txnId } = useParams();
  const navigate = useNavigate();

  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState('condition');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get(`/api/transactions/${txnId}`)
      .then(r => setTxn(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [txnId, navigate]);

  const handlePhotoAdd = (e) => {
    const file = e.target.files[0];
    if (!file || photos.length >= 5) return;
    const reader = new FileReader();
    reader.onload = () => setPhotos(prev => [...prev, { url: reader.result, file }]);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!description.trim()) return toast.error('Please describe the issue');
    setSubmitting(true);
    try {
      const uploads = await Promise.all(photos.map(async p => {
        const base64 = p.url.split(',')[1];
        const res = await api.post('/api/uploads/dispute-photo', { imageBase64: base64, mimeType: p.file.type });
        return res.data.url;
      }));
      await api.post('/api/dispute', {
        transaction_id: txnId,
        dispute_type: type,
        description: description.trim(),
        evidence_urls: uploads,
      });
      toast.success('Dispute filed');
      navigate(`/order/${txnId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <section style={{ padding: '32px 32px 56px' }}>
      <div style={{ height: 400, borderRadius: 18, background: 'var(--surface)', animation: 'pulse 1.5s infinite' }}/>
    </section>
  );

  if (!txn) return null;

  const listing = txn.listings;
  const charCount = description.length;

  return (
    <>
      <section style={{ padding: '32px 32px 8px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/order/${txnId}`)}>
          <I.ArrowLeft size={14}/> Back to order
        </button>
      </section>

      <section style={{ padding: '16px 32px 32px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28 }}>
        {/* Left — form */}
        <div>
          <div className="eyebrow">File a dispute</div>
          <h1 className="serif" style={{ margin: '10px 0 8px', fontSize: 48, letterSpacing: '-.015em', lineHeight: 1.05 }}>
            What went wrong?
          </h1>
          <p className="muted" style={{ margin: '0 0 28px', fontSize: 15, maxWidth: 520 }}>
            Tell us what happened. Be specific — clear evidence helps us resolve disputes faster and fairly.
          </p>

          <div className="card" style={{ padding: 24, borderRadius: 18, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Dispute type */}
            <div>
              <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Dispute type</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { id: 'condition', l: 'Condition mismatch', d: 'Item arrived in worse shape than listed', icon: <I.Tag size={18}/> },
                  { id: 'rental',   l: 'Rental damage',      d: "Returned item had damage that wasn't there", icon: <I.Reload size={18}/> },
                  { id: 'swap',     l: 'Swap misrepresented', d: "Their item didn't match its listing", icon: <I.Swap size={18}/> },
                ].map(t => {
                  const on = type === t.id;
                  return (
                    <button key={t.id} onClick={() => setType(t.id)}
                      className="lift"
                      style={{
                        padding: 16, cursor: 'pointer', textAlign: 'left',
                        border: `1.5px solid ${on ? 'var(--ink)' : 'var(--border)'}`,
                        background: on ? 'var(--bg)' : 'transparent',
                        borderRadius: 14, transition: 'all .2s ease',
                        display: 'flex', flexDirection: 'column', gap: 10, minHeight: 130,
                      }}>
                      <span style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: on ? 'var(--accent)' : 'var(--surface-2)',
                        color: on ? '#fff' : 'var(--ink-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{t.l}</div>
                        <div className="small muted" style={{ fontSize: 11.5, marginTop: 4, lineHeight: 1.45 }}>{t.d}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Describe the problem</div>
              <textarea className="input" rows={5} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                placeholder="What did you receive? How does it differ from the listing? Include dates, photos, and any communication with the seller."
                value={description} onChange={e => setDescription(e.target.value)}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span className="small muted" style={{ fontSize: 11 }}>Minimum 80 characters.</span>
                <span className="small muted" style={{ fontSize: 11 }}>{charCount} / 800</span>
              </div>
            </div>

            {/* Evidence */}
            <div>
              <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Evidence photos (up to 5)</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', width: 110 }}>
                    <img src={p.url} alt="" style={{ width: 110, aspectRatio: '1/1', objectFit: 'cover', borderRadius: 12, display: 'block' }}/>
                    <button className="icon-btn" style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, background: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>
                      <I.Close size={12}/>
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button className="lift" onClick={() => fileRef.current?.click()}
                    style={{
                      width: 110, aspectRatio: '1/1', borderRadius: 12,
                      border: '1.5px dashed var(--border-2)', background: 'transparent',
                      color: 'var(--ink-mute)', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                    <I.Camera size={20}/>
                    <span className="small" style={{ fontSize: 11 }}>Add photo</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoAdd}/>
              </div>
            </div>

            {/* Warning */}
            <div style={{ display: 'flex', gap: 10, padding: 14, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', borderRadius: 12, alignItems: 'flex-start' }}>
              <I.Shield size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}/>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
                <b>False disputes affect your trust score.</b> Our team reviews every claim with both sides' evidence. Be honest and specific.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn" onClick={() => navigate(`/order/${txnId}`)}>Cancel</button>
              <button className="btn btn-primary btn-lg" disabled={submitting || charCount < 80}
                onClick={handleSubmit} style={{ opacity: charCount >= 80 ? 1 : .5 }}>
                {submitting ? 'Submitting…' : 'Submit dispute'} <I.Arrow size={16}/>
              </button>
            </div>
          </div>
        </div>

        {/* Right — order context */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 20, borderRadius: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>About this order</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {listing?.images?.[0]
                ? <img src={listing.images[0]} alt={listing.title} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}/>
                : <Photo variant="ph-soft" style={{ width: 80, height: 80, borderRadius: 12, flexShrink: 0 }}/>
              }
              <div>
                <div className="small muted">{listing?.brand}</div>
                <div className="serif" style={{ fontSize: 18, marginTop: 2, letterSpacing: '-.005em' }}>{listing?.title}</div>
                <div className="serif" style={{ fontSize: 18, marginTop: 4, color: 'var(--accent)' }}>{formatPrice(txn.amount)}</div>
              </div>
            </div>
            <hr className="divider" style={{ margin: '14px 0' }}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <DispRow l="Transaction" v={`#${txn.id?.slice(0, 8)}`} mono/>
              <DispRow l="Date" v={new Date(txn.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}/>
              <DispRow l="Status" v={txn.status?.replace(/_/g, ' ')}/>
            </div>
          </div>

          <div className="card" style={{ padding: 20, borderRadius: 16, background: 'var(--surface)' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>How disputes work</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, lineHeight: 1.55 }}>
              {[
                'We freeze the escrow payment until resolved.',
                'The seller gets 48 hours to respond with their evidence.',
                'Our team reviews both sides and decides within 72 hours.',
                'Common outcomes: full refund, partial refund, or no action.',
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <span className="mono" style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <Footer/>
    </>
  );
}
