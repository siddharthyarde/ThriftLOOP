import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

const QUESTIONS = [
  {
    id: 'categories',
    question: 'What do you shop for most?',
    multi: true,
    options: [
      { label: 'Tops & Shirts',  value: 'tops',        emoji: '👕' },
      { label: 'Bottoms',        value: 'bottoms',      emoji: '👖' },
      { label: 'Dresses',        value: 'dress',        emoji: '👗' },
      { label: 'Outerwear',      value: 'outerwear',    emoji: '🧥' },
      { label: 'Footwear',       value: 'footwear',     emoji: '👟' },
      { label: 'Accessories',    value: 'accessories',  emoji: '👜' },
    ],
  },
  {
    id: 'sizes',
    question: 'Your usual sizes?',
    multi: true,
    options: ['XS','S','M','L','XL','XXL'].map(s => ({ label: s, value: s, emoji: '' })),
  },
  {
    id: 'styles',
    question: 'Your vibe?',
    multi: true,
    options: [
      { label: 'Casual',      value: 'casual',     emoji: '😊' },
      { label: 'Ethnic',      value: 'ethnic',     emoji: '🌸' },
      { label: 'Western',     value: 'western',    emoji: '🤠' },
      { label: 'Formal',      value: 'formal',     emoji: '💼' },
      { label: 'Streetwear',  value: 'streetwear', emoji: '🏙️' },
      { label: 'Vintage',     value: 'vintage',    emoji: '🕰️' },
    ],
  },
];

const StyleQuiz = () => {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useAuth();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({ categories: [], sizes: [], styles: [] });
  const [saving, setSaving]   = useState(false);

  const current = QUESTIONS[step];

  const toggle = (value) => {
    const key = current.id;
    setAnswers(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const next = async () => {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setSaving(true);
      try {
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

  const selected = answers[current.id];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex gap-1 mb-6">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-green-500' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">{current.question}</h2>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {current.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                selected.includes(opt.value)
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-100 text-gray-700 hover:border-gray-200'
              }`}
            >
              {opt.emoji && <span>{opt.emoji}</span>}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            onClick={next}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : step < QUESTIONS.length - 1 ? 'Next →' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StyleQuiz;
