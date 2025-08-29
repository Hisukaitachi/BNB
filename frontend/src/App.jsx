import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import ListingsPage from './pages/listings/ListingsPage';
import ListingDetailsPage from './pages/listings/ListingDetailsPage';
import ProfilePage from './pages/profile/ProfilePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

import MyBookings from './pages/booking/MyBookings';
import FavoritesPage from './pages/favorites/FavoritesPage';
import ReportsPage from './pages/reports/ReportsPage';
import MessagesPage from './pages/messaging/MessagesPage';

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
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              
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

              {/* Listings Routes */}
              <Route 
                path="/listings" 
                element={
                  
                    <ListingsPage />
                 
                } 
              />
              <Route 
                path="/listings/:id" 
                element={
                  
                    <ListingDetailsPage />
                  
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

              {/* Host Routes */}
              <Route 
                path="/host/*" 
                element={
                  <ProtectedRoute requireRole="host">
                    <div className="container mx-auto px-6 py-8">
                      <h1 className="text-2xl font-bold">Host Dashboard - Coming Soon</h1>
                      <p>Host management interface</p>
                    </div>
                  </ProtectedRoute>
                } 
              />

              {/* Admin Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requireRole="admin">
                    <div className="container mx-auto px-6 py-8">
                      <h1 className="text-2xl font-bold">Admin Dashboard - Coming Soon</h1>
                      <p>Admin management interface</p>
                    </div>
                  </ProtectedRoute>
                } 
              />

              {/* Catch all route */}
              <Route 
                path="*" 
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                      <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
                      <button 
                        onClick={() => window.history.back()}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;