import { useState } from 'react';

const CATEGORIES = ['tops', 'bottoms', 'dress', 'outerwear', 'footwear', 'accessories'];
const SIZES      = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CONDITIONS = ['A', 'B', 'C', 'D'];

const EMPTY = { q: '', category: '', size: '', condition: '', min_price: '', max_price: '', locality: '', available_for: '' };

const SearchFilters = ({ filters, onChange }) => {
  const [open, setOpen]   = useState(false);
  const [local, setLocal] = useState(filters);

  const apply = () => { onChange(local); setOpen(false); };
  const reset = () => { setLocal(EMPTY); onChange(EMPTY); };

  const activeCount = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'q').length;

  return (
    <div className="mb-6">
      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={local.q}
            onChange={e => setLocal({ ...local, q: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && onChange(local)}
            placeholder="Search clothing…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-2 rounded-xl text-sm font-medium transition ${
            activeCount > 0 ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-600'
          }`}
        >
          🎚 Filters {activeCount > 0 && <span className="bg-green-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
        </button>
      </div>

      {/* Filter panel */}
      {open && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Category</label>
            <select value={local.category} onChange={e => setLocal({ ...local, category: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Size</label>
            <select value={local.size} onChange={e => setLocal({ ...local, size: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Condition</label>
            <select value={local.condition} onChange={e => setLocal({ ...local, condition: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c} Grade</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Available For</label>
            <select value={local.available_for} onChange={e => setLocal({ ...local, available_for: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">All</option>
              <option value="buy">Buy</option>
              <option value="swap">Swap</option>
              <option value="rental">Rental</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Min Price (₹)</label>
            <input type="number" value={local.min_price}
              onChange={e => setLocal({ ...local, min_price: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Max Price (₹)</label>
            <input type="number" value={local.max_price}
              onChange={e => setLocal({ ...local, max_price: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Any" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">City</label>
            <input type="text" value={local.locality}
              onChange={e => setLocal({ ...local, locality: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Indore, Mumbai…" />
          </div>

          <div className="col-span-2 md:col-span-4 flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button type="button" onClick={reset} className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">Reset</button>
            <button type="button" onClick={apply} className="text-sm bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600">Apply Filters</button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(filters).map(([k, v]) => {
            if (!v || k === 'sort' || k === 'q') return null;
            return (
              <span key={k} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">
                {k.replace('_', ' ')}: {v}
                <button type="button" onClick={() => onChange({ ...filters, [k]: '' })} className="text-green-500 hover:text-green-700">×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
