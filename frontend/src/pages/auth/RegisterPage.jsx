// Quick debug version - add console logs and better error handling
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('register');
  const [verificationCode, setVerificationCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (error) clearError();
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!termsAccepted) {
      newErrors.terms = 'Please accept the Terms of Service and Privacy Policy';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Form submitted with data:', formData);
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      console.log('❌ Form validation failed:', formErrors);
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    console.log('📡 Starting registration...');
    
    try {
      // Direct API call instead of using AuthContext for debugging
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        })
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📡 Response data:', data);

      if (response.ok) {
        console.log('✅ Registration successful, moving to verification');
        setStep('verify');
        setErrors({});
      } else {
        console.log('❌ Registration failed:', data.message);
        setErrors({ general: data.message || 'Registration failed' });
      }
      
    } catch (err) {
      console.error('💥 Registration error:', err);
      setErrors({ general: `Connection failed: ${err.message}. Is your backend running?` });
    } finally {
      setIsLoading(false);
      console.log('🏁 Registration process completed');
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ verification: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/users/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/auth/login', { 
          state: { 
            message: 'Account verified successfully! Please log in.',
            email: formData.email
          } 
        });
      } else {
        setErrors({ verification: data.message || 'Verification failed' });
      }
    } catch (err) {
      setErrors({ verification: 'Verification failed. Please check your connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Verification Step UI
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link to="/" className="inline-block">
              <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                STAY
              </span>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-white">
              Verify your email
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              We sent a verification code to <strong className="text-white">{formData.email}</strong>
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-600">
            <form className="space-y-6" onSubmit={handleVerification}>
              <div>
                <Input
                  label="Verification Code"
                  name="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 6) {
                      setVerificationCode(value);
                      if (errors.verification) {
                        setErrors(prev => ({ ...prev, verification: '' }));
                      }
                    }
                  }}
                  error={errors.verification}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                loading={isLoading}
                disabled={verificationCode.length !== 6}
                className="w-full"
              >
                Verify Account
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-purple-400 hover:text-purple-300 text-xs"
                  onClick={() => setStep('register')}
                >
                  ← Back to registration
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Registration Step UI
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              STAY
            </span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Join thousands of travelers discovering unique stays
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-600">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {(error || errors.general) && (
              <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-sm">
                {errors.general || error}
              </div>
            )}

            <div className="relative">
              <Input
                label="Full Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Enter your full name"
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <User className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            </div>

            <div className="relative">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="Enter your email"
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <Mail className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            </div>

            <div className="relative">
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="Create a password"
                className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <Lock className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <Lock className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (errors.terms) {
                    setErrors(prev => ({ ...prev, terms: '' }));
                  }
                }}
                className="h-4 w-4 text-purple-400 focus:ring-purple-400 border-gray-600 bg-gray-700 rounded mt-0.5"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
                I agree to the{' '}
                <Link to="/terms" className="text-purple-400 hover:text-purple-300">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-purple-400 hover:text-purple-300">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.terms && (
              <p className="text-red-400 text-xs mt-1">{errors.terms}</p>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              Create Account
            </Button>

            {/* Debug info */}
            <div className="text-xs text-gray-500 text-center">
              Debug: Check browser console for detailed logs
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300">
              Already have an account?{' '}
              <Link
                to="/auth/login"
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;