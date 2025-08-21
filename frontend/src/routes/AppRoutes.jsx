import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pages
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ListingsPage from '../pages/ListingsPage';
import ListingDetailPage from '../pages/ListingDetailPage';
import BookingsPage from '../pages/BookingsPage';
import MessagesPage from '../pages/MessagesPage';
import ProfilePage from '../pages/ProfilePage';
import HostDashboardPage from '../pages/HostDashboardPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';

// Components
import ProtectedRoute from '../components/auth/ProtectedRoute';
import Loading from '../components/common/Loading';

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/listings" element={<ListingsPage />} />
      <Route path="/listing/:id" element={<ListingDetailPage />} />

      {/* Protected Routes */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      
      <Route path="/bookings" element={
        <ProtectedRoute>
          <BookingsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/messages" element={
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      } />

      {/* Host Routes */}
      <Route path="/host/*" element={
        <ProtectedRoute allowedRoles={['host', 'admin']}>
          <HostDashboardPage />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboardPage />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;