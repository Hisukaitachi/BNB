import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import LandingPage from './pages/LandingPage';
import BanPage from './pages/BanPage';
import ClientNotifications from './pages/Notifications';
import ListingsPage from './pages/listings/ListingsPage';
import ListingDetailsPage from './pages/listings/ListingDetailsPage';
import ProfilePage from './pages/profile/ProfilePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import PublicProfilePage from './pages/profile/PublicProfilePage';


import MyBookings from './pages/booking/MyBookings';
import FavoritesPage from './pages/favorites/FavoritesPage';
import ReportsPage from './pages/reports/ReportsPage';
import MessagesPage from './pages/messaging/MessagesPage';

// Payment Pages
import PaymentPage from './pages/payment/PaymentPage';
import PaymentStatus from './pages/payment/PaymentStatus';
import PaymentHistory from './pages/payment/PaymentHistory';
import PaymentFlowTest from './pages/payment/PaymentFlowTest';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentCancelPage from './pages/payment/PaymentCancelPage';
import PaymentReceiptPage from './pages/payment/PaymentReceiptPage';

//Reservation
import MyReservationsPage from './pages/reservations/MyReservationsPage';
import ReservationPaymentPage from './pages/reservations/ReservationPaymentPage';
import ReservationSuccessPage from './pages/reservations/ReservationSuccessPage';
import ReservationCancelPage from './pages/reservations/ReservationCancelPage';

import HostDashboard from './pages/host/HostDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

import './styles/globals.css';

// Protected Route wrapper
const ProtectedRoute = ({ children, requireRole = null }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route wrapper (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <div className="App">
            <Header />
            <main className="min-h-screen">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <ClientNotifications />
                  </ProtectedRoute>
                } />
                <Route path="/banned" element={<BanPage />} />
                {/* Auth Routes */}
                <Route 
                  path="/auth/login" 
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/auth/register" 
                  element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/auth/forgot-password" 
                  element={
                    <PublicRoute>
                      <ForgotPasswordPage />
                    </PublicRoute>
                  } 
                />

                {/* Listings Routes - Public but enhanced when authenticated */}
                <Route path="/listings" element={<ListingsPage />} />
                <Route path="/listings/:id" element={<ListingDetailsPage />} />

                {/* Client Protected Routes */}
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route path="/profile/:userId" element={<PublicProfilePage />} /> 

                <Route 
                  path="/my-bookings" 
                  element={
                    <ProtectedRoute>
                      <MyBookings />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/favorites" 
                  element={
                    <ProtectedRoute>
                      <FavoritesPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/messages" 
                  element={
                    <ProtectedRoute>
                      <MessagesPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/reports" 
                  element={
                    <ProtectedRoute>
                      <ReportsPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Payment Routes */}
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/payment/status" element={<PaymentStatus />} />
                <Route path="/payment/history" element={<PaymentHistory />} />
                <Route path="/payment/test" element={
                  <ProtectedRoute requireRole="admin">
                    <PaymentFlowTest />
                  </ProtectedRoute>
                } />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/payment/cancel" element={<PaymentCancelPage />} />
                <Route path="/payment/:bookingId/receipt" element={<PaymentReceiptPage />} />
                

                {/* Reservation Routes */}
                <Route path="/my-reservations" element={<MyReservationsPage />} />
                <Route path="/reservation/:reservationId/payment" element={
                  <ProtectedRoute>
                    <ReservationPaymentPage />
                  </ProtectedRoute>
                } />
                <Route path="/reservation/success" element={<ReservationSuccessPage />} />
                <Route path="/reservation/cancel" element={<ReservationCancelPage />} />

                {/* Host Routes */}
                <Route 
                  path="/host/*" 
                  element={
                    <ProtectedRoute requireRole="host">
                      <HostDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Admin Routes */}
                <Route 
                  path="/admin/*" 
                  element={
                    <ProtectedRoute requireRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* 404 - Catch all route */}
                <Route 
                  path="*" 
                  element={<NotFoundPage />} 
                />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}


// 404 Not Found Page
const NotFoundPage = () => (
  <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-purple-400 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-4">Page Not Found</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="space-x-4">
        <button 
          onClick={() => window.history.back()}
          className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition"
        >
          Go Back
        </button>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
);

export default App;