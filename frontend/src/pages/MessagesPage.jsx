import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Search, MoreVertical, Phone, Video, Info, Smile, Paperclip, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';

const MessagesPage = () => {
  const { user } = useAuth();
  const { socket, sendMessage, markMessagesAsRead } = useApp();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    
    // Auto-select conversation if user parameter is provided
    const userId = searchParams.get('user');
    if (userId) {
      // Find or create conversation with this user
      handleUserSelection(parseInt(userId));
    }
  }, [searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('receiveMessage', handleReceiveMessage);
      socket.on('userTyping', handleUserTyping);
      
      return () => {
        socket.off('receiveMessage', handleReceiveMessage);
        socket.off('userTyping', handleUserTyping);
      };
    }
  }, [socket, selectedConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.getInbox();
      if (response.status === 'success') {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const response = await api.getConversation(otherUserId);
      if (response.status === 'success') {
        setMessages(response.data.messages || []);
        
        // Mark conversation as read
        await api.markConversationAsRead(otherUserId);
        markMessagesAsRead();
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleUserSelection = async (userId) => {
    // Find existing conversation or create new one
    let conversation = conversations.find(conv => conv.other_user_id === userId);
    
    if (!conversation) {
      // Create a placeholder conversation
      conversation = {
        other_user_id: userId,
        other_user_name: 'Loading...',
        last_message: '',
        created_at: new Date().toISOString(),
        unread_count: 0
      };
    }
    
    setSelectedConversation(conversation);
    await fetchMessages(userId);
  };

  const handleConversationSelect = async (conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.other_user_id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;
    
    setSendingMessage(true);
    try {
      const response = await api.sendMessage(selectedConversation.other_user_id, newMessage.trim());
      
      if (response.status === 'success') {
        // Add message to local state immediately
        const tempMessage = {
          id: Date.now(),
          sender_id: user.id,
          receiver_id: selectedConversation.other_user_id,
          message: newMessage.trim(),
          created_at: new Date().toISOString(),
          is_read: 0,
          sender_name: user.name
        };
        
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        
        // Send via socket for real-time delivery
        if (socket) {
          sendMessage(selectedConversation.other_user_id, newMessage.trim());
        }
        
        // Update conversation list
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReceiveMessage = (message) => {
    if (selectedConversation && 
        (message.sender_id === selectedConversation.other_user_id || 
         message.receiver_id === selectedConversation.other_user_id)) {
      setMessages(prev => [...prev, message]);
      
      // Mark as read if conversation is open
      if (message.sender_id === selectedConversation.other_user_id) {
        api.markConversationAsRead(selectedConversation.other_user_id);
      }
    }
    
    // Refresh conversations to update last message
    fetchConversations();
  };

  const handleUserTyping = (data) => {
    // Handle typing indicators
    console.log('User typing:', data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Loading message="Loading your messages..." />;
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg h-[calc(100vh-8rem)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
            {/* Conversations Sidebar */}
            <div className={`bg-gray-900 border-r border-gray-700 ${selectedConversation ? 'hidden lg:block' : ''}`}>
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
              
              <div className="overflow-y-auto h-full">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8" />
                    </div>
                    <p className="mb-2">No conversations yet</p>
                    <p className="text-sm">Start chatting with hosts and guests!</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.other_user_id}
                      onClick={() => handleConversationSelect(conversation)}
                      className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition ${
                        selectedConversation?.other_user_id === conversation.other_user_id ? 'bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={conversation.other_user_avatar || `https://ui-avatars.com/api/?name=${conversation.other_user_name}&background=random`}
                          alt={conversation.other_user_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate">{conversation.other_user_name}</h3>
                            <span className="text-xs text-gray-400">
                              {formatMessageTime(conversation.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-400 truncate">
                              {conversation.last_message || 'No messages yet'}
                            </p>
                            {conversation.unread_count > 0 && (
                              <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {conversation.unread_count}
                              </span>
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
            <div className={`lg:col-span-2 flex flex-col ${!selectedConversation ? 'hidden lg:flex' : ''}`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-700 bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={() => setSelectedConversation(null)}
                          className="lg:hidden text-gray-400 hover:text-white"
                        >
                          ←
                        </button>
                        <img
                          src={selectedConversation.other_user_avatar || `https://ui-avatars.com/api/?name=${selectedConversation.other_user_name}&background=random`}
                          alt={selectedConversation.other_user_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="font-medium">{selectedConversation.other_user_name}</h3>
                          <p className="text-sm text-gray-400">Online</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" icon={<Phone className="w-4 h-4" />} />
                        <Button variant="ghost" size="sm" icon={<Video className="w-4 h-4" />} />
                        <Button variant="ghost" size="sm" icon={<Info className="w-4 h-4" />} />
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
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
                                  src={`https://ui-avatars.com/api/?name=${message.sender_name || selectedConversation.other_user_name}&background=random`}
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
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-700 bg-gray-800">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          // Handle file upload
                          console.log('File selected:', e.target.files[0]);
                        }}
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
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
                    <p>Choose a conversation from the sidebar to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;