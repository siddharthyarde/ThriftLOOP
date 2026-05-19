import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const DISPUTE_TYPES = [
  { value: 'condition_mismatch',     label: 'Condition Mismatch',      desc: "Item received in worse condition than listed" },
  { value: 'rental_damage',          label: 'Rental Damage',           desc: 'Returned item had damage not present at rental start' },
  { value: 'swap_misrepresentation', label: 'Swap Misrepresentation',  desc: 'Swapped item didn\'t match description or photos' },
];

const DisputePanel = ({ transaction, onClose }) => {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ type: '', description: '' });
  const [evidence, setEvidence] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEvidenceUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const urls = [];
    for (const file of files.slice(0, 5)) {
      const reader = new FileReader();
      await new Promise(resolve => {
        reader.onload = async () => {
          try {
            const base64 = reader.result.split(',')[1];
            const { data } = await api.post('/api/uploads/listing-image', {
              imageBase64: base64,
              mimeType: file.type,
              index: urls.length,
            });
            urls.push(data.url);
          } catch {}
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    setEvidence(prev => [...prev, ...urls]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.type || !form.description) return toast.error('Fill all fields');
    setSubmitting(true);
    try {
      await api.post('/api/dispute', {
        transaction_id: transaction.id,
        type: form.type,
        description: form.description,
        evidence_photos: evidence,
      });
      toast.success('Dispute filed. Admin will review within 24–48 hours.');
      onClose?.();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>File a Dispute</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Describe the issue and upload evidence.</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Dispute type selection */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 10 }}>DISPUTE TYPE</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DISPUTE_TYPES.map(t => (
                <label
                  key={t.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: `1.5px solid ${form.type === t.value ? 'var(--danger)' : 'var(--border)'}`,
                    background: form.type === t.value ? '#FFF1F2' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={form.type === t.value}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${form.type === t.value ? 'var(--danger)' : 'var(--border)'}`,
                      background: form.type === t.value ? 'var(--danger)' : 'transparent',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{t.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="field">
            <label className="field-label">Describe the problem</label>
            <textarea
              className="input"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={5}
              placeholder="What went wrong? Be specific — photos sold vs received, damage details, etc."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Evidence upload */}
          <div>
            <p className="field-label" style={{ marginBottom: 8 }}>Upload photos (max 5)</p>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              border: '1.5px dashed var(--border)',
              borderRadius: 10,
              padding: '16px 24px',
              cursor: 'pointer',
              transition: 'border-color .15s',
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: 20 }}>📸</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{uploading ? 'Uploading…' : '+ Add photos'}</span>
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleEvidenceUpload} />
            </label>

            {evidence.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {evidence.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt={`Evidence ${i + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                    />
                    <button
                      onClick={() => setEvidence(prev => prev.filter((_, idx) => idx !== i))}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'var(--danger)', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div style={{ background: '#FFF7ED', borderLeft: '4px solid #F59E0B', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
              ⚠️ False disputes may affect your trust score. Admin reviews all evidence before making a decision.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!form.type || !form.description || submitting}
              className="btn"
              style={{ background: 'var(--danger)', color: '#fff', height: 48, padding: '0 24px', border: 'none', opacity: (!form.type || !form.description || submitting) ? 0.4 : 1 }}
            >
              {submitting ? 'Filing…' : 'Submit Dispute'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DisputePanel;
