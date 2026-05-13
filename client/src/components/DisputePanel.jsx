import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const DISPUTE_TYPES = [
  { value: 'condition_mismatch',     label: '📦 Condition Mismatch',      desc: "Item condition doesn't match listing" },
  { value: 'rental_damage',          label: '💥 Rental Damage',           desc: 'Item was damaged during rental' },
  { value: 'swap_misrepresentation', label: '🔄 Swap Misrepresentation',  desc: 'Swapped item is not as described' },
];

const DisputePanel = ({ transaction, onClose }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: '', description: '' });
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">⚠️ File a Dispute</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">What's the issue?</p>
            <div className="space-y-2">
              {DISPUTE_TYPES.map(t => (
                <label key={t.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    form.type === t.value ? 'border-red-400 bg-red-50' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <input type="radio" name="type" value={t.value}
                    checked={form.type === t.value}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="mt-0.5 accent-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Describe the issue</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Be as specific as possible. What did you receive vs. what was listed?"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Upload Evidence Photos</p>
            <p className="text-xs text-gray-400 mb-2">Clear photos of the issue. Max 5 photos.</p>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-red-300 transition">
              <span>📸</span>
              <span className="text-sm text-gray-500">{uploading ? 'Uploading…' : 'Upload photos'}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleEvidenceUpload} />
            </label>
            {evidence.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {evidence.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt={`Evidence ${i + 1}`} className="w-16 h-16 object-cover rounded-lg" />
                    <button
                      onClick={() => setEvidence(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              ⚠️ Filing a false dispute may affect your trust score. Admin reviews all evidence before making a decision.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.type || !form.description || submitting}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition"
          >
            {submitting ? 'Filing…' : 'File Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisputePanel;
