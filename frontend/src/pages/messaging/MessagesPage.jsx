// src/components/messaging/MessagesPage.jsx - TEMPORARY VERSION (Text messages only)
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { 
  Send, Phone, Video, Paperclip, Image, X, User, Search, 
  MoreVertical, ArrowLeft, Smile, Check, CheckCheck, 
  Clock, MessageCircle, Users, Settings
} from 'lucide-react';
import messageService from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/AppContext';
import Button from '../../components/ui/Button';

const MessagesPage = () => {
  const { user } = useAuth();
  const { socket, connectSocket } = useSocket();
  const [searchParams] = useSearchParams();
  
  // States
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket service and handle URL params
  useEffect(() => {
    // Connect socket if user exists and not already connected
    if (user && !socket) {
      connectSocket(user.id);
    }

    // Set socket in messageService when available
    if (socket) {
      messageService.setSocket(socket);
    }

    loadConversations();
    
    // Handle URL parameters for direct user targeting (from ViewRequests)
    const targetUserId = searchParams.get('user');
    const initialMessage = searchParams.get('message');
    
    if (targetUserId && user) {
      handleDirectUserMessage(parseInt(targetUserId), initialMessage);
    }
  }, [socket, user, searchParams]);

  // Socket listeners
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        console.log('Received new message:', message);
        if (activeConversation && 
            (message.sender_id === activeConversation.id || message.sender_id === user.id)) {
          const formattedMessage = messageService.formatMessage(message, user.id);
          setMessages(prev => [...prev, formattedMessage]);
        }
        loadConversations(); // Update conversation list
      };

      const handleTypingIndicator = (data) => {
        if (data.senderId === activeConversation?.id) {
          setIsTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      };

      const handleStoppedTyping = (data) => {
        if (data.senderId === activeConversation?.id) {
          setIsTyping(false);
          clearTimeout(typingTimeoutRef.current);
        }
      };

      socket.on('receiveMessage', handleNewMessage);
      socket.on('userTyping', handleTypingIndicator);
      socket.on('userStoppedTyping', handleStoppedTyping);
      
      return () => {
        socket.off('receiveMessage', handleNewMessage);
        socket.off('userTyping', handleTypingIndicator);
        socket.off('userStoppedTyping', handleStoppedTyping);
      };
    }
  }, [socket, activeConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDirectUserMessage = async (userId, initialMsg) => {
    try {
      console.log('Direct message to user:', userId, initialMsg);
      // If there's an initial message from URL params, set it but don't send it yet
      if (initialMsg) {
        setNewMessage(decodeURIComponent(initialMsg));
      }
      
      // Load existing conversation or create new one
      await loadConversation(userId);
      setShowMobileChat(true); // Show chat on mobile
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await messageService.getInbox();
      console.log('Loaded conversations:', data);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (otherUserId) => {
    try {
      console.log('Loading conversation with user:', otherUserId);
      const data = await messageService.getConversation(otherUserId);
      console.log('Conversation data:', data);
      
      setMessages(data.messages.map(msg => messageService.formatMessage(msg, user.id)));
      setActiveConversation(data.otherUser);
      setShowMobileChat(true);
      
      // Mark conversation as read
      await messageService.markConversationAsRead(otherUserId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // FIXED: Simplified send message function (text only)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return; // Don't show alert for empty message
    }
    
    if (!activeConversation) {
      alert('Please select a conversation first');
      return;
    }

    console.log('Sending message to:', activeConversation.id, newMessage.trim());

    try {
      setSending(true);
      
      // Send only text message for now
      const result = await messageService.sendMessage(
        activeConversation.id,
        newMessage.trim(),
        null // No media files for now
      );
      
      console.log('Message sent successfully:', result);
      
      setNewMessage('');
      
      // Stop typing indicator
      messageService.stopTypingIndicator(activeConversation.id);
      
      // Refresh conversation without forcing scroll
      const data = await messageService.getConversation(activeConversation.id);
      setMessages(data.messages.map(msg => messageService.formatMessage(msg, user.id)));
      
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (activeConversation) {
      messageService.sendTypingIndicator(activeConversation.id);
      
      // Clear existing timeout
      clearTimeout(typingTimeoutRef.current);
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        messageService.stopTypingIndicator(activeConversation.id);
      }, 1000);
    }
  };

  const initiateCall = (callType) => {
    alert(`${callType.charAt(0).toUpperCase() + callType.slice(1)} calling feature will be implemented soon!`);
  };

  const getMessageStatus = (message) => {
    if (message.isSender) {
      if (message.is_read) {
        return <CheckCheck className="w-4 h-4 text-blue-400" />;
      }
      return <Check className="w-4 h-4 text-gray-400" />;
    }
    return null;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16 fixed inset-0 overflow-hidden">
      <div className="h-full flex overflow-hidden">
        
        {/* Sidebar - Conversations List */}
        <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} md:w-80 w-full flex-col bg-gray-800 border-r border-gray-700`}>
          
          {/* Header */}
          <div className="p-4 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold text-white">Messages</h1>
              <div className="flex space-x-2">
                <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
                  <Users className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm mt-1">Start messaging to see conversations here</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.other_user_id}
                  onClick={() => loadConversation(conv.other_user_id)}
                  className={`p-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                    activeConversation?.id === conv.other_user_id ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-semibold text-lg">
                          {conv.other_user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-white font-medium truncate">
                          {conv.other_user_name}
                        </h3>
                        <span className="text-xs text-gray-400">{conv.timeAgo}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400 truncate flex-1">
                          {conv.lastMessagePreview}
                        </p>
                        {conv.unread_count > 0 && (
                          <div className="ml-2 min-w-[20px] h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center px-1.5">
                            {conv.unread_count > 99 ? '99+' : conv.unread_count}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-900`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-300"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-semibold">
                      {activeConversation.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-white font-medium">{activeConversation.name}</h3>
                    {isTyping ? (
                      <p className="text-sm text-purple-400 flex items-center">
                        <span className="mr-1">typing</span>
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </p>
                    ) : (
                      <p className="text-sm text-green-400">online</p>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => initiateCall('audio')}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => initiateCall('video')}
                    className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
                      <p>Send a message to begin chatting with {activeConversation.name}</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex ${message.isSender ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className="flex items-end space-x-2 max-w-[70%]">
                        {!message.isSender && (
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs font-semibold">
                              {activeConversation.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <div
                          className={`px-4 py-2 rounded-2xl shadow-sm ${
                            message.isSender
                              ? 'bg-purple-600 text-white rounded-br-md'
                              : 'bg-gray-700 text-gray-100 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.message}</p>
                          
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <span className={`text-xs opacity-70 ${message.isSender ? 'text-purple-100' : 'text-gray-400'}`}>
                              {message.timeFormatted}
                            </span>
                            {getMessageStatus(message)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-gray-800 border-t border-gray-700">
                <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                  {/* Disabled media buttons for now */}
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => alert('📎 File upload coming soon! Backend needs media support first.')}
                      className="p-2 rounded-full text-gray-500 cursor-not-allowed"
                      disabled
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      type="button" 
                      onClick={() => alert('🖼️ Image upload coming soon! Backend needs media support first.')}
                      className="p-2 rounded-full text-gray-500 cursor-not-allowed"
                      disabled
                    >
                      <Image className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      placeholder="Type a message..."
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                      maxLength={1000}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-600 text-gray-400 transition-colors"
                      onClick={() => alert('😊 Emoji picker coming soon!')}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <Button
                    type="submit"
                    variant="gradient"
                    loading={sending}
                    disabled={!newMessage.trim()}
                    className="p-3 rounded-full"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
                
                {/* Status messages */}
                <div className="mt-2 text-xs text-gray-500 text-center">
                  💬 Text messaging ready • 📷 Media & 📹 Calls coming soon
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center text-gray-400 max-w-sm">
                <MessageCircle className="w-20 h-20 mx-auto mb-6 opacity-50" />
                <h3 className="text-2xl font-medium mb-3 text-white">Welcome to Messages</h3>
                <p className="text-gray-400 leading-relaxed">
                  Select a conversation from the sidebar to start messaging, or start a new conversation.
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  📱 Text messaging is ready to use!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;