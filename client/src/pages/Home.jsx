import { Link } from 'react-router-dom';

const Home = () => (
  <div className="max-w-4xl mx-auto px-4 py-16 text-center">
    <h1 className="text-3xl font-bold text-gray-900">AI-Powered Thrift Marketplace</h1>
    <p className="text-gray-500 mt-3">
      Buy, sell, swap, and rent second-hand clothing — secured by escrow.
    </p>
    <div className="mt-8 flex justify-center gap-3">
      <Link to="/register" className="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl">
        Get started
      </Link>
      <Link to="/login" className="border border-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50">
        Sign in
      </Link>
    </div>
    <p className="text-xs text-gray-400 mt-12">
      Browse, search, and listing features arrive with the Listings module (DOC 4).
    </p>
  </div>
);

export default Home;
