// src/pages/listings/ListingDetailsPage.jsx - Enhanced with backend integration
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Calendar, 
  Users, 
  Heart, 
  Share2, 
  MessageSquare, 
  User, 
  AlertCircle,
  Home,
  Bath,
  Bed,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause
} from 'lucide-react';
import listingService from '../../services/listingService';
import bookingService from '../../services/bookingService';
import paymentService from '../../services/paymentService';
import { favoritesService } from '../../services/favoritesService';
import reviewService from '../../services/reviewService';
import { reportsService } from '../../services/reportsService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BookingCalendar from '../booking/BookingCalendar';
import { useAuth } from '../../context/AuthContext';
import MapComponent from '../../components/common/MapComponent';
import ViewRequestModal from '../../components/viewrequest/ViewRequestModal';
import ReviewModal from '../../components/reviews/ReviewModal';
import ReportModal from '../../components/reports/ReportModal';
import { viewRequestAPI } from '../../services/api';

// Image Gallery Component
const ImageGallery = ({ images, video, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Parse images from JSON string or use fallback
  const imageUrls = (() => {
    if (images && Array.isArray(images)) {
      return images.map(img => img.startsWith('/uploads/') ? img : `/uploads/${img.split('/').pop()}`);
    } else if (images && typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed.map(img => img.startsWith('/uploads/') ? img : `/uploads/${img.split('/').pop()}`) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  })();

  // Combine images and video for gallery
  const mediaItems = [
    ...imageUrls.map((url, index) => ({ type: 'image', url, id: `img-${index}` })),
    ...(video ? [{ type: 'video', url: `/uploads/${video.split('/').pop()}`, id: 'video' }] : [])
  ];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  if (mediaItems.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-700 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Home className="w-16 h-16 mx-auto mb-4" />
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Gallery */}
      <div className="relative mb-4">
        {/* Main Image/Video Display */}
        <div className="relative h-96 rounded-xl overflow-hidden">
          {mediaItems[currentIndex]?.type === 'video' ? (
            <div className="relative w-full h-full">
              <video
                src={mediaItems[currentIndex].url}
                className="w-full h-full object-cover"
                controls
              />
              <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                Video Tour
              </div>
            </div>
          ) : (
            <img
              src={mediaItems[currentIndex]?.url}
              alt={`${title} - Image ${currentIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowLightbox(true)}
            />
          )}

          {/* Navigation Arrows */}
          {mediaItems.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm px-3 py-1 rounded">
            {currentIndex + 1} / {mediaItems.length}
          </div>

          {/* View All Photos Button */}
          {mediaItems.length > 1 && (
            <button
              onClick={() => setShowLightbox(true)}
              className="absolute bottom-3 left-3 bg-black/70 text-white text-sm px-3 py-1 rounded hover:bg-black/90 transition"
            >
              View all photos
            </button>
          )}
        </div>

        {/* Thumbnail Strip */}
        {mediaItems.length > 1 && (
          <div className="flex space-x-2 mt-3 overflow-x-auto">
            {mediaItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden ${
                  index === currentIndex ? 'ring-2 ring-purple-500' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full bg-gray-700 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 text-center">
                      Video
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative max-w-6xl max-h-full p-4">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {mediaItems[currentIndex]?.type === 'video' ? (
              <video
                src={mediaItems[currentIndex].url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <img
                src={mediaItems[currentIndex]?.url}
                alt={`${title} - Image ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded">
              {currentIndex + 1} / {mediaItems.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

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
  const [showViewRequestModal, setShowViewRequestModal] = useState(false);
  
  // Review and Report modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [canUserReview, setCanUserReview] = useState(false);

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
      loadUserBookings();
    }
  }, [isAuthenticated, listing]);

  const loadUserBookings = async () => {
    try {
      console.log('🔍 Loading user bookings for listing:', id);
      console.log('Current user:', user);
      
      // Use getMyBookings instead of getUserBookings (based on your bookingService)
      const listingBookings = await bookingService.getMyBookings();
      console.log('📋 All user bookings:', listingBookings);
      
      // Filter bookings for this specific listing
      const relevantBookings = listingBookings.filter(booking => 
        booking.listing_id === parseInt(id)
      );
      console.log('🎯 Relevant bookings for this listing:', relevantBookings);
      
      setUserBookings(relevantBookings);
      
      // Check if user can review (has completed booking without review)
      let canReview = false;
      if (relevantBookings.length > 0) {
        relevantBookings.forEach(booking => {
          const reviewEligibility = reviewService.canReviewBooking(booking, user?.id);
          console.log(`📝 Booking ${booking.id} review eligibility:`, reviewEligibility);
          if (reviewEligibility.canReview) {
            canReview = true;
          }
        });
      }
      
      console.log('✅ Can user review:', canReview);
      setCanUserReview(canReview);
      
    } catch (error) {
      console.error('Failed to load user bookings:', error);
      // Set defaults on error
      setUserBookings([]);
      setCanUserReview(false);
    }
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      const result = await reviewService.createReview(reviewData);
      if (result.success) {
        alert('Review submitted successfully!');
        // Reload reviews and user bookings
        const reviewsResponse = await listingService.getListingReviews(id);
        setReviews(reviewsResponse.data.reviews || []);
        loadUserBookings();
      }
    } catch (error) {
      throw error;
    }
  };

  const handleReportSubmit = async (reportData) => {
    try {
      // Add reporter_id from current user and format for backend
      const backendFormatData = {
        reporter_id: user?.id,
        reported_user_id: reportData.reported_user_id,
        booking_id: reportData.booking_id || null,
        reason: reportData.reason
      };
      
      console.log('Submitting report to backend:', backendFormatData);
      
      // Call the updated reportsService
      const result = await reportsService.submitReport(backendFormatData);
      console.log('Report submission result:', result);
      
      if (result.success) {
        alert('Report submitted successfully. Our team will review it shortly.');
      }
    } catch (error) {
      console.error('Report submission failed:', error);
      throw error;
    }
  };

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
    
    const bookingResult = await bookingService.createBooking({
      listing_id: listing.id,
      start_date: bookingData.startDate,
      end_date: bookingData.endDate,
      total_price: totalPrice
    });

    if (bookingResult.success) {
      // Show success message without immediate payment
      alert(`Booking request submitted successfully! 
      
Your request has been sent to the host for approval. You will receive a notification once they respond, and payment instructions will be provided if your booking is approved.

Booking Details:
- Dates: ${bookingData.startDate} to ${bookingData.endDate}
- Total: ₱${totalPrice.toLocaleString()}
- Status: Pending Host Approval

You can track your booking status in "My Bookings".`);
      
      // Redirect to bookings page to track status
      navigate('/my-bookings');
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

  const handleViewRequest = async (requestData) => {
    try {
      await viewRequestAPI.requestViewUnit(requestData.listingId, {
        message: requestData.message,
        preferred_date: requestData.preferred_date,
        preferred_time: requestData.preferred_time
      });
      alert('View request sent successfully!');
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send view request');
    }
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
            {/* Image Gallery */}
            <div className="mb-8">
              <ImageGallery 
                images={listing.images || listing.image_url} 
                video={listing.video_url}
                title={listing.title}
              />
            </div>

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

            {/* Property Details */}
            <div className="mb-8 p-6 bg-gray-800 rounded-xl">
              <h2 className="text-xl font-semibold text-white mb-4">Property Details</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Users className="w-5 h-5" />
                  <span>{listing.max_guests} guests</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Bed className="w-5 h-5" />
                  <span>{listing.bedrooms} bedrooms</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Bath className="w-5 h-5" />
                  <span>{listing.bathrooms} bathrooms</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Home className="w-5 h-5" />
                  <span>Entire place</span>
                </div>
              </div>

              {/* Amenities */}
              {listing.amenities && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {listing.amenities.split(',').map((amenity, index) => (
                      <div key={index} className="flex items-center space-x-2 text-gray-300">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">{amenity.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* House Rules */}
              {listing.house_rules && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">House Rules</h3>
                  <div className="space-y-2">
                    {listing.house_rules.split(',').map((rule, index) => (
                      <div key={index} className="flex items-center space-x-2 text-gray-300">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm">{rule.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">About this place</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Host Info with Review/Report Options */}
            <div className="mb-8 p-6 bg-gray-800 rounded-xl">
              <div className="flex items-center justify-between mb-4">
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

              {/* Review and Report Actions */}
              {isAuthenticated && (
                <div className="flex space-x-3 pt-4 border-t border-gray-700">
                  {canUserReview && (
                    <Button
                      onClick={() => setShowReviewModal(true)}
                      variant="outline"
                      size="sm"
                      className="border-green-600 text-green-400 hover:bg-green-900/20"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Write Review
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => setShowReportModal(true)}
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              )}
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
                          {Array.from({ length: listing.max_guests }, (_, i) => i + 1).map(num => (
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
                    {!isAuthenticated ? 'Sign in to Book' : 'Submit Booking Request'}
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
                  
                  <Button
                    onClick={() => setShowViewRequestModal(true)}
                    variant="outline"
                    size="lg"
                    className="w-full border-purple-500 text-purple-400"
                  >
                    Request Viewing
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    No payment required until host approves your request
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
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="mb-4">
                <p className="text-gray-300 mb-2">📍 {listing.location}</p>
                <p className="text-gray-400 text-sm">
                  Coordinates: {Number(listing.latitude).toFixed(6)}, {Number(listing.longitude).toFixed(6)}
                </p>
              </div>
              <MapComponent 
                center={{ lat: Number(listing.latitude), lng: Number(listing.longitude) }}
                zoom={15}
                height="400px"
                showSingleMarker={true}
                className="rounded-lg overflow-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals - Only View Request and Report */}
      {showViewRequestModal && (
        <ViewRequestModal
          listing={listing}
          onClose={() => setShowViewRequestModal(false)}
          onSubmit={handleViewRequest}
        />
      )}

      {showReportModal && (
        <ReportModal
          listing={listing}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
};

export default ListingDetailPage;