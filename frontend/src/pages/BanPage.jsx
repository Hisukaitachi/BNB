// frontend/src/components/BanPage.jsx
import React, { useEffect, useState } from 'react';
import { Shield, Mail, Phone, Clock, AlertTriangle, LogOut } from 'lucide-react';
import Button from '../components/ui/Button';

const BanPage = () => {
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [showRedirect, setShowRedirect] = useState(false);
  const [banMessage, setBanMessage] = useState('');

  useEffect(() => {
    // Get ban message from localStorage if available
    const storedMessage = localStorage.getItem('banMessage');
    setBanMessage(storedMessage || 'Your account has been banned by an administrator.');
    
    // Clear ALL user data to ensure complete logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('banMessage');
    sessionStorage.clear(); // Clear session storage too
    
    // Start countdown for redirect
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setShowRedirect(true);
          clearInterval(timer);
          // Redirect to login page
          setTimeout(() => {
            window.location.href = 'auth/login';
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGoToLogin = () => {
    // Complete logout and redirect
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'auth/login';
  };

  const handleContactSupport = () => {
    // You can customize this based on your support system
    window.open('mailto:support@yourapp.com?subject=Account Ban Appeal&body=I believe my account was banned in error. Please review my account status.', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Ban Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-red-500/20 overflow-hidden">
          {/* Header */}
          <div className="bg-red-600 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Account Suspended</h1>
                <p className="text-red-100 text-sm">Access Restricted</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Alert Message */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-red-400 font-medium mb-1">Account Banned</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {banMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-300">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm">
                  Suspended on: {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">What happens now?</h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• You have been automatically logged out</li>
                  <li>• Your account access has been suspended</li>
                  <li>• All active sessions have been terminated</li>
                  <li>• Contact support if you believe this is an error</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={handleGoToLogin}
                  variant="gradient"
                  className="bg-blue-600 hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Go to Login</span>
                </Button>
                
                <Button
                  onClick={handleContactSupport}
                  variant="outline"
                  className="border-gray-500 text-gray-400 hover:bg-gray-700 hover:text-white flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Appeal Ban</span>
                </Button>
              </div>
            </div>

            {/* Auto-Redirect Notice */}
            <div className="border-t border-gray-700 pt-4">
              {!showRedirect ? (
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-3">
                    Automatically redirecting to login in:
                  </p>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-700 rounded-full mb-3">
                    <span className="text-white font-bold text-lg">{timeRemaining}</span>
                  </div>
                  <div>
                    <button
                      onClick={handleGoToLogin}
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      Skip waiting
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-blue-400 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span className="text-sm">Redirecting to login...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-xs">
            For questions about our terms of service, visit our 
            <a href="/terms" className="text-blue-400 hover:text-blue-300 ml-1">Help Center</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BanPage;