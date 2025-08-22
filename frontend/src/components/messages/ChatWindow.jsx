// src/components/messages/ChatWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, MoreVertical, Phone, Video, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Button from '../common/Button';

const ChatWindow = ({ 
  conversation, 
  messages, 
  onSendMessage, 
  onBackClick,
  loading = false 
}) => {
  const { user } = useAuth();
  const { socket } = useApp();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('userTyping', handleUserTyping);
      return () => socket.off('userTyping', handleUserTyping);
    }
  }, [socket, conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUserTyping = (data) => {
    if (data.senderId === conversation?.other_user_id) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Handle file upload logic here
      console.log('File selected:', file);
      // You can implement file upload functionality
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
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

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-12 h-12" />
          </div>
          <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
          <p>Choose a conversation from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBackClick && (
              <button 
                onClick={onBackClick}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                ←
              </button>
            )}
            <img
              src={conversation.other_user_avatar || `https://ui-avatars.com/api/?name=${conversation.other_user_name}&background=random`}
              alt={conversation.other_user_name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-medium">{conversation.other_user_name}</h3>
              <p className="text-sm text-gray-400">
                {isTyping ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" icon={<Phone className="w-4 h-4" />} />
            <Button variant="ghost" size="sm" icon={<Video className="w-4 h-4" />} />
            <Button variant="ghost" size="sm" icon={<MoreVertical className="w-4 h-4" />} />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMyMessage = message.sender_id === user.id;
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
            
            return (
              <div
                key={message.id || index}
                className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isMyMessage && showAvatar && (
                    <img
                      src={`https://ui-avatars.com/api/?name=${message.sender_name || conversation.other_user_name}&background=random`}
                      alt={message.sender_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  {!isMyMessage && !showAvatar && <div className="w-8" />}
                  
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isMyMessage
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className={`text-xs mt-1 ${isMyMessage ? 'text-purple-200' : 'text-gray-400'}`}>
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
              <img
                src={`https://ui-avatars.com/api/?name=${conversation.other_user_name}&background=random`}
                alt={conversation.other_user_name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="px-4 py-2 rounded-2xl bg-gray-700 text-gray-100">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={<Paperclip className="w-4 h-4" />}
          />
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
              disabled={sendingMessage}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              icon={<Smile className="w-4 h-4" />}
            />
          </div>
          
          <Button
            type="submit"
            loading={sendingMessage}
            disabled={!newMessage.trim() || sendingMessage}
            icon={<Send className="w-4 h-4" />}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;