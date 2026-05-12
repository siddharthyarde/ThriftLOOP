const GUIDELINES = [
  { icon: '👕', title: 'Front View',      desc: 'Lay flat or hang. Full item visible, good lighting.' },
  { icon: '👕', title: 'Back View',       desc: 'Same as front. Show full back of the item.' },
  { icon: '🔍', title: 'Defect Close-up', desc: 'Any stains, pilling, tears, or wear marks. Be honest!' },
  { icon: '💡', title: 'Lighting',        desc: 'Use natural daylight. Avoid flash, harsh shadows.' },
  { icon: '📐', title: 'Background',      desc: 'Clean surface or wall. Avoid busy backgrounds.' },
];

const PhotoGuidelines = ({ onClose }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-amber-800">📸 Photo Guidelines</h3>
      {onClose && (
        <button type="button" onClick={onClose} className="text-amber-500 text-sm">✕</button>
      )}
    </div>
    <div className="space-y-2">
      {GUIDELINES.map((g, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-sm">{g.icon}</span>
          <div>
            <span className="text-xs font-medium text-amber-800">{g.title}: </span>
            <span className="text-xs text-amber-700">{g.desc}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default PhotoGuidelines;
