// src/components/messages/MessageList.jsx
import React, { useState } from 'react';
import { Search, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';

const MessageList = ({ 
  conversations, 
  selectedConversation, 
  onConversationSelect, 
  loading = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return 'No messages yet';
    return message.length > maxLength 
      ? message.substring(0, maxLength) + '...' 
      : message;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conv.last_message && conv.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold mb-4">Messages</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
      
      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchQuery ? (
              <>
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p className="mb-2">No conversations found</p>
                <p className="text-sm">Try searching with different keywords</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <p className="mb-2">No conversations yet</p>
                <p className="text-sm">Start chatting with hosts and guests!</p>
              </>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.other_user_id}
              onClick={() => onConversationSelect(conversation)}
              className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition ${
                selectedConversation?.other_user_id === conversation.other_user_id ? 'bg-gray-800' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={conversation.other_user_avatar || `https://ui-avatars.com/api/?name=${conversation.other_user_name}&background=random`}
                    alt={conversation.other_user_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {/* Online status indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium truncate text-white">
                      {conversation.other_user_name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">
                        {formatMessageTime(conversation.created_at)}
                      </span>
                      {conversation.unread_count > 0 && (
                        <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 truncate flex-1">
                      {conversation.sender_id === conversation.other_user_id ? '' : 'You: '}
                      {truncateMessage(conversation.last_message)}
                    </p>
                    
                    {/* Message status indicators */}
                    {conversation.sender_id !== conversation.other_user_id && (
                      <div className="ml-2">
                        {conversation.is_read ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Footer Stats */}
      {filteredConversations.length > 0 && (
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>{filteredConversations.filter(c => c.unread_count > 0).length} unread</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;