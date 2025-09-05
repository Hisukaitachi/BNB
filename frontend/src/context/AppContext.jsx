// frontend/src/context/AppContext.jsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const useSocket = () => {
  const context = useContext(AppContext);
  // FIX: Return empty object if context not available
  if (!context) {
    return { socket: null, connectSocket: () => {}, disconnectSocket: () => {} };
  }
  const { socket, connectSocket, disconnectSocket } = context;
  return { socket, connectSocket, disconnectSocket };
};

export const AppProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toast, setToast] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

// Replace your connectSocket function with this corrected version:
const connectSocket = (userId) => {
  if (socket) return;

  try {
    setConnectionStatus('connecting');
    
    const newSocket = io('http://localhost:5000', { // Hardcode for now
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // IMPORTANT: Store userId on socket for backend use
    newSocket.userId = userId;

    newSocket.on('connect', () => {
      console.log('Connected to socket server with userId:', userId);
      setConnectionStatus('connected');
      newSocket.emit('register', userId);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
      showToast('Unable to connect to real-time server. Calling may not work.', 'warning');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setConnectionStatus('disconnected');
    });

    // Your existing event handlers...
    newSocket.on('userOnline', (userId) => {
      setOnlineUsers(prev => [...prev.filter(id => id !== userId), userId]);
    });

    newSocket.on('userOffline', (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    newSocket.on('receiveMessage', (message) => {
      setUnreadMessages(prev => prev + 1);
      showToast('New message received', 'info');
    });

    newSocket.on('newNotification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      showToast(notification.message, 'info');
    });

    newSocket.on('banned', (data) => {
      showToast(data.message, 'error');
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 3000);
    });

    newSocket.on('unbanned', (data) => {
      showToast(data.message, 'success');
    });

    setSocket(newSocket);
  } catch (error) {
    console.error('Failed to connect socket:', error);
    setConnectionStatus('error');
  }
};

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
      setConnectionStatus('disconnected');
    }
  };

  const showToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToast(newToast);
    
    // FIX: Clear previous timeout if exists
    if (window.toastTimeout) {
      clearTimeout(window.toastTimeout);
    }
    
    window.toastTimeout = setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const dismissToast = () => {
    if (window.toastTimeout) {
      clearTimeout(window.toastTimeout);
    }
    setToast(null);
  };

  const sendMessage = (receiverId, message) => {
    if (socket && connectionStatus === 'connected') {
      socket.emit('sendMessage', { to: receiverId, message });
    } else {
      console.warn('Socket not connected, cannot send real-time message');
    }
  };

  const markMessagesAsRead = () => {
    setUnreadMessages(0);
  };

  // FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
      }
    };
  }, []);

  const value = {
    socket,
    connectSocket,
    disconnectSocket,
    connectionStatus,
    onlineUsers,
    notifications,
    setNotifications,
    unreadMessages,
    setUnreadMessages,
    markMessagesAsRead,
    sendMessage,
    toast,
    showToast,
    dismissToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};