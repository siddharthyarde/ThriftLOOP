import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const FIT_OPTIONS = [
  { value: 'fits_well', label: '✅ Fits well', color: 'border-green-400 bg-green-50 text-green-700' },
  { value: 'too_big',   label: '📦 Too big',   color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'too_small', label: '🫸 Too small', color: 'border-red-400 bg-red-50 text-red-600' },
];

const TryOnModal = ({ listing, onClose }) => {
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadedBase64, setUploadedBase64] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [tryonId, setTryonId] = useState(null);
  const [fitFeedback, setFitFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select');
  const [cached, setCached] = useState(false);

  useEffect(() => {
    api.get('/api/user-photos')
      .then(r => setSavedPhotos(r.data || []))
      .catch(() => setSavedPhotos([]));
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setUploadedBase64(base64);
      setSelectedPhoto({ url: reader.result, type: 'upload' });
    };
    reader.readAsDataURL(file);
  };

  const handleTryOn = async () => {
    if (!selectedPhoto) return toast.error('Select a photo first');
    setLoading(true);
    try {
      const payload = {
        listing_id: listing.id,
        user_photo_url: selectedPhoto.type === 'saved' ? selectedPhoto.url : undefined,
        user_photo_base64: selectedPhoto.type === 'upload' ? uploadedBase64 : undefined,
      };
      const { data } = await api.post('/api/tryon', payload);
      setResultUrl(data.result_url);
      setTryonId(data.tryon_id);
      setCached(data.cached);
      setFitFeedback(data.fit_feedback);
      setStep('result');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Try-on failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (value) => {
    setFitFeedback(value);
    await api.put(`/api/tryon/${tryonId}/feedback`, { fit_feedback: value }).catch(() => {});
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `tryon-${listing.id}.jpg`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">👗 Virtual Try-On</h2>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{listing.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="p-5">
          {step === 'select' && (
            <>
              <div className="flex gap-3 mb-5">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1 text-center">Clothing</p>
                  <img src={listing.images?.[0]} alt={listing.title}
                    className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                </div>
                <div className="flex items-center text-gray-300 text-2xl">+</div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1 text-center">Your Photo</p>
                  {selectedPhoto ? (
                    <div className="relative">
                      <img src={selectedPhoto.url} alt="You"
                        className="w-full aspect-square object-cover rounded-xl border-2 border-green-400" />
                      <button
                        onClick={() => { setSelectedPhoto(null); setUploadedBase64(null); }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                      <span className="text-3xl">👤</span>
                    </div>
                  )}
                </div>
              </div>

              {savedPhotos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Saved Photos</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {savedPhotos.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPhoto({ url: p.photo_url, type: 'saved' })}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                          selectedPhoto?.url === p.photo_url ? 'border-green-500' : 'border-transparent'
                        }`}
                      >
                        <img src={p.photo_url} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-green-400 transition mb-5">
                <span className="text-xl">📷</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">Upload a new photo</p>
                  <p className="text-xs text-gray-400">Full body, front-facing works best</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>

              <button
                onClick={handleTryOn}
                disabled={!selectedPhoto || loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition"
              >
                {loading ? 'Generating (10–30s)…' : '✨ Try This On'}
              </button>
            </>
          )}

          {step === 'result' && resultUrl && (
            <>
              {cached && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs text-blue-600 mb-3 text-center">
                  ⚡ Loaded from cache
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <p className="text-xs text-gray-400 text-center mb-1">Original</p>
                  <img src={listing.images?.[0]} alt="Original" className="w-full aspect-square object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 text-center mb-1">Try-On Result</p>
                  <img src={resultUrl} alt="Try-On Result" className="w-full aspect-square object-cover rounded-xl border-2 border-green-400" />
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">How does it look?</p>
                <div className="flex gap-2">
                  {FIT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleFeedback(opt.value)}
                      className={`flex-1 text-xs font-medium py-2 px-2 rounded-xl border-2 transition ${
                        fitFeedback === opt.value ? opt.color : 'border-gray-100 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('select'); setResultUrl(null); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
                >← Try Different Photo</button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm hover:bg-green-600 font-medium"
                >⬇ Download</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TryOnModal;
