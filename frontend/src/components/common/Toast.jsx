// src/components/common/Toast.jsx
import React from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const Toast = () => {
  const { toast, dismissToast } = useApp();

  if (!toast) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: 'bg-green-500/90 border-green-400',
    error: 'bg-red-500/90 border-red-400',
    warning: 'bg-yellow-500/90 border-yellow-400',
    info: 'bg-blue-500/90 border-blue-400'
  };

  const Icon = icons[toast.type] || Info;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg border backdrop-blur-md text-white ${colors[toast.type]}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={dismissToast}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;