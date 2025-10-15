// frontend/src/pages/payment/PaymentPage.jsx - UPDATED WITH PAYMENT SERVICE
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard, Smartphone, ArrowLeft, User, Mail, Phone, Calendar,
  MapPin, Camera, X, Check, AlertCircle, Shield, Loader
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { userAPI, bookingAPI } from '../../services/api';
import paymentService from '../../services/paymentService'; // ✅ Use payment service

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const { bookingId } = location.state || {};
  const [bookingData, setBookingData] = useState(location.state || {});

  // Customer Information State
  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    city: '',
    postalCode: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // ID Upload State
  const [idFiles, setIdFiles] = useState({
    front: null,
    back: null
  });
  const [idPreviews, setIdPreviews] = useState({
    front: null,
    back: null
  });
  const [idType, setIdType] = useState('drivers_license');
  
  // Validation State
  const [validationErrors, setValidationErrors] = useState({});
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      navigate('/my-bookings');
      return;
    }
    
    fetchUserProfile();
    
    if (!location.state?.booking) {
      fetchBookingData();
    }
  }, [bookingId]);

  useEffect(() => {
    return () => {
      if (idPreviews.front) URL.revokeObjectURL(idPreviews.front);
      if (idPreviews.back) URL.revokeObjectURL(idPreviews.back);
    };
  }, [idPreviews]);

  const fetchBookingData = async () => {
    try {
      const response = await bookingAPI.getMyBookings();
      const bookings = response.data?.data?.bookings || [];
      const currentBooking = bookings.find(b => b.id === parseInt(bookingId));
      
      if (currentBooking) {
        setBookingData({
          booking: {
            id: currentBooking.id,
            title: currentBooking.title,
            totalPrice: currentBooking.total_price,
            bookingType: currentBooking.booking_type,
            amountCharged: currentBooking.booking_type === 'reserve' 
              ? Math.round(currentBooking.total_price * 0.5)
              : currentBooking.total_price,
            isDepositPayment: currentBooking.booking_type === 'reserve',
            dates: `${new Date(currentBooking.start_date).toLocaleDateString()} - ${new Date(currentBooking.end_date).toLocaleDateString()}`
          }
        });
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const userData = response.data.data.user;
      
      setCustomerInfo(prev => ({
        ...prev,
        fullName: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.location || ''
      }));
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleIdUpload = (e, side) => {
    const file = e.target.files[0];
    
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, or WebP)');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setIdFiles(prev => ({
        ...prev,
        [side]: file
      }));

      const previewUrl = URL.createObjectURL(file);
      setIdPreviews(prev => {
        if (prev[side]) {
          URL.revokeObjectURL(prev[side]);
        }
        return {
          ...prev,
          [side]: previewUrl
        };
      });

      setError('');
    }
  };

  const removeIdFile = (side) => {
    setIdFiles(prev => ({
      ...prev,
      [side]: null
    }));
    
    if (idPreviews[side]) {
      URL.revokeObjectURL(idPreviews[side]);
    }
    
    setIdPreviews(prev => ({
      ...prev,
      [side]: null
    }));
  };

  const validateCustomerInfo = () => {
    const errors = {};
    
    if (!customerInfo.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!customerInfo.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!customerInfo.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\+]?[0-9]{10,15}$/.test(customerInfo.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (!customerInfo.birthDate) {
      errors.birthDate = 'Birth date is required';
    } else {
      const age = new Date().getFullYear() - new Date(customerInfo.birthDate).getFullYear();
      if (age < 18) {
        errors.birthDate = 'You must be at least 18 years old';
      }
    }
    
    if (!customerInfo.address.trim()) {
      errors.address = 'Address is required';
    }
    
    if (!customerInfo.city.trim()) {
      errors.city = 'City is required';
    }
    
    if (!idFiles.front) {
      errors.idFront = 'Please upload the front of your ID';
    }
    
    if (idType !== 'passport' && !idFiles.back) {
      errors.idBack = 'Please upload the back of your ID';
    }
    
    if (!agreeToTerms) {
      errors.terms = 'You must agree to the terms and conditions';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueToPayment = async () => {
    if (!validateCustomerInfo()) {
      setError('Please fill in all required fields correctly');
      return;
    }

    setSavingInfo(true);
    setError('');

    try {
      const formData = new FormData();
      
      Object.keys(customerInfo).forEach(key => {
        formData.append(key, customerInfo[key]);
      });
      
      formData.append('idType', idType);
      formData.append('country', 'Philippines');
      
      if (idFiles.front) {
        formData.append('images', idFiles.front);
      }
      if (idFiles.back) {
        formData.append('images', idFiles.back);
      }

      console.log('📤 Sending customer info to backend...');
      
      await bookingAPI.updateCustomerInfo(bookingId, formData);
      
      console.log('✅ Customer information saved');
      setCurrentStep(2);
      
    } catch (err) {
      console.error('❌ Error saving customer info:', err);
      setError(err.response?.data?.message || 'Failed to save customer information');
    } finally {
      setSavingInfo(false);
    }
  };

  // ✅ UPDATED: Use payment service instead of direct API
  const handlePayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('💳 Initiating payment for booking:', bookingId);
      
      // Use payment service - it will auto-redirect
      await paymentService.initiatePayment(bookingId);
      
      // Note: User will be redirected before this line executes
      
    } catch (err) {
      console.error('❌ Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
            ${currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
          </div>
          <span className={`ml-2 hidden sm:inline ${currentStep >= 1 ? 'text-white' : 'text-gray-400'}`}>
            Customer Info
          </span>
        </div>
        
        <div className={`w-20 h-1 ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-700'}`} />
        
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
            ${currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            2
          </div>
          <span className={`ml-2 hidden sm:inline ${currentStep >= 2 ? 'text-white' : 'text-gray-400'}`}>
            Payment
          </span>
        </div>
      </div>
    </div>
  );

  // Customer Info Form (keeping your existing implementation)
  const renderCustomerInfoStep = () => (
    <div className="bg-gray-800 rounded-xl p-8">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <User className="w-6 h-6 mr-2 text-purple-500" />
        Customer Information
      </h2>

      <p className="text-gray-400 text-sm mb-6">
        Please provide your information so the host knows who to expect.
      </p>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Personal Details */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={customerInfo.fullName}
              onChange={handleCustomerInfoChange}
              className={`w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none
                ${validationErrors.fullName ? 'border border-red-500' : ''}`}
              placeholder="Juan Dela Cruz"
            />
            {validationErrors.fullName && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Email *</label>
            <input
              type="email"
              name="email"
              value={customerInfo.email}
              onChange={handleCustomerInfoChange}
              className={`w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none
                ${validationErrors.email ? 'border border-red-500' : ''}`}
              placeholder="juan@example.com"
            />
            {validationErrors.email && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={customerInfo.phone}
              onChange={handleCustomerInfoChange}
              className={`w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none
                ${validationErrors.phone ? 'border border-red-500' : ''}`}
              placeholder="09171234567"
            />
            {validationErrors.phone && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Birth Date *</label>
            <input
              type="date"
              name="birthDate"
              value={customerInfo.birthDate}
              onChange={handleCustomerInfoChange}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              className={`w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none
                ${validationErrors.birthDate ? 'border border-red-500' : ''}`}
            />
            {validationErrors.birthDate && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.birthDate}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-gray-400 text-sm mb-2">Street Address *</label>
            <input
              type="text"
              name="address"
              value={customerInfo.address}
              onChange={handleCustomerInfoChange}
              className={`w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none
                ${validationErrors.address ? 'border border-red-500' : ''}`}
              placeholder="123 Main Street, Barangay"
            />
            {validationErrors.address && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">City *</label>
            <input
              type="text"
              name="city"
              value={customerInfo.city}
              onChange={handleCustomerInfoChange}
              className={`w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none
                ${validationErrors.city ? 'border border-red-500' : ''}`}
              placeholder="Cebu City"
            />
            {validationErrors.city && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Postal Code</label>
            <input
              type="text"
              name="postalCode"
              value={customerInfo.postalCode}
              onChange={handleCustomerInfoChange}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="6000"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Emergency Contact (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Contact Name</label>
            <input
              type="text"
              name="emergencyContact"
              value={customerInfo.emergencyContact}
              onChange={handleCustomerInfoChange}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Maria Dela Cruz"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Contact Phone</label>
            <input
              type="tel"
              name="emergencyPhone"
              value={customerInfo.emergencyPhone}
              onChange={handleCustomerInfoChange}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="09181234567"
            />
          </div>
        </div>
      </div>

      {/* ID Verification */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">ID Verification</h3>
        
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">ID Type *</label>
          <select
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value="drivers_license">Driver's License</option>
            <option value="passport">Passport</option>
            <option value="national_id">National ID</option>
            <option value="voters_id">Voter's ID</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Front */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              {idType === 'passport' ? 'ID Page' : 'Front of ID'} *
            </label>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center
              ${validationErrors.idFront ? 'border-red-500' : 'border-gray-600'}
              ${idPreviews.front ? 'border-purple-500' : ''}`}>
              {idPreviews.front ? (
                <div className="relative">
                  <img src={idPreviews.front} alt="ID Front" className="w-full h-32 object-cover rounded"/>
                  <button
                    type="button"
                    onClick={() => removeIdFile('front')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIdUpload(e, 'front')}
                    className="hidden"
                  />
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Click to upload</p>
                  <p className="text-gray-500 text-xs mt-1">JPEG, PNG up to 5MB</p>
                </label>
              )}
            </div>
            {validationErrors.idFront && (
              <p className="text-red-400 text-xs mt-1">{validationErrors.idFront}</p>
            )}
          </div>

          {/* Back */}
          {idType !== 'passport' && (
            <div>
              <label className="block text-gray-400 text-sm mb-2">Back of ID *</label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center
                ${validationErrors.idBack ? 'border-red-500' : 'border-gray-600'}
                ${idPreviews.back ? 'border-purple-500' : ''}`}>
                {idPreviews.back ? (
                  <div className="relative">
                    <img src={idPreviews.back} alt="ID Back" className="w-full h-32 object-cover rounded"/>
                    <button
                      type="button"
                      onClick={() => removeIdFile('back')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleIdUpload(e, 'back')}
                      className="hidden"
                    />
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Click to upload</p>
                    <p className="text-gray-500 text-xs mt-1">JPEG, PNG up to 5MB</p>
                  </label>
                )}
              </div>
              {validationErrors.idBack && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.idBack}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Terms */}
      <div className="mb-6">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="mt-1 w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
          />
          <span className="text-gray-300 text-sm">
            I agree that all information provided is accurate and I consent to share this with the property host *
          </span>
        </label>
        {validationErrors.terms && (
          <p className="text-red-400 text-xs mt-1 ml-8">{validationErrors.terms}</p>
        )}
      </div>

      <Button
        onClick={handleContinueToPayment}
        loading={savingInfo}
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={savingInfo}
      >
        {savingInfo ? 'Saving...' : 'Continue to Payment'}
      </Button>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400 flex items-center justify-center">
          <Shield className="w-4 h-4 mr-1" />
          Your information is encrypted and secure
        </p>
      </div>
    </div>
  );

  // Payment Step
  const renderPaymentStep = () => {
    const booking = bookingData?.booking || {};
    const amountToPay = booking.amountCharged || 0;

    return (
      <div className="bg-gray-800 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Complete Payment</h2>
        
        <button
          onClick={() => setCurrentStep(1)}
          className="text-purple-400 hover:text-purple-300 mb-4 text-sm flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Edit Customer Information
        </button>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Customer Info Summary */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Customer Information</h4>
          <div className="text-white">
            <p className="font-medium">{customerInfo.fullName}</p>
            <p className="text-sm text-gray-300">{customerInfo.email}</p>
            <p className="text-sm text-gray-300">{customerInfo.phone}</p>
            <p className="text-sm text-gray-300">{customerInfo.address}, {customerInfo.city}</p>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Booking Details</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Booking ID</span>
              <span>#{bookingId}</span>
            </div>
            {booking.title && (
              <div className="flex justify-between text-gray-300">
                <span>Property</span>
                <span>{booking.title}</span>
              </div>
            )}
            {booking.dates && (
              <div className="flex justify-between text-gray-300">
                <span>Dates</span>
                <span>{booking.dates}</span>
              </div>
            )}
            {booking.bookingType === 'reserve' && (
              <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500 rounded-lg">
                <p className="text-purple-400 text-sm font-medium">
                  📦 Reservation - Paying 50% deposit
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-white mb-4">Payment Summary</h4>
          
          <div className="space-y-2">
            {booking.bookingType === 'reserve' ? (
              <>
                <div className="flex justify-between text-gray-300">
                  <span>Total Amount</span>
                  <span>₱{booking.totalPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-purple-400 font-medium">
                  <span>Deposit (50%)</span>
                  <span>₱{amountToPay.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between text-white font-semibold">
                    <span>Pay Now</span>
                    <span className="text-xl">₱{amountToPay.toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-gray-300">
                  <span>Booking Amount</span>
                  <span>₱{amountToPay.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between text-white font-semibold">
                    <span>Total to Pay</span>
                    <span className="text-xl">₱{amountToPay.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Available Payment Methods</h3>
          
          <div className="space-y-3">
            <div className="flex items-center p-4 border border-gray-600 rounded-lg">
              <Smartphone className="w-6 h-6 text-blue-500 mr-3" />
              <div>
                <div className="text-white font-medium">GCash</div>
                <div className="text-sm text-gray-400">Pay with GCash</div>
              </div>
            </div>

            <div className="flex items-center p-4 border border-gray-600 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-500 mr-3" />
              <div>
                <div className="text-white font-medium">Credit/Debit Card</div>
                <div className="text-sm text-gray-400">Visa, Mastercard, JCB</div>
              </div>
            </div>

            <div className="flex items-center p-4 border border-gray-600 rounded-lg">
              <Smartphone className="w-6 h-6 text-green-500 mr-3" />
              <div>
                <div className="text-white font-medium">GrabPay</div>
                <div className="text-sm text-gray-400">Pay with GrabPay</div>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handlePayment}
          loading={loading}
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              Redirecting to PayMongo...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Pay ₱{amountToPay.toLocaleString()}
            </>
          )}
        </Button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400 flex items-center justify-center">
            <Shield className="w-4 h-4 mr-1" />
            Secure payment powered by PayMongo
          </p>
        </div>
      </div>
    );
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Payment Request</h2>
          <Button onClick={() => navigate('/my-bookings')} variant="gradient">
            Go to My Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-300 hover:text-white mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <StepIndicator />

          {currentStep === 1 ? renderCustomerInfoStep() : renderPaymentStep()}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;