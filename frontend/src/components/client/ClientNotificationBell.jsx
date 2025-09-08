// frontend/src/components/client/ClientNotificationBell.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Calendar,
  MessageSquare,
  DollarSign,
  Star,
  X,
  ExternalLink
} from 'lucide-react';
import { notificationService, NOTIFICATION_TYPES } from '../../services/notificationService';

const ClientNotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState({});

  // Load notifications when component mounts and periodically refresh
  useEffect(() => {
    loadNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when bell is opened
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications({ 
        page: 1, 
        unreadOnly: false 
      });
      
      // Format and take only the latest 5 notifications
      const formattedNotifications = data.notifications?.map(notif => 
        notificationService.formatNotification(notif)
      ).slice(0, 5) || [];
      
      setNotifications(formattedNotifications);
      setUnreadCount(data.statistics?.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId, event) => {
    event.stopPropagation();
    
    try {
      setMarkingAsRead(prev => ({ ...prev, [notificationId]: true }));
      
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isUnread: false, is_read: true }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Failed to mark as read:', error);
    } finally {
      setMarkingAsRead(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleMarkAllAsRead = async (event) => {
    event.stopPropagation();
    
    try {
      setMarkingAsRead(prev => ({ ...prev, all: true }));
      
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isUnread: false, is_read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAsRead(prev => ({ ...prev, all: false }));
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read when clicked
    if (notification.isUnread) {
      await handleMarkAsRead(notification.id, { stopPropagation: () => {} });
    }

    // Navigate based on notification type
    let targetPath = '/notifications';
    
    switch (notification.type) {
      case NOTIFICATION_TYPES.BOOKING_REQUEST:
      case NOTIFICATION_TYPES.BOOKING_APPROVED:
      case NOTIFICATION_TYPES.BOOKING_DECLINED:
      case NOTIFICATION_TYPES.BOOKING_CANCELLED:
        targetPath = '/my-bookings';
        break;
      case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
        targetPath = '/messages';
        break;
      case NOTIFICATION_TYPES.PAYMENT_SUCCESS:
      case NOTIFICATION_TYPES.PAYMENT_FAILED:
        targetPath = '/my-bookings';
        break;
      case NOTIFICATION_TYPES.REVIEW_RECEIVED:
        targetPath = '/profile';
        break;
      default:
        targetPath = '/notifications';
    }

    setIsOpen(false);
    window.location.href = targetPath;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.BOOKING_REQUEST:
      case NOTIFICATION_TYPES.BOOKING_APPROVED:
      case NOTIFICATION_TYPES.BOOKING_DECLINED:
      case NOTIFICATION_TYPES.BOOKING_CANCELLED:
        return Calendar;
      case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
        return MessageSquare;
      case NOTIFICATION_TYPES.PAYMENT_SUCCESS:
      case NOTIFICATION_TYPES.PAYMENT_FAILED:
        return DollarSign;
      case NOTIFICATION_TYPES.REVIEW_RECEIVED:
        return Star;
      default:
        return Bell;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-800 text-gray-300 transition"
      >
        <Bell className="w-6 h-6" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Pulse Animation for New Notifications */}
        {unreadCount > 0 && (
          <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping"></div>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
            {/* Header */}
            <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-200">Notifications</h3>
              
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markingAsRead.all}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                  >
                    {markingAsRead.all ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-400"></div>
                    ) : (
                      <>
                        <CheckCheck className="w-3 h-3" />
                        <span>Mark all read</span>
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
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
                <div className="py-2">
                  {notifications.map((notification) => {
                    const IconComponent = getNotificationIcon(notification.type);
                    
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition ${
                          notification.isUnread ? 'bg-gray-750 border-l-2 border-purple-400' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Icon */}
                          <div className={`p-2 rounded-full ${notification.color} flex-shrink-0`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-medium ${
                                notification.isUnread ? 'text-white' : 'text-gray-300'
                              }`}>
                                {notification.title}
                              </p>
                              
                              {notification.isUnread && (
                                <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            
                            <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {notification.timeAgo}
                              </span>
                              
                              {notification.isUnread && (
                                <div
                                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                                  className={`text-xs text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer ${
                                    markingAsRead[notification.id] ? 'pointer-events-none opacity-50' : ''
                                  }`}
                                >
                                  {markingAsRead[notification.id] ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-400"></div>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Mark read</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer - View All Link (Optional) */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-700">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/notifications';
                  }}
                  className="w-full text-sm text-purple-400 hover:text-purple-300 flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  <span>View all notifications</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ClientNotificationBell;