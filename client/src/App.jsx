import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';

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
import DisputeFilePage from './pages/DisputeFilePage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  return profile?.role === 'admin' ? children : <Navigate to="/" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
};

const AppRoutes = () => (
  <>
    <Navbar />
    <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px', fontSize: '14px' } }} />
    <Routes>
      <Route path="/"               element={<Home />} />
      <Route path="/listing/:id"    element={<ListingDetail />} />
      <Route path="/storefront/:id" element={<Storefront />} />
      <Route path="/login"          element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register"       element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

      <Route path="/create-listing" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
      <Route path="/profile"        element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/swap"           element={<PrivateRoute><SwapEngine /></PrivateRoute>} />
      <Route path="/rental/:id"     element={<PrivateRoute><RentalPage /></PrivateRoute>} />
      <Route path="/chat/:id"       element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/order/:id"      element={<PrivateRoute><OrderTracking /></PrivateRoute>} />
      <Route path="/style-quiz"     element={<PrivateRoute><StyleQuiz /></PrivateRoute>} />
      <Route path="/dashboard"      element={<PrivateRoute><SellerDashboard /></PrivateRoute>} />
      <Route path="/dispute/:txnId" element={<PrivateRoute><DisputeFilePage /></PrivateRoute>} />

      <Route path="/admin"          element={<AdminRoute><AdminPanel /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);

const App = () => (
  <AuthProvider>
    <NotificationProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </NotificationProvider>
  </AuthProvider>
);

export default App;
