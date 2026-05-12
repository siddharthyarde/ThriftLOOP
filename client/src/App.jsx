import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import Profile from './pages/Profile';
import Storefront from './pages/Storefront';
import SwapEngine from './pages/SwapEngine';
import RentalPage from './pages/RentalPage';
import ChatPage from './pages/ChatPage';
import OrderTracking from './pages/OrderTracking';
import AdminPanel from './pages/AdminPanel';
import StyleQuiz from './pages/StyleQuiz';
import SellerDashboard from './pages/SellerDashboard';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { profile } = useAuth();
  return profile?.role === 'admin' ? children : <Navigate to="/" />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Navbar />
      <Toaster position="top-right" />
      <Routes>
        {/* Public */}
        <Route path="/"               element={<Home />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/listing/:id"    element={<ListingDetail />} />
        <Route path="/storefront/:id" element={<Storefront />} />

        {/* Protected */}
        <Route path="/create-listing" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
        <Route path="/profile"        element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/swap"           element={<PrivateRoute><SwapEngine /></PrivateRoute>} />
        <Route path="/rental/:id"     element={<PrivateRoute><RentalPage /></PrivateRoute>} />
        <Route path="/chat/:id"       element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/order/:id"      element={<PrivateRoute><OrderTracking /></PrivateRoute>} />
        <Route path="/style-quiz"     element={<PrivateRoute><StyleQuiz /></PrivateRoute>} />
        <Route path="/dashboard"      element={<PrivateRoute><SellerDashboard /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin"          element={<AdminRoute><AdminPanel /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
