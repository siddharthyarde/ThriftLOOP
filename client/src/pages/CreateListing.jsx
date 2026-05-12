import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import PhotoGuidelines from '../components/PhotoGuidelines';

const CATEGORIES = ['tops', 'bottoms', 'dress', 'outerwear', 'footwear', 'accessories'];
const SIZES      = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'Custom'];
const CONDITIONS = [
  { value: 'A', label: 'A – Like New',    desc: 'No visible wear, barely used' },
  { value: 'B', label: 'B – Gently Used', desc: 'Minor signs of wear, great condition' },
  { value: 'C', label: 'C – Good',        desc: 'Noticeable wear, fully functional' },
  { value: 'D', label: 'D – Fair',        desc: 'Heavy wear, priced accordingly' },
];
const PHOTO_LABELS = ['Front View', 'Back View', 'Defect / Detail Close-up'];

const CreateListing = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', category: '', size: '', condition: '',
    price: '', available_for: ['buy'], locality: '',
    rental_price_per_day: '', rental_deposit: '',
  });

  const [images, setImages]         = useState([]); // [{file, preview, url, uploading}]
  const [submitting, setSubmitting] = useState(false);
  const [showGuide, setShowGuide]   = useState(false);
  const [priceSuggestion]           = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleAvailFor = (mode) => {
    setForm(prev => ({
      ...prev,
      available_for: prev.available_for.includes(mode)
        ? prev.available_for.filter(m => m !== mode)
        : [...prev.available_for, mode],
    }));
  };

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
        const { data } = await api.post('/api/uploads/listing-image', {
          imageBase64: base64,
          mimeType: file.type,
          index,
        });
        setImages(prev => {
          const next = [...prev];
          next[index] = { file, preview, url: data.url, uploading: false };
          return next;
        });
        toast.success(`Photo ${index + 1} uploaded`);
      } catch {
        toast.error(`Photo ${index + 1} upload failed`);
        setImages(prev => {
          const next = [...prev];
          next[index] = null;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (index) => {
    setImages(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const uploadedUrls = images.filter(i => i?.url).map(i => i.url);
  const canSubmit = uploadedUrls.length >= 3 && form.title && form.category && form.size && form.condition && form.price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploadedUrls.length < 3) {
      return toast.error('Please upload all 3 required photos');
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        images: uploadedUrls,
        rental_price_per_day: form.available_for.includes('rental') ? parseFloat(form.rental_price_per_day) : undefined,
        rental_deposit:       form.available_for.includes('rental') ? parseFloat(form.rental_deposit) : undefined,
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">List an Item</h1>
      <p className="text-gray-500 text-sm mb-8">Share your pre-loved clothing with the community</p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-800">Photos <span className="text-red-400">*</span></h2>
            <button type="button" onClick={() => setShowGuide(!showGuide)} className="text-xs text-green-600 underline">
              Photo guidelines
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Upload at least 3 photos: front view, back view, and defect close-up.</p>

          {showGuide && <PhotoGuidelines onClose={() => setShowGuide(false)} />}

          <div className="grid grid-cols-3 gap-3">
            {PHOTO_LABELS.map((label, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-green-400 transition">
                  {images[idx]?.preview ? (
                    <>
                      <img src={images[idx].preview} alt={label} className="w-full h-full object-cover" />
                      {images[idx].uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs">Uploading…</span>
                        </div>
                      )}
                      {!images[idx].uploading && (
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                        >×</button>
                      )}
                      {images[idx].url && (
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-[10px] text-center py-0.5">✓</div>
                      )}
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-2">
                      <span className="text-2xl text-gray-300">📷</span>
                      <span className="text-[10px] text-gray-400 text-center mt-1">{label}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e, idx)} />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-center text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {images.filter(Boolean).length >= 3 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">Add more photos (optional, up to 8 total)</p>
              <label className="inline-flex items-center gap-1 text-xs text-green-600 cursor-pointer border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50">
                + Add Photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e, images.length)} />
              </label>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-400">*</span></label>
            <input
              type="text" name="title" value={form.title} onChange={handleChange}
              placeholder="e.g. Vintage Denim Jacket — Blue, Size M"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              rows={3} placeholder="Brand, fabric, measurements, reason for selling…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-400">*</span></label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400" required>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size <span className="text-red-400">*</span></label>
              <select name="size" value={form.size} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400" required>
                <option value="">Select size</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition <span className="text-red-400">*</span></label>
            <div className="space-y-2">
              {CONDITIONS.map(c => (
                <label
                  key={c.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    form.condition === c.value ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio" name="condition" value={c.value}
                    checked={form.condition === c.value}
                    onChange={handleChange}
                    className="mt-0.5 accent-green-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.label}</p>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City / Locality</label>
            <input
              type="text" name="locality" value={form.locality} onChange={handleChange}
              placeholder="e.g. Indore, Mumbai, Bangalore"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Pricing</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹) <span className="text-red-400">*</span></label>
            <input
              type="number" name="price" value={form.price} onChange={handleChange}
              placeholder="0" min="1"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
            {priceSuggestion && (
              <p className="text-xs text-green-600 mt-1">
                💡 Suggested: ₹{priceSuggestion.min}–₹{priceSuggestion.max} (avg ₹{priceSuggestion.avg})
                based on {priceSuggestion.sample_size} similar sales
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available For</label>
            <div className="flex gap-2 flex-wrap">
              {['buy', 'swap', 'rental'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleAvailFor(mode)}
                  className={`px-4 py-1.5 rounded-full text-sm border-2 font-medium transition capitalize ${
                    form.available_for.includes(mode)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {mode === 'buy' ? '🛍️ Buy' : mode === 'swap' ? '🔄 Swap' : '📦 Rental'}
                </button>
              ))}
            </div>
          </div>

          {form.available_for.includes('rental') && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rent / Day (₹) <span className="text-red-400">*</span></label>
                <input
                  type="number" name="rental_price_per_day"
                  value={form.rental_price_per_day} onChange={handleChange}
                  placeholder="0" min="1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (₹) <span className="text-red-400">*</span></label>
                <input
                  type="number" name="rental_deposit"
                  value={form.rental_deposit} onChange={handleChange}
                  placeholder="0" min="1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
        >
          {submitting ? 'Creating listing…' : 'Publish Listing'}
        </button>

        {!canSubmit && (
          <p className="text-xs text-center text-gray-400">
            {uploadedUrls.length < 3
              ? `Upload ${3 - uploadedUrls.length} more photo(s) to continue`
              : 'Fill in all required fields'}
          </p>
        )}
      </form>
    </div>
  );
};

export default CreateListing;
