// src/pages/listings/ListingDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Calendar, Users, Heart, Share2, MessageSquare, User } from 'lucide-react';
import listingService from '../../services/listingService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
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
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  useEffect(() => {
    loadListingData();
  }, [id]);

  useEffect(() => {
    calculateTotalPrice();
  }, [bookingData.startDate, bookingData.endDate, listing]);

  const loadListingData = async () => {
  // Add guard clause to prevent API call with undefined ID
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
      return;
    }

    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      setTotalPrice(listing.price_per_night * days);
    } else {
      setTotalPrice(0);
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

    try {
      setIsBookingLoading(true);
      
      // TODO: Implement booking API call
      console.log('Booking data:', {
        listing_id: id,
        start_date: bookingData.startDate,
        end_date: bookingData.endDate,
        total_price: totalPrice
      });
      
      // For now, navigate to a success page or show success message
      alert('Booking request submitted successfully!');
      
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Booking failed. Please try again.');
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
  className="w-full h-48 object-cover"
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
                  <button className="p-2 rounded-full hover:bg-gray-800 transition">
                    <Heart className="w-5 h-5 text-gray-300" />
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

          {/* Booking Sidebar */}
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

                {/* Booking Form */}
                <div className="space-y-4 mb-6">
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
                </div>

                {/* Price Breakdown */}
                {totalPrice > 0 && (
                  <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                    <div className="flex justify-between text-gray-300 mb-2">
                      <span>₱{Number(listing.price_per_night).toLocaleString()} x {Math.ceil((new Date(bookingData.endDate) - new Date(bookingData.startDate)) / (1000 * 60 * 60 * 24))} nights</span>
                      <span>₱{totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-600 pt-2">
                      <div className="flex justify-between font-semibold text-white">
                        <span>Total</span>
                        <span>₱{totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking Button */}
                <div className="space-y-3">
                  <Button
                    onClick={handleBooking}
                    loading={isBookingLoading}
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    disabled={!bookingData.startDate || !bookingData.endDate || totalPrice <= 0}
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