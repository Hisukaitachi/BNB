import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';

const EmailVerificationPage = () => {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useApp();
  
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }

    // Countdown for resend button
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend, email, navigate]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ✅ Uses your backend endpoint: POST /api/users/verify-email
      const response = await api.post('/users/verify-email', {
        email,
        code
      });

      if (response.status === 'success') {
        setIsVerified(true);
        showToast('Email verified successfully!', 'success');
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    
    try {
      // Resend by calling register again - your backend handles this
      const response = await api.post('/users/register', { 
        email,
        name: 'temp', // Backend needs name but this is just for resend
        password: 'temp123!', // Backend needs password but this is just for resend
        resend: true 
      });
      
      if (response.status === 'success') {
        showToast('Verification code resent!', 'success');
        setCanResend(false);
        setCountdown(60);
        setVerificationCode(['', '', '', '', '', '']);
      } else {
        setError('Failed to resend code');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <Logo size="large" className="mx-auto mb-6" />
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-8">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-gray-300 mb-4">
              Your email has been successfully verified. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link 
            to="/register" 
            className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Register
          </Link>
          
          <Logo size="large" className="mx-auto mb-6" />
          <div className="mx-auto h-12 w-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
            <Mail className="h-6 w-6 text-purple-400" />
          </div>
          
          <h2 className="text-3xl font-bold text-white">
            Verify your email
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            We sent a 6-digit verification code to
          </p>
          <p className="text-sm font-medium text-white">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
              Enter verification code
            </label>
            <div className="flex justify-center space-x-2">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-lg font-semibold bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={verificationCode.join('').length !== 6}
            className="w-full"
            size="lg"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Didn't receive the code?
            </p>
            {canResend ? (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="mt-2 text-sm text-purple-400 hover:text-purple-300 font-medium"
              >
                Resend code
              </button>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Resend in {countdown}s
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
