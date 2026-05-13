import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const NOTIFICATION_ICONS = {
  wishlist_match:    '💝',
  meetup_reminder:   '📍',
  meetup_grace_start:'⏱',
  dispute_update:    '⚠️',
  offer_received:    '💬',
  offer_accepted:    '✅',
  rental_return_due: '📦',
  swap_matched:      '🔄',
  escrow_released:   '💰',
  listing_sold:      '🎉',
};

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-1.5 font-black text-gray-900 text-lg flex-shrink-0">
          <span className="text-2xl">👕</span>
          <span className="hidden sm:block">Thrift</span>
        </Link>

        <div className="flex-1 max-w-sm hidden md:block">
          <button
            onClick={() => navigate('/?q=')}
            className="w-full flex items-center gap-2 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:border-green-400 transition"
          >
            🔍 <span>Search clothing…</span>
          </button>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-1">
          {[
            { path: '/',     label: 'Browse' },
            { path: '/swap', label: '🔄 Swap' },
          ].map(({ path, label }) => (
            <Link key={path} to={path}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                isActive(path) ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {label}
            </Link>
          ))}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Link to="/create-listing"
              className="hidden sm:flex bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
              + Sell
            </Link>

            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead(); }}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm">Notifications</p>
                    <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 15).map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${!n.read ? 'bg-green-50/50' : ''}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-base flex-shrink-0 mt-0.5">{NOTIFICATION_ICONS[n.type] || '📢'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.content}</p>
                              <p className="text-[10px] text-gray-300 mt-1">
                                {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </p>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 hover:border-green-400 transition">
                <img
                  src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name}&background=22c55e&color=fff`}
                  alt={profile?.name}
                  className="w-full h-full object-cover"
                />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm truncate">{profile?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                  </div>
                  {[
                    { path: '/profile',         label: '👤 My Profile' },
                    { path: '/dashboard',       label: '📊 Dashboard' },
                    { path: '/create-listing',  label: '+ Sell Item' },
                    ...(profile?.role === 'admin' ? [{ path: '/admin', label: '🔧 Admin Panel' }] : []),
                  ].map(({ path, label }) => (
                    <Link key={path} to={path} onClick={() => setShowMenu(false)}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      {label}
                    </Link>
                  ))}
                  <button onClick={() => { signOut(); setShowMenu(false); navigate('/'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-100">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-medium text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
              Sign In
            </Link>
            <Link to="/register"
              className="text-sm font-semibold bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition">
              Join
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
