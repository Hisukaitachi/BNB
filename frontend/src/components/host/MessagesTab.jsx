// src/components/host/MessagesTab.jsx - Fixed Version
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Search, Send, User, Clock, 
  Phone, Mail, Calendar, MapPin, Check, CheckCheck,
  Paperclip, Smile, MoreVertical
} from 'lucide-react';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';
import { useApp } from '../../context/AppContext';

const MessagesTab = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useApp();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    // Set up polling for real-time updates
    const interval = setInterval(fetchConversations, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.getInbox();
      if (response.status === 'success') {
        const conversationsData = response.data?.conversations || [];
        setConversations(conversationsData);
        
        // Auto-select first conversation if none selected
        if (conversationsData.length > 0 && !selectedConversation) {
          setSelectedConversation(conversationsData[0]);
          fetchMessages(conversationsData[0].other_user.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      setLoadingMessages(true);
      const response = await api.getConversation(userId);
      if (response.status === 'success') {
        setMessages(response.data?.messages || []);
        
        // Mark conversation as read
        await api.markConversationAsRead(userId);
        
        // Update conversation list to show as read
        setConversations(prev => prev.map(conv => 
          conv.other_user.id === userId 
            ? { ...conv, unread_count: 0 }
            : conv
        ));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      showToast('Failed to load messages', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    const messageText = newMessage.trim();
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      is_from_host: true,
      created_at: new Date().toISOString(),
      sender_id: 'current_user'
    };

    try {
      setSending(true);
      
      // Optimistically add message to UI
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      const response = await api.sendMessage(selectedConversation.other_user.id, messageText);
      
      if (response.success) {
        // Replace temp message with real message
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? response.data.message : msg
        ));
        
        // Update conversation in list
        setConversations(prev => prev.map(conv => 
          conv.other_user.id === selectedConversation.other_user.id 
            ? { 
                ...conv, 
                last_message: messageText, 
                last_message_time: new Date().toISOString() 
              }
            : conv
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message', 'error');
      
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.other_user.id);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMessageStatus = (message) => {
    if (message.read_at) return <CheckCheck className="w-4 h-4 text-blue-400" />;
    if (message.sent_at) return <Check className="w-4 h-4 text-gray-400" />;
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startNewConversation = () => {
    showToast('Feature coming soon: Start new conversation', 'info');
  };

  if (loading) {
    return <Loading message="Loading messages..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Messages</h2>
          <p className="text-gray-400">Communicate with your guests</p>
        </div>
        <Button onClick={startNewConversation} icon={<MessageSquare className="w-4 h-4" />}>
          New Message
        </Button>
      </div>

      <div className="flex h-[600px] bg-gray-800 rounded-xl overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Messages from guests will appear here</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.other_user.id}
                  onClick={() => handleConversationSelect(conversation)}
                  className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors ${
                    selectedConversation?.other_user.id === conversation.other_user.id ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                      {conversation.other_user.avatar ? (
                        <img 
                          src={conversation.other_user.avatar} 
                          alt={conversation.other_user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium truncate">{conversation.other_user.name || 'Guest'}</h4>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(conversation.last_message_time)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-400 truncate">
                        {conversation.last_message || 'No messages yet'}
                      </p>
                      
                      {conversation.unread_count > 0 && (
                        <div className="mt-2 flex justify-end">
                          <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1">
                            {conversation.unread_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700 bg-gray-750">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-full overflow-hidden flex items-center justify-center">
                      {selectedConversation.other_user.avatar ? (
                        <img 
                          src={selectedConversation.other_user.avatar} 
                          alt={selectedConversation.other_user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.other_user.name || 'Guest'}</h3>
                      <p className="text-sm text-gray-400">
                        {selectedConversation.other_user.role === 'guest' ? 'Guest' : 'User'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {selectedConversation.other_user.phone && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        icon={<Phone className="w-4 h-4" />}
                        onClick={() => window.open(`tel:${selectedConversation.other_user.phone}`, '_blank')}
                      >
                        Call
                      </Button>
                    )}
                    {selectedConversation.other_user.email && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        icon={<Mail className="w-4 h-4" />}
                        onClick={() => window.open(`mailto:${selectedConversation.other_user.email}`, '_blank')}
                      >
                        Email
                      </Button>
                    )}
                    <Button size="sm" variant="outline" icon={<MoreVertical className="w-4 h-4" />}>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                    <p>No messages in this conversation</p>
                    <p className="text-sm">Start the conversation below</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const isFromCurrentUser = message.is_from_host || message.sender_id === 'current_user';
                      const showAvatar = index === 0 || 
                        messages[index - 1].is_from_host !== message.is_from_host;
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${
                            isFromCurrentUser ? 'flex-row-reverse space-x-reverse' : ''
                          }`}>
                            {!isFromCurrentUser && showAvatar && (
                              <div className="w-6 h-6 bg-gray-600 rounded-full overflow-hidden flex items-center justify-center">
                                {selectedConversation.other_user.avatar ? (
                                  <img 
                                    src={selectedConversation.other_user.avatar} 
                                    alt={selectedConversation.other_user.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            )}
                            
                            <div className={`px-4 py-2 rounded-lg ${
                              isFromCurrentUser
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-700 text-gray-100'
                            }`}>
                              <p className="text-sm">{message.content}</p>
                              <div className={`flex items-center justify-end space-x-1 mt-1 ${
                                isFromCurrentUser ? 'text-purple-200' : 'text-gray-400'
                              }`}>
                                <span className="text-xs">{formatTime(message.created_at)}</span>
                                {isFromCurrentUser && getMessageStatus(message)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-700 bg-gray-750">
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                      rows="2"
                      disabled={sending}
                    />
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Paperclip className="w-4 h-4" />}
                      disabled={sending}
                      onClick={() => showToast('File attachments coming soon', 'info')}
                    >
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Smile className="w-4 h-4" />}
                      disabled={sending}
                      onClick={() => showToast('Emoji picker coming soon', 'info')}
                    >
                    </Button>
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      loading={sending}
                      icon={<Send className="w-4 h-4" />}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MessageSquare className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p>Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Message Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Welcome Message',
              template: 'Welcome to our property! We\'re excited to host you. If you have any questions, feel free to reach out.'
            },
            {
              title: 'Check-in Instructions',
              template: 'Here are your check-in details: [Address]. The key will be in the lockbox. Code: [Code]. Check-in is after 3 PM.'
            },
            {
              title: 'Thank You',
              template: 'Thank you for staying with us! We hope you had a wonderful experience. We\'d appreciate a review when you have time.'
            }
          ].map((template, index) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors">
              <h4 className="font-medium mb-2">{template.title}</h4>
              <p className="text-sm text-gray-400 mb-3 line-clamp-3">{template.template}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (selectedConversation) {
                    setNewMessage(template.template);
                  } else {
                    showToast('Please select a conversation first', 'info');
                  }
                }}
              >
                Use Template
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessagesTab;