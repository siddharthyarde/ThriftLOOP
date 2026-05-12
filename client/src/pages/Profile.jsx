import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import TrustScore from '../components/TrustScore';

const Profile = () => {
  const { profile, fetchProfile } = useAuth();
  const [form, setForm]       = useState({ name: '', locality: '', bio: '' });
  const [photos, setPhotos]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState('profile'); // 'profile' | 'photos'

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', locality: profile.locality || '', bio: profile.bio || '' });
    }
    fetchPhotos();
  }, [profile]);

  const fetchPhotos = async () => {
    try {
      const { data } = await api.get('/api/user-photos');
      setPhotos(data || []);
    } catch {
      setPhotos([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/api/auth/profile', form);
      await fetchProfile(profile.id);
      toast.success('Profile updated');
    } catch {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        await api.post('/api/user-photos', {
          imageBase64: base64,
          mimeType: file.type,
          label: 'My Photo',
        });
        await fetchPhotos();
        toast.success('Photo saved');
      } catch {
        toast.error('Photo upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await api.delete(`/api/user-photos/${photoId}`);
      setPhotos(photos.filter(p => p.id !== photoId));
      toast.success('Photo removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <img
          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name}&background=22c55e&color=fff`}
          alt={profile.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <TrustScore score={profile.trust_score} />
            {profile.verified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {['profile', 'photos'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {t === 'photos' ? 'Try-On Photos' : 'Profile'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text" value={form.locality}
              onChange={e => setForm({ ...form, locality: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              placeholder="Tell buyers about your style..."
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {tab === 'photos' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Save your photos here to use for Virtual Try-On without re-uploading every time.
          </p>

          <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition mb-6">
            <span className="text-2xl">📷</span>
            <p className="text-sm text-gray-600 mt-2">Click to upload a new photo</p>
            <p className="text-xs text-gray-400 mt-1">Front-facing, full body works best</p>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>

          <div className="grid grid-cols-3 gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100">
                <img
                  src={photo.photo_url} alt={photo.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="text-white text-xs bg-red-500 px-3 py-1 rounded-full"
                  >
                    Remove
                  </button>
                </div>
                <p className="absolute bottom-0 left-0 right-0 text-xs text-white bg-black/40 text-center py-1">
                  {photo.label}
                </p>
              </div>
            ))}
          </div>

          {photos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No photos saved yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
