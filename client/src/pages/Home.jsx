import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import ListingCard from '../components/ListingCard';
import SearchFilters from '../components/SearchFilters';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings]   = useState([]);
  const [trending, setTrending]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const filters = {
    q:             searchParams.get('q')             || '',
    category:      searchParams.get('category')      || '',
    size:          searchParams.get('size')          || '',
    condition:     searchParams.get('condition')     || '',
    min_price:     searchParams.get('min_price')     || '',
    max_price:     searchParams.get('max_price')     || '',
    locality:      searchParams.get('locality')      || '',
    available_for: searchParams.get('available_for') || '',
    sort:          searchParams.get('sort')          || 'created_at',
  };

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ ...filters, page, limit: 20 });
        const { data } = await api.get(`/api/listings?${params}`);
        setListings(data.listings || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      } catch {
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [searchParams, page]); // eslint-disable-line

  useEffect(() => {
    api.get('/api/listings/trending?limit=6')
      .then(r => setTrending(r.data || []))
      .catch(() => {});

    const ids = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
    if (ids.length > 0) {
      Promise.all(ids.slice(0, 4).map(id =>
        api.get(`/api/listings/${id}`).then(r => r.data).catch(() => null)
      )).then(results => setRecentlyViewed(results.filter(Boolean)));
    }
  }, []);

  const handleFilterChange = (newFilters) => {
    const params = new URLSearchParams(
      Object.entries(newFilters).filter(([, v]) => v)
    );
    setSearchParams(params);
    setPage(1);
  };

  const isFiltered = Object.values(filters).some(v => v);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {!isFiltered && (
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Discover Pre-Loved Fashion</h1>
          <p className="text-gray-500 text-lg">Buy, swap, rent — sustainably.</p>
        </div>
      )}

      <SearchFilters filters={filters} onChange={handleFilterChange} />

      {!isFiltered && trending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔥 Trending This Week</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {trending.map(l => <ListingCard key={l.id} listing={l} compact />)}
          </div>
        </div>
      )}

      {!isFiltered && recentlyViewed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">👁 Recently Viewed</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentlyViewed.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {isFiltered ? `${total} results` : 'All Listings'}
        </h2>
        <select
          value={filters.sort}
          onChange={e => handleFilterChange({ ...filters, sort: e.target.value })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="created_at">Newest First</option>
          <option value="price">Price: Low to High</option>
          <option value="views">Most Viewed</option>
          <option value="saves">Most Saved</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧥</p>
          <p className="font-medium">No listings found</p>
          <p className="text-sm mt-1">Try different filters or check back later</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-full text-sm font-medium ${
                    page === i + 1 ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
