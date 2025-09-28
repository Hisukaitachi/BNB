// frontend/src/components/listings/ReservationSidebar.jsx
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, AlertCircle, Clock, Shield } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import reservationService from '../../services/reservationService';

const ReservationSidebar = ({ 
  listing, 
  reviews, 
  isAuthenticated,
  onReservation, 
  onContactHost, 
  onViewRequest,
  isReservationLoading = false
}) => {
  const [reservationData, setReservationData] = useState({
    checkInDate: '',
    checkOutDate: '',
    guests: 1,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    specialRequests: '',
    paymentMethod: 'deposit' // 'deposit' or 'full'
  });
  
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [availabilityStatus, setAvailabilityStatus] = useState({
    checking: false,
    available: null,
    message: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    calculatePricing();
    checkAvailability();
  }, [reservationData.checkInDate, reservationData.checkOutDate, listing]);

  const calculatePricing = () => {
    if (!listing || !reservationData.checkInDate || !reservationData.checkOutDate) {
      setPriceBreakdown(null);
      return;
    }

    const breakdown = reservationService.calculateReservationPrice(
      listing.price_per_night,
      reservationData.checkInDate,
      reservationData.checkOutDate
    );
    
    setPriceBreakdown(breakdown);
  };

  const checkAvailability = async () => {
    if (!listing || !reservationData.checkInDate || !reservationData.checkOutDate) {
      setAvailabilityStatus({ checking: false, available: null, message: '' });
      return;
    }

    setAvailabilityStatus({ checking: true, available: null, message: 'Checking availability...' });

    try {
      const isAvailable = await reservationService.checkAvailability(
        listing.id,
        reservationData.checkInDate,
        reservationData.checkOutDate
      );
      
      if (isAvailable) {
        setAvailabilityStatus({
          checking: false,
          available: true,
          message: '✅ Dates are available!'
        });
      } else {
        setAvailabilityStatus({
          checking: false,
          available: false,
          message: '❌ Selected dates are not available. Please choose different dates.'
        });
      }
    } catch (error) {
      setAvailabilityStatus({
        checking: false,
        available: null,
        message: '⚠️ Unable to check availability. Please try again.'
      });
    }
  };

  const handleInputChange = (field, value) => {
    setReservationData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!reservationData.checkInDate) {
      errors.checkInDate = 'Check-in date is required';
    }
    
    if (!reservationData.checkOutDate) {
      errors.checkOutDate = 'Check-out date is required';
    }
    
    if (!reservationData.guestName.trim()) {
      errors.guestName = 'Guest name is required';
    }
    
    if (!reservationData.guestEmail.trim()) {
      errors.guestEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservationData.guestEmail)) {
      errors.guestEmail = 'Please enter a valid email';
    }
    
    if (reservationData.guests < 1 || reservationData.guests > listing.max_guests) {
      errors.guests = `Guests must be between 1 and ${listing.max_guests}`;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReservationSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    if (!availabilityStatus.available) {
      alert('Please select available dates to continue');
      return;
    }

    const reservationPayload = {
      listing_id: listing.id,
      check_in_date: reservationData.checkInDate,
      check_out_date: reservationData.checkOutDate,
      guest_count: reservationData.guests,
      guest_name: reservationData.guestName,
      guest_email: reservationData.guestEmail,
      guest_phone: reservationData.guestPhone || '',
      special_requests: reservationData.specialRequests || '',
      total_amount: priceBreakdown.total,
      paymentMethod: reservationData.paymentMethod
    };

    onReservation(reservationPayload);
  };

  const canSubmitReservation = () => {
    return reservationData.checkInDate && 
           reservationData.checkOutDate && 
           reservationData.guestName &&
           reservationData.guestEmail &&
           availabilityStatus.available &&
           priceBreakdown?.total > 0;
  };

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24">
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          {/* Price Header */}
          <div className="mb-6">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white">
                ₱{Number(listing.price_per_night).toLocaleString()}
              </span>
              <span className="text-gray-400">/ night</span>
            </div>
            {listing.average_rating && (
              <div className="flex items-center mt-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                <span className="text-sm text-gray-300">
                  {Number(listing.average_rating).toFixed(1)} ({reviews.length} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Reservation Form */}
          <div className="space-y-4 mb-6">
            {/* Dates */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Select dates</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Check-in</label>
                  <Input
                    type="date"
                    value={reservationData.checkInDate}
                    onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                    className={`bg-white/10 border-gray-600 text-white ${
                      validationErrors.checkInDate ? 'border-red-500' : ''
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {validationErrors.checkInDate && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.checkInDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Check-out</label>
                  <Input
                    type="date"
                    value={reservationData.checkOutDate}
                    onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                    className={`bg-white/10 border-gray-600 text-white ${
                      validationErrors.checkOutDate ? 'border-red-500' : ''
                    }`}
                    min={reservationData.checkInDate || new Date().toISOString().split('T')[0]}
                  />
                  {validationErrors.checkOutDate && (
                    <p className="text-red-400 text-xs mt-1">{validationErrors.checkOutDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Guests */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Guests</label>
              <select
                value={reservationData.guests}
                onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                className={`w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 ${
                  validationErrors.guests ? 'border-red-500' : ''
                }`}
              >
                {Array.from({ length: listing.max_guests }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num} className="bg-gray-800">
                    {num} Guest{num > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              {validationErrors.guests && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.guests}</p>
              )}
            </div>

            {/* Guest Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Guest Information</h4>
              
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={reservationData.guestName}
                  onChange={(e) => handleInputChange('guestName', e.target.value)}
                  className={`bg-white/10 border-gray-600 text-white placeholder-gray-400 ${
                    validationErrors.guestName ? 'border-red-500' : ''
                  }`}
                />
                {validationErrors.guestName && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.guestName}</p>
                )}
              </div>
              
              <div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={reservationData.guestEmail}
                  onChange={(e) => handleInputChange('guestEmail', e.target.value)}
                  className={`bg-white/10 border-gray-600 text-white placeholder-gray-400 ${
                    validationErrors.guestEmail ? 'border-red-500' : ''
                  }`}
                />
                {validationErrors.guestEmail && (
                  <p className="text-red-400 text-xs mt-1">{validationErrors.guestEmail}</p>
                )}
              </div>
              
              <div>
                <Input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={reservationData.guestPhone}
                  onChange={(e) => handleInputChange('guestPhone', e.target.value)}
                  className="bg-white/10 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Payment Option</label>
              <div className="space-y-2">
                <label className="flex items-center p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="deposit"
                    checked={reservationData.paymentMethod === 'deposit'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="mr-3 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Pay 50% Now</span>
                      <Shield className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Pay remaining 50% before check-in
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="full"
                    checked={reservationData.paymentMethod === 'full'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="mr-3 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Pay Full Amount</span>
                      <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Complete payment now
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Special Requests (Optional)</label>
              <textarea
                placeholder="Any special requests or notes for the host..."
                value={reservationData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <div className="text-xs text-gray-400 mt-1 text-right">
                {reservationData.specialRequests.length}/500
              </div>
            </div>

            {/* Availability Status */}
            {(reservationData.checkInDate && reservationData.checkOutDate) && (
              <div className={`p-3 rounded-lg text-sm ${
                availabilityStatus.available === true ? 'bg-green-900/20 text-green-400 border border-green-600' :
                availabilityStatus.available === false ? 'bg-red-900/20 text-red-400 border border-red-600' :
                'bg-yellow-900/20 text-yellow-400 border border-yellow-600'
              }`}>
                {availabilityStatus.checking ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Checking availability...
                  </div>
                ) : (
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{availabilityStatus.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          {priceBreakdown && priceBreakdown.total > 0 && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Price Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>₱{Number(listing.price_per_night).toLocaleString()} x {priceBreakdown.nights} nights</span>
                  <span>₱{priceBreakdown.basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Service fee</span>
                  <span>₱{priceBreakdown.serviceFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Cleaning fee</span>
                  <span>₱{priceBreakdown.cleaningFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Taxes</span>
                  <span>₱{priceBreakdown.taxes.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="flex justify-between font-semibold text-white">
                    <span>Total</span>
                    <span>₱{priceBreakdown.total.toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Payment Schedule */}
                {reservationData.paymentMethod === 'deposit' && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Pay now (50%)</span>
                      <span className="font-medium text-purple-400">₱{priceBreakdown.depositAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-300 mt-1">
                      <span>Pay later (50%)</span>
                      <span>₱{priceBreakdown.remainingAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleReservationSubmit}
              loading={isReservationLoading}
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={!isAuthenticated || !canSubmitReservation() || isReservationLoading}
            >
              {!isAuthenticated ? 'Sign in to Reserve' : 
               reservationData.paymentMethod === 'deposit' ? 
               `Reserve Now - Pay ₱${priceBreakdown?.depositAmount?.toLocaleString() || '0'}` :
               `Reserve Now - Pay ₱${priceBreakdown?.total?.toLocaleString() || '0'}`}
            </Button>
            
            <Button 
              onClick={onContactHost}
              variant="outline"
              size="lg"
              className="w-full border-gray-600 text-gray-300"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Host
            </Button>
            
            <Button
              onClick={onViewRequest}
              variant="outline"
              size="lg"
              className="w-full border-purple-500 text-purple-400"
            >
              Request Viewing
            </Button>
          </div>

          {/* Footer Notes */}
          <div className="mt-4 space-y-2">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Host approval required • No payment until approved
              </p>
            </div>
            
            {reservationData.paymentMethod === 'deposit' && priceBreakdown && (
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                <div className="flex items-start">
                  <Clock className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-300">
                    <p className="font-medium">Split Payment Plan</p>
                    <p>Remaining ₱{priceBreakdown.remainingAmount.toLocaleString()} due 3 days before check-in</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-400 space-y-1">
                <p>• Free cancellation until 7 days before check-in</p>
                <p>• 50% refund for cancellations 3-6 days before</p>
                <p>• No refund within 3 days of check-in</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationSidebar;