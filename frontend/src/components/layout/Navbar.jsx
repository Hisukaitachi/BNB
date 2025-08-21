// src/components/layout/Navbar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, X, User, Settings, Calendar, MessageSquare, LogOut,
  Building2, BarChart3
} from 'lucide-react';

// Logo Component
const StayLogo = ({ size = 'normal', className = '' }) => {
  const sizes = {
    small: 'text-lg',
    normal: 'text-2xl',
    large: 'text-4xl'
  };

  return (
    <div className={`font-bold ${sizes[size]} ${className}`}>
      <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
        STAY
      </span>
    </div>
  );
};

const Navbar = () => {
  const { user, logout, isHost, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const menuItems = [
    { label: 'Discover', path: '/listings' },
    { label: 'Experiences', path: '/experiences' },
  ];

  // Add host/admin specific menu items
  if (isHost) {
    menuItems.push({ label: 'Host Dashboard', path: '/host' });
  }
  
  if (isAdmin) {
    menuItems.push({ label: 'Admin Panel', path: '/admin' });
  }

  const userMenuItems = [
    { label: 'Profile', path: '/profile', icon: Settings },
    { label: 'My Bookings', path: '/bookings', icon: Calendar },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
  ];

  if (isHost) {
    userMenuItems.splice(1, 0, { label: 'My Listings', path: '/host/listings', icon: Building2 });
    userMenuItems.splice(2, 0, { label: 'Analytics', path: '/host/analytics', icon: BarChart3 });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-md border-b border-gray-800">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div 
            className="cursor-pointer"
            onClick={() => navigate('/')}
          >
            <StayLogo />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => (
              <button 
                key={item.path}
                onClick={() => navigate(item.path)}
                className="hover:text-purple-400 transition text-gray-300"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* User Menu / Auth */}
          <div className="flex items-center space-x-4">
            {!user ? (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="hidden md:block px-4 py-2 text-gray-300 hover:text-white transition"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="btn-primary"
                >
                  Get Started
                </button>
              </>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:block">{user.name}</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2">
                    {userMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button 
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setShowUserMenu(false);
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-left hover:bg-gray-700 transition"
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                    <hr className="my-2 border-gray-700" />
                    <button 
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left hover:bg-gray-700 transition text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4">
            <div className="flex flex-col space-y-2">
              {menuItems.map((item) => (
                <button 
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsMenuOpen(false);
                  }}
                  className="text-left py-2 hover:text-purple-400 transition"
                >
                  {item.label}
                </button>
              ))}
              
              {!user && (
                <>
                  <button 
                    onClick={() => {
                      navigate('/login');
                      setIsMenuOpen(false);
                    }}
                    className="text-left py-2 hover:text-purple-400 transition"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      navigate('/register');
                      setIsMenuOpen(false);
                    }}
                    className="text-left py-2 hover:text-purple-400 transition"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;