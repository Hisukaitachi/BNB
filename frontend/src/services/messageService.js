// src/services/messageService.js - UPDATED with proper unread count
import { messageAPI } from './api';

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document'
};

class MessageService {
  constructor() {
    this.socket = null;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Set socket instance (called from React component)
   * @param {object} socketInstance - Socket instance from useSocket hook
   */
  setSocket(socketInstance) {
    this.socket = socketInstance;
  }

  /**
   * Send message with media support (text, image, video)
   * @param {number} receiverId - Receiver user ID
   * @param {string} message - Message content
   * @param {File|null} mediaFile - Media file (image/video)
   * @returns {Promise<object>} Send result
   */
  async sendMessage(receiverId, message, mediaFiles = []) {
    try {
      // Validate input
      if (!receiverId || (!message?.trim() && (!mediaFiles || mediaFiles.length === 0))) {
        throw new Error('Receiver ID and message content or files are required');
      }

      if (message && message.length > 1000) {
        throw new Error('Message cannot exceed 1000 characters');
      }

      // Validate media files array
      if (mediaFiles && mediaFiles.length > 0) {
        if (mediaFiles.length > 20) {
          throw new Error('Cannot send more than 20 files at once');
        }

        // Validate each file
        for (const file of mediaFiles) {
          const validationResult = this.validateMediaFile(file);
          if (!validationResult.isValid) {
            throw new Error(`Invalid file ${file.name}: ${validationResult.error}`);
          }
        }
      }

      // Use the correct API call
      const response = await messageAPI.sendMessage(receiverId, message, mediaFiles);
      
      // Send via socket for real-time delivery (if available)
      if (this.socket && this.socket.emit) {
        this.socket.emit('newMessage', {
          receiverId,
          message: {
            sender_id: response.data.data.message.sender_id,
            receiver_id: receiverId,
            message: message,
            media_count: mediaFiles ? mediaFiles.length : 0,
            created_at: new Date(),
            type: mediaFiles && mediaFiles.length > 0 ? 'media' : 'text'
          }
        });
        
        // Emit event to trigger badge refresh after sending message
        this.socket.emit('messageSent', { receiverId });
      }

      // Trigger custom event for Header to refresh badge
      window.dispatchEvent(new CustomEvent('messageCountUpdate'));

      return {
        success: true,
        data: response.data.data?.message,
        messageId: response.data.data?.message?.id
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to send message');
    }
  }

  /**
   * Get conversation with another user
   * @param {number} otherUserId - Other user ID
   * @param {number} page - Page number
   * @returns {Promise<object>} Conversation data
   */
  async getConversation(otherUserId, page = 1) {
    try {
      if (!otherUserId) {
        throw new Error('User ID is required');
      }

      const response = await messageAPI.getConversation(otherUserId, page);
      
      return {
        messages: response.data.data?.messages || [],
        otherUser: response.data.data?.otherUser,
        pagination: response.data.data?.pagination
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch conversation');
    }
  }

  /**
   * Get user's inbox - Messages/Chatbox list
   * @returns {Promise<Array>} Conversations
   */
  async getInbox() {
    try {
      const response = await messageAPI.getInbox();
      
      const conversations = response.data.data?.conversations || [];
      
      // Format conversations with additional data
      return conversations.map(conv => ({
        ...conv,
        lastMessagePreview: this.formatMessagePreview(conv.last_message),
        timeAgo: this.formatTimeAgo(conv.created_at),
        isUnread: conv.unread_count > 0
      }));
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch inbox');
    }
  }

  /**
   * Mark message as read
   * @param {number} messageId - Message ID
   * @returns {Promise<object>} Mark read result
   */
  async markAsRead(messageId) {
    try {
      const response = await messageAPI.markMessageAsRead(messageId);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to mark message as read');
    }
  }

  /**
   * Mark entire conversation as read
   * @param {number} otherUserId - Other user ID
   * @returns {Promise<object>} Mark read result
   */
  async markConversationAsRead(otherUserId) {
    try {
      const response = await messageAPI.markConversationAsRead(otherUserId);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to mark conversation as read');
    }
  }

  /**
   * Get unread message count - UPDATED to use direct API call
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    try {
      const response = await messageAPI.getUnreadCount();
      
      // Handle different possible response structures
      const count = response.data?.data?.unread_count || 
                   response.data?.unread_count || 
                   0;
      
      console.log('📊 Unread messages count from API:', count);
      return count;
    } catch (error) {
      console.error('❌ Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Initialize conversation with specific user (for view requests)
   * @param {number} userId - User ID to start conversation with
   * @param {string} initialMessage - Optional initial message
   * @returns {Promise<object>} Conversation data
   */
  async initializeConversation(userId, initialMessage = null) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // First, try to get existing conversation
      const existingConversation = await this.getConversation(userId, 1);
      
      // If no messages and we have an initial message, send it
      if (existingConversation.messages.length === 0 && initialMessage) {
        await this.sendMessage(userId, initialMessage);
        // Get the conversation again after sending the message
        return await this.getConversation(userId, 1);
      }

      return existingConversation;
    } catch (error) {
      throw new Error(error.message || 'Failed to initialize conversation');
    }
  }

  /**
   * Validate media file for messaging
   * @param {File} file - File to validate
   * @returns {object} Validation result
   */
  validateMediaFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size cannot exceed 10MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, WebM) are allowed' };
    }

    // Additional video validation
    if (allowedVideoTypes.includes(file.type) && file.size > 50 * 1024 * 1024) {
      return { isValid: false, error: 'Video files cannot exceed 50MB' };
    }

    return { isValid: true };
  }

  /**
   * Get file type from file object
   * @param {File} file - File object
   * @returns {string} File type
   */
  getFileType(file) {
    if (file.type.startsWith('image/')) {
      return MESSAGE_TYPES.IMAGE;
    }
    if (file.type.startsWith('video/')) {
      return MESSAGE_TYPES.VIDEO;
    }
    return MESSAGE_TYPES.DOCUMENT;
  }

  /**
   * Format message preview for inbox
   * @param {string} message - Raw message
   * @param {string} type - Message type
   * @returns {string} Formatted preview
   */
  formatMessagePreview(message, type = MESSAGE_TYPES.TEXT) {
    if (!message) return '';

    switch (type) {
      case MESSAGE_TYPES.IMAGE:
        return '📷 Image';
      case MESSAGE_TYPES.VIDEO:
        return '🎥 Video';
      case MESSAGE_TYPES.DOCUMENT:
        return '📄 Document';
      default:
        return message.length > 50 ? `${message.substring(0, 50)}...` : message;
    }
  }

  /**
   * Format time ago for messages
   * @param {string} timestamp - Message timestamp
   * @returns {string} Formatted time
   */
  formatTimeAgo(timestamp) {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageTime) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    return messageTime.toLocaleDateString();
  }

  /**
   * Format message for display
   * @param {object} message - Message object
   * @param {number} currentUserId - Current user ID
   * @returns {object} Formatted message
   */
  formatMessage(message, currentUserId) {
    return {
      ...message,
      isSender: message.sender_id === currentUserId,
      timeFormatted: new Date(message.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      dateFormatted: new Date(message.created_at).toLocaleDateString(),
      type: message.media_type || MESSAGE_TYPES.TEXT,
      hasMedia: !!(message.media_url || message.image_url || message.video_url)
    };
  }

  /**
   * Search messages in conversation
   * @param {Array} messages - Messages array
   * @param {string} searchTerm - Search term
   * @returns {Array} Filtered messages
   */
  searchMessages(messages, searchTerm) {
    if (!searchTerm.trim()) return messages;

    const term = searchTerm.toLowerCase();
    return messages.filter(message => 
      message.message?.toLowerCase().includes(term) ||
      message.sender_name?.toLowerCase().includes(term)
    );
  }

  /**
   * Group messages by date
   * @param {Array} messages - Messages array
   * @returns {object} Grouped messages
   */
  groupMessagesByDate(messages) {
    const grouped = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });

    return grouped;
  }

  /**
   * Handle typing indicators (requires socket to be set)
   * @param {number} receiverId - Receiver user ID
   */
  sendTypingIndicator(receiverId) {
    if (this.socket && this.socket.emit) {
      this.socket.emit('typing', {
        receiverId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Stop typing indicators
   * @param {number} receiverId - Receiver user ID
   */
  stopTypingIndicator(receiverId) {
    if (this.socket && this.socket.emit) {
      this.socket.emit('stopTyping', {
        receiverId,
        timestamp: new Date()
      });
    }
  }
}

export default new MessageService();