// frontend/src/components/host/HostNotifications.jsx - Host Notifications
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Eye, 
  Filter,
  Calendar,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  X,
  Star
} from 'lucide-react';
import { notificationService, NOTIFICATION_TYPES } from '../../services/notificationService';
import Button from '../ui/Button';

const HostNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [markingAsRead, setMarkingAsRead] = useState({});
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await notificationService.getNotifications({
        page: 1,
        unreadOnly: showUnreadOnly
      });
      
      setNotifications(response.notifications.map(notif => 
        notificationService.formatNotification(notif)
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
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
    } catch (error) {
      alert('Failed to mark as read: ' + error.message);
    } finally {
      setMarkingAsRead(prev => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAsRead(prev => ({ ...prev, all: true }));
      
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isUnread: false, is_read: true }))
      );
    } catch (error) {
      alert('Failed to mark all as read: ' + error.message);
    } finally {
      setMarkingAsRead(prev => ({ ...prev, all: false }));
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (notification.isUnread) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case NOTIFICATION_TYPES.BOOKING_REQUEST:
      case NOTIFICATION_TYPES.BOOKING_APPROVED:
      case NOTIFICATION_TYPES.BOOKING_DECLINED:
        window.location.href = '/host/bookings';
        break;
      case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
        window.location.href = '/messages';
        break;
      case NOTIFICATION_TYPES.PAYMENT_SUCCESS:
      case NOTIFICATION_TYPES.PAYMENT_FAILED:
        window.location.href = '/host/earnings';
        break;
      case NOTIFICATION_TYPES.REVIEW_RECEIVED:
        window.location.href = '/host/listings';
        break;
      default:
        // Just mark as read
        break;
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    return notif.type === filter;
  });

  const groupedNotifications = notificationService.groupNotificationsByDate(filteredNotifications);
  const unreadCount = notifications.filter(n => n.isUnread).length;

  const filterOptions = [
    { value: 'all', label: 'All', icon: Bell },
    { value: NOTIFICATION_TYPES.BOOKING_REQUEST, label: 'Bookings', icon: Calendar },
    { value: NOTIFICATION_TYPES.MESSAGE_RECEIVED, label: 'Messages', icon: MessageSquare },
    { value: NOTIFICATION_TYPES.PAYMENT_SUCCESS, label: 'Payments', icon: DollarSign },
    { value: NOTIFICATION_TYPES.REVIEW_RECEIVED, label: 'Reviews', icon: Star }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={loadNotifications} variant="gradient">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const renderNotificationGroup = (title, notifications) => {
    if (notifications.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:bg-gray-700 transition ${
                notification.isUnread ? 'ring-2 ring-purple-500/50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`text-2xl ${notification.isUnread ? 'opacity-100' : 'opacity-60'}`}>
                    {notification.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-medium ${notification.isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {notification.title}
                      </h4>
                      {notification.isUnread && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      )}
                    </div>
                    
                    <p className={`text-sm ${notification.isUnread ? 'text-gray-300' : 'text-gray-400'} mb-2`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{notification.timeAgo}</span>
                      
                      <div className="flex space-x-2">
                        {notification.isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            disabled={markingAsRead[notification.id]}
                            className="text-purple-400 hover:text-purple-300 text-xs"
                          >
                            {markingAsRead[notification.id] ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-400"></div>
                            ) : (
                              'Mark as read'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              loading={markingAsRead.all}
              className="border-gray-600 text-gray-300"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
          
          <Button onClick={loadNotifications} variant="outline" className="border-gray-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Show Unread Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-300">Unread only</span>
          </label>
        </div>
      </div>

      {/* Notifications */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {showUnreadOnly ? 'No unread notifications' : 
             filter === 'all' ? 'No notifications' : `No ${filterOptions.find(f => f.value === filter)?.label.toLowerCase()} notifications`}
          </h3>
          <p className="text-gray-400">
            {showUnreadOnly ? 'All notifications have been read' : 'New notifications will appear here'}
          </p>
        </div>
      ) : (
        <div>
          {groupedNotifications.today.length > 0 && 
            renderNotificationGroup('Today', groupedNotifications.today)}
          
          {groupedNotifications.yesterday.length > 0 && 
            renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
          
          {groupedNotifications.thisWeek.length > 0 && 
            renderNotificationGroup('This Week', groupedNotifications.thisWeek)}
          
          {groupedNotifications.older.length > 0 && 
            renderNotificationGroup('Older', groupedNotifications.older)}
        </div>
      )}

      {/* Quick Actions for Urgent Notifications */}
      {notifications.some(n => n.isUnread && ['booking_request', 'payment_failed'].includes(n.type)) && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-6">
          <h3 className="text-yellow-400 font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Action Required
          </h3>
          
          <div className="space-y-3">
            {notifications
              .filter(n => n.isUnread && ['booking_request', 'payment_failed'].includes(n.type))
              .map(notification => (
                <div key={notification.id} className="bg-yellow-800/20 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm font-medium">{notification.title}</p>
                  <p className="text-yellow-200 text-xs">{notification.message}</p>
                  <div className="flex space-x-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500 text-yellow-400"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      Take Action
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-yellow-400"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostNotifications;