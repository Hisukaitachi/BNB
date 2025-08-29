// src/components/messaging/MessagesPage.jsx - Complete messaging with media support
import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, Paperclip, Image, X, User } from 'lucide-react';
import messageService from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/AppContext';
import Button from '../../components/ui/Button';

const MessagesPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadConversations();
    
    if (socket) {
      socket.on('receiveMessage', handleNewMessage);
      socket.on('updateInbox', loadConversations);
      
      return () => {
        socket.off('receiveMessage', handleNewMessage);
        socket.off('updateInbox', loadConversations);
      };
    }
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await messageService.getInbox();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (otherUserId) => {
    try {
      const data = await messageService.getConversation(otherUserId);
      setMessages(data.messages.map(msg => messageService.formatMessage(msg, user.id)));
      setActiveConversation(data.otherUser);
      
      // Mark conversation as read
      await messageService.markConversationAsRead(otherUserId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewMessage = (message) => {
    if (activeConversation && 
        (message.sender_id === activeConversation.id || message.sender_id === user.id)) {
      const formattedMessage = messageService.formatMessage(message, user.id);
      setMessages(prev => [...prev, formattedMessage]);
    }
    loadConversations(); // Update conversation list
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !mediaFile) return;
    if (!activeConversation) return;

    try {
      setSending(true);
      
      await messageService.sendMessage(
        activeConversation.id,
        newMessage.trim(),
        mediaFile
      );
      
      setNewMessage('');
      setMediaFile(null);
      setMediaPreview(null);
      
      // Refresh conversation
      await loadConversation(activeConversation.id);
    } catch (error) {
      alert('Failed to send message: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = messageService.validateMediaFile ? 
      messageService.validateMediaFile(file) : { isValid: true };
      
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setMediaFile(file);
    
    // Create preview for images/videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeMediaFile = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const initiateCall = async (callType) => {
    try {
      await messageService.initiateCall(activeConversation.id, callType);
      alert(`${callType} call initiated! (Feature coming soon)`);
    } catch (error) {
      alert('Call failed: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="flex h-[calc(100vh-200px)] bg-gray-800 rounded-xl overflow-hidden">
          
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Messages</h2>
            </div>
            
            <div className="overflow-y-auto h-full">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.other_user_id}
                    onClick={() => loadConversation(conv.other_user_id)}
                    className={`p-4 cursor-pointer hover:bg-gray-700 transition ${
                      activeConversation?.id === conv.other_user_id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="text-white font-medium truncate">
                            {conv.other_user_name}
                          </h3>
                          <span className="text-xs text-gray-400">{conv.timeAgo}</span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          {conv.lastMessagePreview}
                        </p>
                      </div>
                      {conv.isUnread && (
                        <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-medium">{activeConversation.name}</h3>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => initiateCall('audio')}
                      className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => initiateCall('video')}
                      className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isSender
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        {message.hasMedia && (
                          <div className="mb-2">
                            {message.image_url && (
                              <img
                                src={message.image_url}
                                alt="Shared image"
                                className="max-w-full h-auto rounded"
                              />
                            )}
                            {message.video_url && (
                              <video
                                src={message.video_url}
                                controls
                                className="max-w-full h-auto rounded"
                              />
                            )}
                          </div>
                        )}
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timeFormatted}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Media Preview */}
                {mediaPreview && (
                  <div className="p-4 border-t border-gray-700">
                    <div className="relative inline-block">
                      {mediaFile?.type.startsWith('image/') ? (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="max-w-32 h-auto rounded"
                        />
                      ) : (
                        <video
                          src={mediaPreview}
                          className="max-w-32 h-auto rounded"
                        />
                      )}
                      <button
                        onClick={removeMediaFile}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t border-gray-700">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
                      >
                        <Image className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                      maxLength={1000}
                    />
                    
                    <Button
                      type="submit"
                      variant="gradient"
                      loading={sending}
                      disabled={!newMessage.trim() && !mediaFile}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;