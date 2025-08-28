// src/components/layout/Header.jsx
import React from 'react'
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Settings, Heart, MessageSquare, Building2, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitchRole = async () => {
    try {
      const newRole = user.role === 'client' ? 'host' : 'client';
      await switchRole(newRole);
      setIsProfileMenuOpen(false);
      // Redirect based on new role
      if (newRole === 'host') {
        navigate('/host/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Build user menu items dynamically based on role
  const getUserMenuItems = () => {
    const baseItems = [
      { label: 'Profile', path: '/profile', icon: User },
      { label: 'Favorites', path: '/favorites', icon: Heart },
      { label: 'Messages', path: '/messages', icon: MessageSquare },
    ];

    if (user?.role === 'host') {
      baseItems.splice(1, 0, 
        { label: 'My Listings', path: '/host/listings', icon: Building2 },
        { label: 'Analytics', path: '/host/analytics', icon: BarChart3 }
      );
    }

    return baseItems;
  };

  return (
    <header className="bg-gray-900 shadow-xl border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-50 lg:px-10">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              STAY
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-gray-300 hover:text-purple-400 transition ${
                isActive('/') ? 'text-purple-400 font-medium' : ''
              }`}
            >
              Discover
            </Link>
            <Link
              to="/listings"
              className={`text-gray-300 hover:text-purple-400 transition ${
                isActive('/listings') ? 'text-purple-400 font-medium' : ''
              }`}
            >
              Experiences
            </Link>
            {isAuthenticated && user?.role === 'host' && (
              <Link
                to="/host/dashboard"
                className={`text-gray-300 hover:text-purple-400 transition ${
                  location.pathname.startsWith('/host') ? 'text-purple-400 font-medium' : ''
                }`}
              >
                Host Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className={`text-gray-300 hover:text-purple-400 transition ${
                  location.pathname.startsWith('/admin') ? 'text-purple-400 font-medium' : ''
                }`}
              >
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-800 transition"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 hidden sm:block">
                    {user?.name}
                  </span>
                  <span className="text-xs text-purple-400 px-2 py-1 bg-gray-800 rounded-full">
                    {user?.role}
                  </span>
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
                    {getUserMenuItems().map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 transition"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}

                    <div className="border-t border-gray-700 my-2"></div>

                    {user?.role !== 'admin' && (
                      <button
                        onClick={handleSwitchRole}
                        className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 w-full text-left transition"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Switch to {user?.role === 'client' ? 'Host' : 'Client'}</span>
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-red-900/20 w-full text-left transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/auth/login">
                  <Button variant="ghost" className="text-gray-100 hover:text-white hover:bg-gray-800">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button variant="gradient">Get Started</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-300"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4">
            <nav className="space-y-2">
              <Link
                to="/"
                className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Discover
              </Link>
              <Link
                to="/listings"
                className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Experiences
              </Link>
              {isAuthenticated && user?.role === 'host' && (
                <Link
                  to="/host/dashboard"
                  className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Host Dashboard
                </Link>
              )}
              {isAuthenticated && user?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              )}
              
              {!isAuthenticated && (
                <div className="pt-2 border-t border-gray-800 mt-2 space-y-2">
                  <Link
                    to="/auth/login"
                    className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/register"
                    className="block px-4 py-2 text-purple-400 hover:bg-gray-800 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;