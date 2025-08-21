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
  const { socket, connectSocket, disconnectSocket } = useApp();
  return { socket, connectSocket, disconnectSocket };
};

export const AppProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toast, setToast] = useState(null);

  const connectSocket = (userId) => {
    if (socket) return;

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('register', userId);
    });

    newSocket.on('userOnline', (userId) => {
      setOnlineUsers(prev => [...prev, userId]);
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
      // Force logout
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    });

    newSocket.on('unbanned', (data) => {
      showToast(data.message, 'success');
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    }
  };

  const showToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToast(newToast);
    
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const dismissToast = () => {
    setToast(null);
  };

  const sendMessage = (receiverId, message) => {
    if (socket) {
      socket.emit('sendMessage', { to: receiverId, message });
    }
  };

  const markMessagesAsRead = () => {
    setUnreadMessages(0);
  };

  const value = {
    socket,
    connectSocket,
    disconnectSocket,
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