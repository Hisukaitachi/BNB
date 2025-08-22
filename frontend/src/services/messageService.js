// src/services/messageService.js
class MessageService {
  /**
   * Send message to user
   * @param {number} receiverId - Receiver user ID
   * @param {string} message - Message content
   * @returns {Promise<object>} Send result
   */
  async sendMessage(receiverId, message) {
    try {
      const response = await api.sendMessage(receiverId, message);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to send message');
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
      const response = await api.getConversation(otherUserId, page);
      return {
        messages: response.data?.messages || [],
        otherUser: response.data?.otherUser,
        pagination: response.data?.pagination
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch conversation');
    }
  }

  /**
   * Get user's inbox
   * @returns {Promise<Array>} Conversations
   */
  async getInbox() {
    try {
      const response = await api.getInbox();
      return response.data?.conversations || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch inbox');
    }
  }

  /**
   * Mark message as read
   * @param {number} messageId - Message ID
   * @returns {Promise<object>} Mark read result
   */
  async markAsRead(messageId) {
    try {
      const response = await api.markMessageAsRead(messageId);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to mark message as read');
    }
  }

  /**
   * Mark entire conversation as read
   * @param {number} otherUserId - Other user ID
   * @returns {Promise<object>} Mark read result
   */
  async markConversationAsRead(otherUserId) {
    try {
      const response = await api.markConversationAsRead(otherUserId);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to mark conversation as read');
    }
  }

  /**
   * Get unread message count
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    try {
      const conversations = await this.getInbox();
      return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }
}

export const messageService = new MessageService();