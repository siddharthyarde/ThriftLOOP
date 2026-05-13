import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import SwapCard from '../components/SwapCard';

const TABS = ['browse', 'propose', 'my-swaps'];

const SwapEngine = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const targetListingId = searchParams.get('target');
  const [tab, setTab] = useState(targetListingId ? 'propose' : 'browse');

  const [browseable, setBrowseable] = useState([]);
  const [mySwaps, setMySwaps] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [targetListing, setTargetListing] = useState(null);
  const [selectedMine, setSelectedMine] = useState(null);
  const [swapSummary, setSwapSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);

  const fetchBrowseable = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/swap/opportunities');
      setBrowseable(data || []);
    } catch { setBrowseable([]); }
    setLoading(false);
  }, []);

  const fetchMySwaps = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/swap/me');
      setMySwaps(data || []);
    } catch { setMySwaps([]); }
    setLoading(false);
  }, []);

  const fetchProposeData = useCallback(async () => {
    setLoading(true);
    try {
      const params = targetListingId ? `?target_listing_id=${targetListingId}` : '';
      const { data } = await api.get(`/api/swap/opportunities${params}`);
      if (data.target) setTargetListing(data.target);
      if (data.my_listings) setMyListings(data.my_listings);
    } catch {
      toast.error('Could not load swap data');
    } finally {
      setLoading(false);
    }
  }, [targetListingId]);

  useEffect(() => {
    if (tab === 'browse') fetchBrowseable();
    if (tab === 'my-swaps') fetchMySwaps();
    if (tab === 'propose') fetchProposeData();
  }, [tab, fetchBrowseable, fetchMySwaps, fetchProposeData]);

  const calculateGap = () => {
    if (!selectedMine || !targetListing) return null;
    const gap = Math.abs(selectedMine.price - targetListing.price);
    const iPayGap = selectedMine.price < targetListing.price;
    const myDeposit = parseFloat((selectedMine.price * 0.15).toFixed(2));
    const theirDeposit = parseFloat((targetListing.price * 0.15).toFixed(2));
    return {
      gap,
      i_pay_gap: iPayGap,
      my_deposit: myDeposit,
      their_deposit: theirDeposit,
      total_i_pay: iPayGap ? gap + myDeposit : myDeposit,
    };
  };

  const handlePropose = async () => {
    if (!selectedMine || !targetListing) return toast.error('Select your item first');
    setProposing(true);
    try {
      const { data } = await api.post('/api/swap', {
        listing_id_a: selectedMine.id,
        listing_id_b: targetListing.id,
      });
      setSwapSummary(data.summary);
      toast.success('Swap proposed!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Proposal failed');
    } finally {
      setProposing(false);
    }
  };

  const gap = calculateGap();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Smart Swap Engine</h1>
      <p className="text-gray-500 text-sm mb-6">Exchange items fairly — gaps balanced automatically.</p>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}>
            {t === 'my-swaps' ? 'My Swaps' : t === 'propose' ? 'Propose' : 'Browse'}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {browseable.map(l => (
              <div key={l.id} className="relative">
                <ListingCard listing={l} />
                <button
                  onClick={() => navigate(`/swap?target=${l.id}`)}
                  className="absolute bottom-14 left-2 right-2 bg-blue-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-600 text-center"
                >🔄 Propose Swap</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'propose' && !swapSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">They Offer</h2>
            {targetListing ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <img src={targetListing.images?.[0]} alt={targetListing.title}
                  className="w-full aspect-square object-cover rounded-xl mb-3" />
                <p className="font-semibold text-gray-900">{targetListing.title}</p>
                <p className="text-green-600 font-bold text-lg">₹{targetListing.price?.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Size {targetListing.size} · Grade {targetListing.condition} · {targetListing.category}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                <p>No target listing selected</p>
                <button onClick={() => setTab('browse')} className="mt-2 text-sm text-green-600 underline">
                  Browse items to swap
                </button>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">You Offer</h2>
            {myListings.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                <p className="mb-2">No swap-eligible listings</p>
                <Link to="/create-listing" className="text-sm text-green-600 underline">
                  Create a listing and mark it available for swap
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myListings.map(l => (
                  <button key={l.id}
                    onClick={() => setSelectedMine(selectedMine?.id === l.id ? null : l)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition text-left ${
                      selectedMine?.id === l.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <img src={l.images?.[0]} alt={l.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{l.title}</p>
                      <p className="text-green-600 font-semibold">₹{l.price?.toLocaleString()}</p>
                    </div>
                    {selectedMine?.id === l.id && <span className="text-blue-500 text-xl">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'propose' && !swapSummary && gap && selectedMine && targetListing && (
        <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">💰 Swap Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Your item value</span>
              <span className="font-medium">₹{selectedMine.price?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Their item value</span>
              <span className="font-medium">₹{targetListing.price?.toLocaleString()}</span>
            </div>
            {gap.gap > 0 && (
              <div className={`flex justify-between pt-2 border-t border-gray-100 ${gap.i_pay_gap ? 'text-orange-600' : 'text-green-600'}`}>
                <span>{gap.i_pay_gap ? 'You pay gap' : 'They pay gap'}</span>
                <span className="font-semibold">₹{gap.gap?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Your safety deposit (15%)</span>
              <span className="font-medium">₹{gap.my_deposit?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold text-base">
              <span>Total you pay now</span>
              <span className="text-green-600">₹{gap.total_i_pay?.toLocaleString()}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Safety deposit is returned after successful swap. Gap covers the value difference.
          </p>
          <button onClick={handlePropose} disabled={proposing}
            className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {proposing ? 'Proposing…' : '🔄 Propose Swap'}
          </button>
        </div>
      )}

      {swapSummary && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mt-6">
          <p className="text-4xl mb-3">🎉</p>
          <h3 className="font-bold text-green-800 text-lg mb-1">Swap Proposed!</h3>
          <p className="text-green-700 text-sm mb-4">
            Waiting for <strong>{targetListing?.users?.name || 'the other party'}</strong> to confirm.
          </p>
          <button onClick={() => { setSwapSummary(null); setTab('my-swaps'); }}
            className="text-sm text-green-600 underline">View My Swaps →</button>
        </div>
      )}

      {tab === 'my-swaps' && (
        loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : mySwaps.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-3">🔄</p>
            <p>No swaps yet.</p>
            <button onClick={() => setTab('browse')} className="mt-2 text-sm text-blue-500 underline">
              Browse items to swap
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mySwaps.map(swap => (
              <SwapCard key={swap.id} swap={swap} currentUserId={user?.id} onUpdate={fetchMySwaps} />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default SwapEngine;
