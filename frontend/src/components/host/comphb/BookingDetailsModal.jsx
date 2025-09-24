// frontend/src/components/host/components/BookingDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Check, MapPin, MessageSquare, AlertCircle } from 'lucide-react';
import Button from '../../ui/Button';
import { bookingAPI } from '../../../services/api';

const BookingDetailsModal = ({ booking, onClose, onStatusUpdate }) => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loadingCustomerInfo, setLoadingCustomerInfo] = useState(false);

  useEffect(() => {
    loadBookingHistory();
    loadCustomerInfo();
  }, [booking.booking_id]);

  const loadBookingHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await bookingAPI.getBookingHistory(booking.booking_id);
      setHistory(response.data.data?.history || []);
    } catch (error) {
      console.error('Failed to load booking history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadCustomerInfo = async () => {
    try {
      setLoadingCustomerInfo(true);
      const response = await bookingAPI.getBookingCustomerInfo(booking.booking_id);
      
      if (response.data.data?.customerInfo) {
        const customerData = response.data.data.customerInfo;
        
        if (typeof customerData === 'string') {
          try {
            setCustomerInfo(JSON.parse(customerData));
          } catch (parseError) {
            console.error('Failed to parse customer info string:', parseError);
            setCustomerInfo(null);
          }
        } else if (typeof customerData === 'object') {
          setCustomerInfo(customerData);
        } else {
          setCustomerInfo(null);
        }
      } else {
        setCustomerInfo(null);
      }
    } catch (error) {
      console.error('Failed to load customer info:', error);
      setCustomerInfo(null);
    } finally {
      setLoadingCustomerInfo(false);
    }
  };

  const calculateDuration = () => {
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilCheckIn = () => {
    const checkIn = new Date(booking.check_in_date);
    const today = new Date();
    const diffTime = checkIn - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isCheckInDay = (checkInDate) => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn = new Date(checkInDate).toISOString().split('T')[0];
    const dayAfter = new Date(new Date(checkInDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return today === checkIn || today === dayAfter;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Booking Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Booking Information */}
            <BookingInfo booking={booking} calculateDuration={calculateDuration} getDaysUntilCheckIn={getDaysUntilCheckIn} />
            
            {/* Guest Information */}
            <GuestInfo 
              booking={booking} 
              customerInfo={customerInfo} 
              loadingCustomerInfo={loadingCustomerInfo} 
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Dates & Status */}
            <DatesSection booking={booking} />
            
            {/* Actions */}
            <ActionsSection 
              booking={booking} 
              isCheckInDay={isCheckInDay(booking.check_in_date)}
              onStatusUpdate={onStatusUpdate}
            />
            
            {/* History */}
            <HistorySection history={history} loadingHistory={loadingHistory} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Booking Information Component
const BookingInfo = ({ booking, calculateDuration, getDaysUntilCheckIn }) => (
  <div>
    <h3 className="text-lg font-semibold text-white mb-4">Booking Information</h3>
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <span className="text-gray-400">Booking ID</span>
        <span className="text-white font-medium">#{booking.booking_id}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Property</span>
        <span className="text-white font-medium text-right">{booking.title}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Duration</span>
        <span className="text-white font-medium">{calculateDuration()} nights</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Total Amount</span>
        <span className="text-green-400 font-medium">₱{Number(booking.total_price).toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Days until check-in</span>
        <span className="text-white font-medium">
          {getDaysUntilCheckIn() > 0 ? `${getDaysUntilCheckIn()} days` : 'Today'}
        </span>
      </div>
    </div>
  </div>
);

// Guest Information Component  
const GuestInfo = ({ booking, customerInfo, loadingCustomerInfo }) => (
  <div>
    <h3 className="text-lg font-semibold text-white mb-4">Guest Information</h3>
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-white font-semibold truncate">{booking.client_name}</h4>
          <p className="text-gray-400 text-sm">Guest</p>
        </div>
      </div>

      {customerInfo ? (
        <div className="space-y-3 border-t border-gray-600 pt-4">
          {customerInfo.email && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <span className="text-gray-400">Email</span>
              <span className="text-white text-sm break-all">{customerInfo.email}</span>
            </div>
          )}
          {customerInfo.phone && (
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <span className="text-gray-400">Phone</span>
              <span className="text-white">{customerInfo.phone}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-gray-600 pt-4">
          {loadingCustomerInfo ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="bg-gray-600/30 rounded-lg p-3">
              <div className="flex items-center text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>Customer verification pending</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4">
        <Button
          size="sm"
          variant="outline"
          className="border-purple-500 text-purple-400 w-full"
          onClick={() => window.open(`/messages?client=${booking.client_id}`, '_blank')}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>
    </div>
  </div>
);

// Dates Section Component
const DatesSection = ({ booking }) => (
  <div>
    <h3 className="text-lg font-semibold text-white mb-4">Dates & Status</h3>
    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-green-400 mr-3" />
          <div>
            <p className="text-sm text-gray-400">Check-in</p>
            <p className="text-white font-medium text-sm sm:text-base">
              {new Date(booking.check_in_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-red-400 mr-3" />
          <div>
            <p className="text-sm text-gray-400">Check-out</p>
            <p className="text-white font-medium text-sm sm:text-base">
              {new Date(booking.check_out_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Actions Section Component
const ActionsSection = ({ booking, isCheckInDay, onStatusUpdate }) => {
  if (booking.status === 'pending') {
    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <Button
            onClick={() => onStatusUpdate(booking.booking_id, 'approved')}
            variant="gradient"
            size="lg"
            className="w-full"
          >
            <Check className="w-5 h-5 mr-2" />
            Approve Booking
          </Button>
          
          <Button
            onClick={() => onStatusUpdate(booking.booking_id, 'rejected')}
            variant="outline"
            size="lg"
            className="w-full border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
          >
            <X className="w-5 h-5 mr-2" />
            Decline Booking
          </Button>
        </div>
      </div>
    );
  }

  if (booking.status === 'confirmed') {
    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Check-in Actions</h3>
        <div className="space-y-3">
          {isCheckInDay ? (
            <Button
              onClick={() => onStatusUpdate(booking.booking_id, 'arrived')}
              variant="gradient"
              size="lg"
              className="w-full"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Mark as Arrived
            </Button>
          ) : (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <p className="text-yellow-400 text-sm mb-2">
                Guests can only be marked as arrived on their check-in date.
              </p>
              <p className="text-gray-400 text-xs">
                Check-in date: {new Date(booking.check_in_date).toLocaleDateString()}
              </p>
              <p className="text-gray-400 text-xs">
                Today: {new Date().toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (booking.status === 'arrived') {
    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Check-out Actions</h3>
        <div className="space-y-3">
          <Button
            onClick={() => onStatusUpdate(booking.booking_id, 'completed')}
            variant="gradient"
            size="lg"
            className="w-full"
          >
            <Check className="w-5 h-5 mr-2" />
            Mark as Completed
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// History Section Component
const HistorySection = ({ history, loadingHistory }) => (
  <div>
    <h3 className="text-lg font-semibold text-white mb-4">Booking History</h3>
    <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
      {loadingHistory ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      ) : history.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No history available</p>
      ) : (
        <div className="space-y-3">
          {history.map((entry, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm">
                  Status changed to <span className="font-medium">{entry.new_status}</span>
                </p>
                <p className="text-gray-400 text-xs">
                  {new Date(entry.changed_at).toLocaleString()} by {entry.changed_by_name}
                </p>
                {entry.note && (
                  <p className="text-gray-300 text-xs italic mt-1 break-words">{entry.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default BookingDetailsModal;