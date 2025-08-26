// src/components/auth/GoogleAuthButton.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GoogleAuthButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
          }
        );
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    
    try {
      const result = await loginWithGoogle(response.credential);
      if (result.success) {
        navigate('/');
      }
    } catch (error) {
      console.error('Google login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div 
        id="google-signin-button"
        className={`w-full ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      />
      {isLoading && (
        <div className="mt-2 text-center text-sm text-gray-400">
          Signing in with Google...
        </div>
      )}
    </div>
  );
};

export default GoogleAuthButton;