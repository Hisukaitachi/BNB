import { notificationAPI } from './api';

export const NOTIFICATION_TYPES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_APPROVED: 'booking_approved', 
  BOOKING_DECLINED: 'booking_declined',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  MESSAGE_RECEIVED: 'message_received',
  REVIEW_RECEIVED: 'review_received',
  ADMIN_NOTICE: 'admin_notice',
  ACCOUNT: 'account',
  ROLE: 'role',
  LISTING: 'listing',
  GENERAL: 'general'
};

class NotificationService {
  /**
   * Get user notifications
   * @param {object} options - Query options
   * @returns {Promise<object>} Notifications data
   */
  async getNotifications(options = {}) {
    try {
      const { page = 1, unreadOnly = false, type } = options;
      
      const response = await notificationAPI.getNotifications(page, unreadOnly);
      
      return {
        notifications: response.data.data?.notifications || [],
        statistics: response.data.data?.statistics || {},
        pagination: response.data.data?.pagination || {}
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @returns {Promise<object>} Mark read result
   */
  async markAsRead(notificationId) {
    try {
      const response = await notificationAPI.markNotificationRead(notificationId);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<object>} Mark all read result
   */
  async markAllAsRead() {
    try {
      const response = await notificationAPI.markAllNotificationsRead();
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to mark all notifications as read');
    }
  }

  /**
   * Format notification for display
   * @param {object} notification - Notification object
   * @returns {object} Formatted notification
   */
  formatNotification(notification) {
    const typeIcons = {
      [NOTIFICATION_TYPES.BOOKING_REQUEST]: '📅',
      [NOTIFICATION_TYPES.BOOKING_APPROVED]: '✅',
      [NOTIFICATION_TYPES.BOOKING_DECLINED]: '❌',
      [NOTIFICATION_TYPES.BOOKING_CANCELLED]: '🚫',
      [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: '💳',
      [NOTIFICATION_TYPES.PAYMENT_FAILED]: '⚠️',
      [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: '💬',
      [NOTIFICATION_TYPES.REVIEW_RECEIVED]: '⭐',
      [NOTIFICATION_TYPES.ADMIN_NOTICE]: '🔔',
      [NOTIFICATION_TYPES.ACCOUNT]: '👤',
      [NOTIFICATION_TYPES.ROLE]: '🔄',
      [NOTIFICATION_TYPES.LISTING]: '🏠',
      [NOTIFICATION_TYPES.GENERAL]: 'ℹ️'
    };

    const typeColors = {
      [NOTIFICATION_TYPES.BOOKING_REQUEST]: 'text-blue-600 bg-blue-50',
      [NOTIFICATION_TYPES.BOOKING_APPROVED]: 'text-green-600 bg-green-50',
      [NOTIFICATION_TYPES.BOOKING_DECLINED]: 'text-red-600 bg-red-50',
      [NOTIFICATION_TYPES.BOOKING_CANCELLED]: 'text-red-600 bg-red-50',
      [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: 'text-green-600 bg-green-50',
      [NOTIFICATION_TYPES.PAYMENT_FAILED]: 'text-red-600 bg-red-50',
      [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: 'text-purple-600 bg-purple-50',
      [NOTIFICATION_TYPES.REVIEW_RECEIVED]: 'text-yellow-600 bg-yellow-50',
      [NOTIFICATION_TYPES.ADMIN_NOTICE]: 'text-gray-600 bg-gray-50',
      [NOTIFICATION_TYPES.ACCOUNT]: 'text-blue-600 bg-blue-50',
      [NOTIFICATION_TYPES.ROLE]: 'text-indigo-600 bg-indigo-50',
      [NOTIFICATION_TYPES.LISTING]: 'text-teal-600 bg-teal-50',
      [NOTIFICATION_TYPES.GENERAL]: 'text-gray-600 bg-gray-50'
    };

    return {
      ...notification,
      icon: typeIcons[notification.type] || typeIcons[NOTIFICATION_TYPES.GENERAL],
      color: typeColors[notification.type] || typeColors[NOTIFICATION_TYPES.GENERAL],
      timeAgo: this.formatTimeAgo(notification.created_at),
      formattedDate: new Date(notification.created_at).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      isUnread: !notification.is_read
    };
  }

  /**
   * Format time ago for notifications
   * @param {string} timestamp - Timestamp
   * @returns {string} Formatted time
   */
  formatTimeAgo(timestamp) {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notifTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notifTime.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }

  /**
   * Group notifications by date
   * @param {Array} notifications - Notifications array
   * @returns {object} Grouped notifications
   */
  groupNotificationsByDate(notifications) {
    const grouped = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach(notification => {
      const notifDate = new Date(notification.created_at);
      const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

      if (notifDay.getTime() === today.getTime()) {
        grouped.today.push(notification);
      } else if (notifDay.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(notification);
      } else if (notifDate > weekAgo) {
        grouped.thisWeek.push(notification);
      } else {
        grouped.older.push(notification);
      }
    });

    return grouped;
  }

  /**
   * Get notification preferences (placeholder for future implementation)
   * @returns {object} Notification preferences
   */
  getNotificationPreferences() {
    return {
      bookingUpdates: true,
      paymentAlerts: true,
      messageNotifications: true,
      reviewNotifications: true,
      adminNotices: true,
      emailNotifications: false,
      pushNotifications: true
    };
  }
}

export const notificationService = new NotificationService();