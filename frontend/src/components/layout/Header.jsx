// src/components/layout/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Settings, 
  Heart, 
  MessageSquare, 
  Building2, 
  BarChart3,
  Bell,
  Calendar,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import ClientNotificationBell from '../client/ClientNotificationBell';
import Button from '../ui/Button';

const Header = () => {
  // Menu states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  
  // Notification states (for hosts)
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  
  const { user, isAuthenticated, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.role === 'host') {
      fetchNotifications();
      
      // Set up periodic refresh for notifications (every 30 seconds)
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.role]);

  const fetchNotifications = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setIsLoadingNotifications(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const data = await notificationService.getNotifications({ page, unreadOnly: false });
      
      const formattedNotifications = data.notifications?.map(notif => 
        notificationService.formatNotification(notif)
      ) || [];
      
      if (append && page > 1) {
        setNotifications(prev => [...prev, ...formattedNotifications]);
      } else {
        setNotifications(formattedNotifications);
      }
      
      setUnreadCount(data.statistics?.unread_count || 0);
      setCurrentPage(page);
      
      const currentPageNum = data.pagination?.current_page || page;
      const totalPages = data.pagination?.total_pages || 1;
      setHasMoreNotifications(currentPageNum < totalPages);
      
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      if (page === 1) {
        setNotifications([]);
        setUnreadCount(0);
      }
      setHasMoreNotifications(false);
    } finally {
      setIsLoadingNotifications(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreNotifications && user?.role === 'host') {
      fetchNotifications(currentPage + 1, true);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (notification.isUnread) {
        await notificationService.markAsRead(notification.id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, isUnread: false } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      let targetPath = '/notifications';
      
      switch (notification.type) {
        case 'booking_request':
        case 'booking_approved':
        case 'booking_declined':
        case 'booking_cancelled':
          targetPath = '/host/bookings';
          break;
        case 'message_received':
          targetPath = '/messages';
          break;
        case 'payment_success':
        case 'payment_failed':
          targetPath = '/host/earnings';
          break;
        case 'review_received':
          targetPath = '/host/listings';
          break;
        default:
          targetPath = '/host/notifications';
      }

      setIsNotificationMenuOpen(false);
      navigate(targetPath);
    } catch (error) {
      console.error('Failed to handle notification click:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleSwitchRole = async () => {
    try {
      const newRole = user.role === 'client' ? 'host' : 'client';
      await switchRole(newRole);
      setIsProfileMenuOpen(false);
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

    if (user?.role === 'client') {
      baseItems.splice(1, 0, 
        { label: 'My Bookings', path: '/my-bookings', icon: Calendar }
      );
    }

    return baseItems;
  };

  // Render notification component based on user role
  const renderNotificationComponent = () => {
    if (user?.role === 'client') {
      // Use the simple ClientNotificationBell component
      return <ClientNotificationBell />;
    }

    // Full notification dropdown for hosts
    return (
      <div className="relative">
        <button
          onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
          className="relative p-2 rounded-full hover:bg-gray-800 text-gray-300 transition"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {unreadCount > 0 && (
            <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping"></div>
          )}
        </button>

        {/* Host Notifications Dropdown */}
        {isNotificationMenuOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-200">Host Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoadingNotifications ? (
                <div className="px-4 py-6 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mx-auto"></div>
                  <p className="mt-2 text-sm">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <>
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition ${
                        notification.isUnread ? 'bg-gray-750 border-l-2 border-purple-400' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-lg">{notification.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${
                            notification.isUnread ? 'text-white font-medium' : 'text-gray-300'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.timeAgo}
                          </p>
                        </div>
                        {notification.isUnread && (
                          <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </button>
                  ))}
                  
                  {hasMoreNotifications && (
                    <div className="px-4 py-3 border-t border-gray-700">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="w-full text-sm text-purple-400 hover:text-purple-300 disabled:text-gray-500 flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-700 transition"
                      >
                        {isLoadingMore ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                            <span>Loading...</span>
                          </>
                        ) : (
                          <span>Load more notifications</span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
              <>
                {/* Role-based Notifications */}
                {renderNotificationComponent()}

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-800 transition"
                  >
                    {/* Profile Picture or Avatar */}
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user?.name || 'Profile'}
                        className="w-8 h-8 rounded-full object-cover border-2 border-purple-400"
                        onError={(e) => {
                          // Fallback to gradient avatar if image fails to load
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    {/* Gradient Avatar Fallback */}
                    <div 
                      className={`w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                        user?.profile_picture ? 'hidden' : 'flex'
                      }`}
                      style={{ display: user?.profile_picture ? 'none' : 'flex' }}
                    >
                      {user?.name ? 
                        user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
                        'U'
                      }
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
                    <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
                      {/* Add user info section at the top of dropdown */}
                      <div className="px-4 py-3 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                          {user?.profile_picture ? (
                            <img
                              src={user.profile_picture}
                              alt={user?.name || 'Profile'}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-medium">
                              {user?.name ? 
                                user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
                                'U'
                              }
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user?.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Rest of the dropdown menu items */}
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
              </>
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
              
              {/* Mobile notifications link for authenticated users */}
              {isAuthenticated && (
                <Link
                  to="/notifications"
                  className="flex items-center justify-between px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center space-x-2">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </span>
                  {user?.role === 'host' && unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {isAuthenticated && user?.role === 'client' && (
                <Link
                  to="/my-bookings"
                  className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Bookings
                </Link>
              )}

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