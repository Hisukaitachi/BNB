// src/App.jsx - Updated with Toast and fixes
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Toast from './components/common/Toast';

// Import pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import ProfilePage from './pages/ProfilePage';
import BookingsPage from './pages/BookingsPage';
import MessagesPage from './pages/MessagesPage';
import HostDashboardPage from './pages/HostDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

const App = () => {
  return (
    <AppProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/listings" element={<ListingsPage />} />
              <Route path="/listing/:id" element={<ListingDetailPage />} />
              <Route path="/verify-email" element={<EmailVerificationPage />} />
              
              {/* Protected Routes */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/bookings" 
                element={
                  <ProtectedRoute>
                    <BookingsPage />
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

              {/* Host Routes */}
              <Route 
                path="/host/*" 
                element={
                  <ProtectedRoute requiredRole="host">
                    <HostDashboardPage />
                  </ProtectedRoute>
                } 
              />

              {/* Admin Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                } 
              />

              {/* Experiences placeholder */}
              <Route 
                path="/experiences" 
                element={
                  <div className="min-h-screen pt-20 flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-3xl font-bold mb-4">Experiences</h1>
                      <p className="text-gray-400">Coming Soon</p>
                    </div>
                  </div>
                } 
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {/* Toast Component */}
            <Toast />
          </div>
        </Router>
      </AuthProvider>
    </AppProvider>
  );
};

export default App;