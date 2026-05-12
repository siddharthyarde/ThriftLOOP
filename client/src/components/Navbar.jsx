import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-green-600">♻ Thrift</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-gray-600 hover:text-gray-900">Browse</Link>
          {user ? (
            <>
              <Link to="/create-listing" className="text-gray-600 hover:text-gray-900">Sell</Link>
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              {profile?.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-gray-900">Admin</Link>
              )}
              <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                {profile?.name || 'Profile'}
              </Link>
              <button onClick={handleSignOut} className="text-gray-500 hover:text-gray-900">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
              <Link to="/register" className="bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
