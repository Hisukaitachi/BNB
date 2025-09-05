// src/components/messaging/MessagesPage.jsx - COMPLETE WITH ALL FEATURES
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { 
  Send, Phone, Video, Paperclip, Image, X, User, Search, 
  MoreVertical, ArrowLeft, Smile, Check, CheckCheck, 
  Clock, MessageCircle, Users, Settings, Play, Download,
  FileText, Trash2, Copy
} from 'lucide-react';
import messageService from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/AppContext';
import { messageAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import CallModal from '../../components/messaging/CallModal';

// Simple Emoji Picker Component
const EmojiPicker = ({ isOpen, onEmojiSelect, onClose }) => {
  const commonEmojis = [
    '😊', '😂', '😍', '🥺', '😭', '😴', '🤔', '😎',
    '❤️', '💕', '💖', '💙', '💚', '💛', '🧡', '💜',
    '👍', '👎', '👌', '🙌', '👏', '🤝', '💪', '🙏',
    '🔥', '✨', '⭐', '🎉', '🎊', '💯', '✅', '❌',
    '🏠', '🏡', '🏢', '🏨', '🏠', '🗝️', '💰', '📍'
  ];

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-12 right-0 bg-gray-700 border border-gray-600 rounded-lg shadow-lg p-3 w-64 z-10">
      <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
        {commonEmojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
            className="p-2 hover:bg-gray-600 rounded text-lg"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

// Message Search Modal Component
const MessageSearchModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim() || query.length < 2) return;
    
    try {
      setSearching(true);
      const response = await messageAPI.searchMessages(query);
      setSearchResults(response.data.data.messages);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch(searchQuery);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Search Messages</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {searching && searchResults.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery.trim().length < 2 ? 
                'Type at least 2 characters to search' : 
                'No messages found'
              }
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-purple-400 font-medium">
                      {result.other_user_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(result.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-white text-sm">{result.message}</p>
                  {result.media_count > 0 && (
                    <div className="mt-2 text-xs text-gray-400">
                      📎 {result.media_count} file{result.media_count > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Message Context Menu Component
const MessageContextMenu = ({ message, onDelete, onClose, position }) => {
  if (!position) return null;

  return (
    <div 
      className="fixed bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-2 z-50"
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={() => {
          navigator.clipboard.writeText(message.message || 'Media message');
          onClose();
        }}
        className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-600 flex items-center"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy Text
      </button>
      
      {message.isSender && (
        <button
          onClick={() => {
            onDelete(message.id);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-600 flex items-center"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Message
        </button>
      )}
    </div>
  );
};

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
  
  // Media file states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // New feature states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, position: null, message: null });
  
  // Call modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [currentCall, setCurrentCall] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, position: null, message: null });
      }
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible, showEmojiPicker]);

  // Initialize socket service and handle URL params
  useEffect(() => {
    if (user && !socket) {
      connectSocket(user.id);
    }

    if (socket) {
      messageService.setSocket(socket);
    }

    loadConversations();
    
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
        loadConversations();
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

  // Only scroll to bottom when message count changes
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages.length]);

  const handleDirectUserMessage = async (userId, initialMsg) => {
    try {
      console.log('Direct message to user:', userId, initialMsg);
      if (initialMsg) {
        setNewMessage(decodeURIComponent(initialMsg));
      }
      
      await loadConversation(userId);
      setShowMobileChat(true);
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
      
      await messageService.markConversationAsRead(otherUserId);
      
      setTimeout(() => {
        scrollToBottom();
      }, 200);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  const handleMessageRightClick = (e, message) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      message
    });
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      await messageAPI.deleteMessage(messageId);
      
      // Refresh conversation
      const data = await messageService.getConversation(activeConversation.id);
      setMessages(data.messages.map(msg => messageService.formatMessage(msg, user.id)));
    } catch (error) {
      alert('Failed to delete message: ' + error.message);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  // Enhanced file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const validFiles = [];
    const invalidFiles = [];
    let totalSize = 0;

    files.forEach(file => {
      const validation = messageService.validateMediaFile ? 
        messageService.validateMediaFile(file) : { isValid: true };
        
      if (validation.isValid) {
        validFiles.push(file);
        totalSize += file.size;
      } else {
        invalidFiles.push({ file, error: validation.error });
      }
    });

    const maxTotalSize = 200 * 1024 * 1024;
    if (totalSize > maxTotalSize) {
      alert(`Total file size cannot exceed 200MB. Current: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    if (invalidFiles.length > 0) {
      const errorMsg = invalidFiles.map(item => `${item.file.name}: ${item.error}`).join('\n');
      alert(`Some files were not added:\n${errorMsg}`);
    }

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 20));
    
    validFiles.forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, {
            file,
            url: e.target.result,
            type: file.type.startsWith('image/') ? 'image' : 'video'
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews(prev => [...prev, {
          file,
          url: null,
          type: 'file'
        }]);
      }
    });
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newMessage.trim() && selectedFiles.length === 0) {
      return;
    }
    
    if (!activeConversation) {
      alert('Please select a conversation first');
      return;
    }

    try {
      setSending(true);
      setUploadProgress(10);
      
      const result = await messageService.sendMessage(
        activeConversation.id,
        newMessage.trim(),
        selectedFiles
      );
      
      setUploadProgress(100);
      console.log('Message sent successfully:', result);
      
      setNewMessage('');
      clearAllFiles();
      
      messageService.stopTypingIndicator(activeConversation.id);
      
      const data = await messageService.getConversation(activeConversation.id);
      setMessages(data.messages.map(msg => messageService.formatMessage(msg, user.id)));
      
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message: ' + (error.response?.data?.message || error.message));
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (activeConversation) {
      messageService.sendTypingIndicator(activeConversation.id);
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        messageService.stopTypingIndicator(activeConversation.id);
      }, 1000);
    }
  };

  const initiateCall = async (callType) => {
  if (!activeConversation) {
    alert('Please select a conversation first');
    return;
  }

  try {
    // Check for media permissions first
    const constraints = {
      video: callType === 'video',
      audio: true
    };

    await navigator.mediaDevices.getUserMedia(constraints);
    
    // Set up call state
    setCurrentCall({
      type: callType,
      isIncoming: false,
      participantName: activeConversation.name,
      participantId: activeConversation.id
    });
    
    setShowCallModal(true);
    
    // Notify the other user via socket
    if (socket) {
      socket.emit('incoming-call', {
        to: activeConversation.id,
        from: user.id,
        callerName: user.name,
        callType
      });
    }

  } catch (error) {
    console.error('Call initiation error:', error);
    
    if (error.name === 'NotAllowedError') {
      alert('Camera/microphone access denied. Please enable permissions and try again.');
    } else if (error.name === 'NotFoundError') {
      alert('No camera/microphone found. Please connect a device and try again.');
    } else {
      alert('Failed to start call. Please check your camera/microphone settings.');
    }
  }
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

  const renderMediaFiles = (mediaFiles) => {
    if (!mediaFiles || mediaFiles.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {mediaFiles.map((media, index) => (
            <div key={index} className="relative group">
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={media.originalName}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                  onClick={() => window.open(media.url, '_blank')}
                />
              ) : media.type === 'video' ? (
                <div className="relative">
                  <video
                    src={media.url}
                    className="w-full h-32 object-cover rounded-lg"
                    controls
                  />
                  <Play className="absolute inset-0 m-auto w-8 h-8 text-white opacity-80 pointer-events-none" />
                </div>
              ) : (
                <div className="w-full h-32 bg-gray-600 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-300 truncate px-2">{media.originalName}</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => window.open(media.url, '_blank')}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
  if (socket) {
    const handleIncomingCall = (callData) => {
      // Show incoming call notification
      if (window.confirm(`Incoming ${callData.callType} call from ${callData.callerName}. Accept?`)) {
        setCurrentCall({
          type: callData.callType,
          isIncoming: true,
          participantName: callData.callerName,
          participantId: callData.from
        });
        setShowCallModal(true);
      } else {
        // Decline the call
        socket.emit('call-declined', { to: callData.from });
      }
    };

    socket.on('incoming-call', handleIncomingCall);
    
    return () => {
      socket.off('incoming-call', handleIncomingCall);
    };
  }
}, [socket, user]);

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
                <button 
                  onClick={() => setShowSearchModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
                >
                  <Search className="w-5 h-5" />
                </button>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    loadConversation(conv.other_user_id);
                  }}
                  className={`p-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                    activeConversation?.id === conv.other_user_id ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white font-semibold text-lg">
                          {conv.other_user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                    </div>
                    
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
        <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-900 overflow-hidden`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
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
                      onContextMenu={(e) => handleMessageRightClick(e, message)}
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
                          {message.message && (
                            <p className="text-sm leading-relaxed">{message.message}</p>
                          )}
                          
                          {message.media_files && renderMediaFiles(message.media_files)}
                          
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

              {/* File Previews */}
              {filePreviews.length > 0 && (
                <div className="p-4 bg-gray-800 border-t border-gray-700 max-h-32 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">
                      {filePreviews.length} file{filePreviews.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={clearAllFiles}
                      className="text-red-400 hover:text-red-300 text-sm flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {filePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        {preview.type === 'image' ? (
                          <img
                            src={preview.url}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : preview.type === 'video' ? (
                          <video
                            src={preview.url}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{uploadProgress}%</span>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                  <div className="flex space-x-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-gray-700 text-gray-300 transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-full hover:bg-gray-700 text-gray-300 transition-colors"
                    >
                      <Image className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      placeholder={selectedFiles.length > 0 ? "Add a caption..." : "Type a message..."}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                      maxLength={1000}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmojiPicker(!showEmojiPicker);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-600 text-gray-400 transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    
                    <EmojiPicker
                      isOpen={showEmojiPicker}
                      onEmojiSelect={handleEmojiSelect}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    variant="gradient"
                    loading={sending}
                    disabled={!newMessage.trim() && selectedFiles.length === 0}
                    className="p-3 rounded-full"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
                
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} ready to send`
                    : 'Send up to 20 images/videos per message • Right-click messages for options'
                  }
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
                  Now with unlimited photo and video sharing!
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCallModal && currentCall && (
  <CallModal
    isOpen={showCallModal}
    onClose={() => {
      setShowCallModal(false);
      setCurrentCall(null);
    }}
    callType={currentCall.type}
    isIncoming={currentCall.isIncoming}
    callerName={currentCall.participantName}
    receiverId={currentCall.participantId}
    socket={socket}
  />
)}
      <MessageSearchModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
      
      <MessageContextMenu
        message={contextMenu.message}
        onDelete={handleDeleteMessage}
        onClose={() => setContextMenu({ visible: false, position: null, message: null })}
        position={contextMenu.visible ? contextMenu.position : null}
      />
    </div>
  );
};

export default MessagesPage;