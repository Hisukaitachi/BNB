// src/pages/listings/ListingDetailsPage.jsx - Enhanced with backend integration
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Calendar, Users, Heart, Share2, MessageSquare, User, AlertCircle } from 'lucide-react';
import listingService from '../../services/listingService';
import bookingService from '../../services/bookingService';
import paymentService from '../../services/paymentService';
import { favoritesService } from '../../services/favoritesService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BookingCalendar from '../booking/BookingCalendar';
import { useAuth } from '../../context/AuthContext';
import MapComponent from '../../components/common/MapComponent';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    guests: 1
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  useEffect(() => {
    loadListingData();
  }, [id]);

  useEffect(() => {
    calculateTotalPrice();
    checkAvailability();
  }, [bookingData.startDate, bookingData.endDate, listing]);

  useEffect(() => {
    if (isAuthenticated && listing) {
      checkIfFavorited();
    }
  }, [isAuthenticated, listing]);

  const loadListingData = async () => {
    if (!id) {
      console.log('No listing ID available yet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Load listing details
      const listingResponse = await listingService.getListingById(id);
      setListing(listingResponse.data.listing);
      
      // Load reviews
      const reviewsResponse = await listingService.getListingReviews(id);
      setReviews(reviewsResponse.data.reviews || []);
      
      // Load unavailable dates for calendar
      const bookedDates = await bookingService.getBookedDates(id);
      setUnavailableDates(bookedDates);
      
    } catch (err) {
      setError(err.message || 'Failed to load listing');
      console.error('Failed to load listing:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!listing || !bookingData.startDate || !bookingData.endDate) {
      setTotalPrice(0);
      setPriceBreakdown(null);
      return;
    }

    const breakdown = bookingService.calculateBookingPrice(
      listing.price_per_night,
      bookingData.startDate,
      bookingData.endDate
    );
    
    setTotalPrice(breakdown.total);
    setPriceBreakdown(breakdown);
  };

  const checkAvailability = async () => {
    if (!listing || !bookingData.startDate || !bookingData.endDate) {
      setAvailabilityMessage('');
      return;
    }

    try {
      setAvailabilityChecking(true);
      const isAvailable = await bookingService.checkAvailability(
        listing.id,
        bookingData.startDate,
        bookingData.endDate
      );
      
      if (isAvailable) {
        setAvailabilityMessage('✅ Dates are available!');
      } else {
        setAvailabilityMessage('❌ Selected dates are not available. Please choose different dates.');
      }
    } catch (error) {
      setAvailabilityMessage('⚠️ Unable to check availability. Please try again.');
    } finally {
      setAvailabilityChecking(false);
    }
  };

  const checkIfFavorited = async () => {
    try {
      const favorites = await favoritesService.getFavorites();
      setIsFavorited(favoritesService.isFavorited(listing.id, favorites.favorites));
    } catch (error) {
      console.error('Failed to check if favorited:', error);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }

    try {
      setFavoritesLoading(true);
      if (isFavorited) {
        await favoritesService.removeFromFavorites(listing.id);
        setIsFavorited(false);
      } else {
        await favoritesService.addToFavorites(listing.id);
        setIsFavorited(true);
      }
    } catch (error) {
      alert('Failed to update favorites: ' + error.message);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }

    if (!bookingData.startDate || !bookingData.endDate) {
      alert('Please select check-in and check-out dates');
      return;
    }

    if (totalPrice <= 0) {
      alert('Please select valid dates');
      return;
    }

    if (availabilityMessage.includes('❌')) {
      alert('Selected dates are not available. Please choose different dates.');
      return;
    }

    try {
      setIsBookingLoading(true);
      
      // Create booking
      const bookingResult = await bookingService.createBooking({
        listing_id: listing.id,
        start_date: bookingData.startDate,
        end_date: bookingData.endDate,
        total_price: totalPrice
      });

      if (bookingResult.success) {
        // Navigate to payment page or show success
        alert('Booking request submitted successfully! Redirecting to payment...');
        
        // Create payment intent
        try {
          const paymentResult = await paymentService.createPaymentIntent(bookingResult.bookingId);
          
          if (paymentResult.success && paymentResult.paymentIntent) {
            // Redirect to payment page (you can implement this)
            console.log('Payment intent created:', paymentResult);
            navigate('/payment', { 
              state: { 
                bookingId: bookingResult.bookingId,
                paymentIntent: paymentResult.paymentIntent 
              } 
            });
          }
        } catch (paymentError) {
          console.error('Payment setup failed:', paymentError);
          // Still show booking success, payment can be done later
          navigate('/my-bookings');
        }
      }
      
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed: ' + error.message);
    } finally {
      setIsBookingLoading(false);
    }
  };

  const handleContactHost = () => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    
    navigate(`/messages?host=${listing.host_id}`);
  };

  const handleDateSelect = (dates) => {
    setBookingData(prev => ({
      ...prev,
      startDate: dates.checkIn || '',
      endDate: dates.checkOut || ''
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">Listing not found</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => navigate('/listings')} variant="gradient">
              Back to Listings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-300 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to listings</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Images */}
            {listing.image_url && (
              <div className="mb-8">
                <img 
                  src={listing.image_url ? `/uploads/${listing.image_url.split('/').pop()}` : '/placeholder.jpg'} 
                  alt={listing.title}
                  className="w-full h-96 object-cover rounded-xl"
                />
              </div>
            )}

            {/* Title & Location */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {listing.title}
                </h1>
                <div className="flex items-center space-x-2">
                  <button className="p-2 rounded-full hover:bg-gray-800 transition">
                    <Share2 className="w-5 h-5 text-gray-300" />
                  </button>
                  <button 
                    onClick={handleFavoriteToggle}
                    disabled={favoritesLoading}
                    className="p-2 rounded-full hover:bg-gray-800 transition"
                  >
                    {favoritesLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    ) : (
                      <Heart className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-gray-300'}`} />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-gray-400">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{listing.location}</span>
                </div>
                {listing.average_rating && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                    <span>{Number(listing.average_rating).toFixed(1)} ({reviews.length} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">About this place</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Host Info */}
            <div className="mb-8 p-6 bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Hosted by {listing.host_name}</h3>
                    <p className="text-sm text-gray-400">Host since {new Date(listing.created_at).getFullYear()}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleContactHost}
                  className="border-purple-500 text-purple-400"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Host
                </Button>
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Reviews ({reviews.length})
                </h2>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {review.reviewer_name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-white">{review.reviewer_name}</span>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm">{review.comment}</p>
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  
                  {reviews.length > 3 && (
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-600 text-gray-300"
                      onClick={() => {
                        // TODO: Show all reviews modal or page
                        console.log('Show all reviews');
                      }}
                    >
                      Show all {reviews.length} reviews
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
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

                {/* Enhanced Booking Form */}
                <div className="space-y-4 mb-6">
                  {/* Toggle between simple form and calendar */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Select dates</span>
                    <button
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="text-purple-400 text-sm hover:text-purple-300 transition"
                    >
                      {showCalendar ? 'Simple view' : 'Calendar view'}
                    </button>
                  </div>

                  {showCalendar ? (
                    /* Calendar Component */
                    <BookingCalendar
                      listingId={listing.id}
                      selectedDates={{
                        checkIn: bookingData.startDate,
                        checkOut: bookingData.endDate
                      }}
                      onDateSelect={handleDateSelect}
                      pricePerNight={listing.price_per_night}
                    />
                  ) : (
                    /* Simple Date Inputs (your existing form) */
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Check-in</label>
                          <Input
                            type="date"
                            value={bookingData.startDate}
                            onChange={(e) => setBookingData({...bookingData, startDate: e.target.value})}
                            className="bg-white/10 border-gray-600 text-white"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Check-out</label>
                          <Input
                            type="date"
                            value={bookingData.endDate}
                            onChange={(e) => setBookingData({...bookingData, endDate: e.target.value})}
                            className="bg-white/10 border-gray-600 text-white"
                            min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-300 mb-2">Guests</label>
                        <select
                          value={bookingData.guests}
                          onChange={(e) => setBookingData({...bookingData, guests: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                        >
                          {[1,2,3,4,5,6,7,8].map(num => (
                            <option key={num} value={num} className="bg-gray-800">
                              {num} Guest{num > 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Availability Status */}
                  {(bookingData.startDate && bookingData.endDate) && (
                    <div className={`p-3 rounded-lg text-sm ${
                      availabilityMessage.includes('✅') ? 'bg-green-900/20 text-green-400 border border-green-600' :
                      availabilityMessage.includes('❌') ? 'bg-red-900/20 text-red-400 border border-red-600' :
                      'bg-yellow-900/20 text-yellow-400 border border-yellow-600'
                    }`}>
                      {availabilityChecking ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Checking availability...
                        </div>
                      ) : (
                        availabilityMessage
                      )}
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                {priceBreakdown && priceBreakdown.total > 0 && (
                  <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between text-gray-300 mb-2">
                      <span>₱{Number(listing.price_per_night).toLocaleString()} x {priceBreakdown.nights} nights</span>
                      <span>₱{priceBreakdown.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-300 mb-2">
                      <span>Service fee</span>
                      <span>₱{priceBreakdown.serviceFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-300 mb-2">
                      <span>Taxes</span>
                      <span>₱{priceBreakdown.taxes.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-600 pt-2">
                      <div className="flex justify-between font-semibold text-white">
                        <span>Total</span>
                        <span>₱{priceBreakdown.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleBooking}
                    loading={isBookingLoading}
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    disabled={!bookingData.startDate || !bookingData.endDate || totalPrice <= 0 || availabilityMessage.includes('❌')}
                  >
                    {!isAuthenticated ? 'Sign in to Book' : 'Request to Book'}
                  </Button>
                  
                  <Button
                    onClick={handleContactHost}
                    variant="outline"
                    size="lg"
                    className="w-full border-gray-600 text-gray-300"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Host
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    You won't be charged yet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        {listing.latitude && listing.longitude && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Location</h2>
            <MapComponent 
              center={{ lat: listing.latitude, lng: listing.longitude }}
              zoom={15}
              height="400px"
              showSingleMarker={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingDetailPage;