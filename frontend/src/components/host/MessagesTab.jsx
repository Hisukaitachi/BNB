// src/components/host/MessagesTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Search, Send, User, Clock, 
  Phone, Mail, Calendar, MapPin, Check, CheckCheck
} from 'lucide-react';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';
import { useApp } from '../../context/AppContext';
import { useSocket } from '../../context/AppContext';

const MessagesTab = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useApp();
  const { socket } = useSocket();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('receiveMessage', handleNewMessage);
      return () => socket.off('receiveMessage', handleNewMessage);
    }
  }, [socket, selectedConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await api.getInbox();
      const conversationsData = response.data?.conversations || [];
      setConversations(conversationsData);
      
      if (conversationsData.length > 0 && !selectedConversation) {
        setSelectedConversation(conversationsData[0]);
        fetchMessages(conversationsData[0].other_user.id);
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
      const response = await api.getConversation(userId);
      setMessages(response.messages || []);
      
      // Mark conversation as read
      await api.markConversationAsRead(userId);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      showToast('Failed to load messages', 'error');
    }
  };

  const handleNewMessage = (message) => {
    if (selectedConversation && message.sender_id === selectedConversation.other_user.id) {
      setMessages(prev => [...prev, message]);
    }
    // Update conversation list
    fetchConversations();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    try {
      setSending(true);
      const response = await api.sendMessage(selectedConversation.other_user.id, newMessage.trim());
      
      if (response.success) {
        setMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
        
        // Update conversation in list
        setConversations(prev => prev.map(conv => 
          conv.other_user.id === selectedConversation.other_user.id 
            ? { ...conv, last_message: newMessage.trim(), last_message_time: new Date().toISOString() }
            : conv
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message', 'error');
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
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

  if (loading) {
    return <Loading message="Loading messages..." fullScreen={false} />;
  }

  return (
    <div className="flex h-[600px] bg-gray-800 rounded-xl overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold mb-3">Messages</h2>
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
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.other_user.id}
                onClick={() => {
                  setSelectedConversation(conversation);
                  fetchMessages(conversation.other_user.id);
                }}
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
                      <h4 className="font-medium truncate">{conversation.other_user.name}</h4>
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
                    <h3 className="font-semibold">{selectedConversation.other_user.name}</h3>
                    <p className="text-sm text-gray-400">Guest</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" icon={<Phone className="w-4 h-4" />}>
                    Call
                  </Button>
                  <Button size="sm" variant="outline" icon={<Mail className="w-4 h-4" />}>
                    Email
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                  <p>No messages in this conversation</p>
                  <p className="text-sm">Start the conversation below</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_from_host ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.is_from_host
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-end space-x-1 mt-1 ${
                        message.is_from_host ? 'text-purple-200' : 'text-gray-400'
                      }`}>
                        <span className="text-xs">{formatTime(message.created_at)}</span>
                        {message.is_from_host && getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-750">
              <div className="flex space-x-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                  rows="2"
                />
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
  );
};

export default MessagesTab;