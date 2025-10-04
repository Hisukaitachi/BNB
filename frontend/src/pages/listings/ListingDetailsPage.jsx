// frontend/src/pages/listings/ListingDetailsPage.jsx - Updated with Reservation Integration
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Users, 
  Heart, 
  Share2, 
  Home,
  Bath,
  Bed
} from 'lucide-react';
import listingService from '../../services/listingService';
import bookingService from '../../services/bookingService';
import { favoritesService } from '../../services/favoritesService';
import { reportsService } from '../../services/reportsService';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import MapComponent from '../../components/common/MapComponent';
import ViewRequestModal from '../../components/viewrequest/ViewRequestModal';
import ReportModal from '../../components/reports/ReportModal';
import ImageGallery from '../../components/listings/ImageGallery';
import HostInfo from '../../components/listings/HostInfo';
import ReviewsSection from '../../components/listings/ReviewsSection';
import BookingSidebar from '../../components/listings/BookingSidebar';
import { viewRequestAPI } from '../../services/api';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [showViewRequestModal, setShowViewRequestModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  useEffect(() => {
    loadListingData();
  }, [id]);

  useEffect(() => {
    if (isAuthenticated && listing) {
      checkIfFavorited();
    }
  }, [isAuthenticated, listing]);

  const loadListingData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      
      const listingResponse = await listingService.getListingById(id);
      setListing(listingResponse.data.listing);
      
      const reviewsResponse = await listingService.getListingReviews(id);
      setReviews(reviewsResponse.data.reviews || []);
      
    } catch (err) {
      setError(err.message || 'Failed to load listing');
      console.error('Failed to load listing:', err);
    } finally {
      setLoading(false);
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
  
  const handleContactHost = () => {
    if (!isAuthenticated) {
      navigate('/auth/login', { state: { from: location } });
      return;
    }
    navigate(`/messages?host=${listing.host_id}`);
  };

const handleBooking = async (bookingData) => {
  if (!isAuthenticated) {
    navigate('/auth/login', { state: { from: location } });
    return;
  }

  // Validate required fields before sending
  if (!bookingData.listing_id || !bookingData.startDate || !bookingData.endDate || !bookingData.total_price) {
    alert('Please fill in all required booking information');
    return;
  }

  try {
    setIsBookingLoading(true);
    
    // Format the data to match backend expectations (start_date, end_date, NOT check_in/check_out)
    const formattedBookingData = {
      listing_id: bookingData.listing_id,
      start_date: bookingData.startDate,  // Backend expects start_date
      end_date: bookingData.endDate,      // Backend expects end_date
      guests: bookingData.guests,
      total_price: bookingData.total_price,
      booking_type: bookingData.booking_type || 'book',
      remaining_payment_method: bookingData.booking_type === 'reserve' 
        ? bookingData.remaining_payment_method 
        : undefined
    };

    console.log('Submitting booking data:', formattedBookingData);

    const response = await bookingService.createBooking(formattedBookingData);
    
    if (response.success) {
      alert('Booking request submitted successfully!');
      navigate('/my-bookings');
    }
  } catch (error) {
    console.error('Booking error:', error);
    alert('Failed to create booking: ' + (error.message || 'Unknown error'));
  } finally {
    setIsBookingLoading(false);
  }
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

  const handleReportSubmit = async (reportData) => {
    try {
      const backendFormatData = {
        reporter_id: user?.id,
        reported_user_id: reportData.reported_user_id,
        booking_id: reportData.booking_id || null,
        reason: reportData.reason
      };
      
      const result = await reportsService.submitReport(backendFormatData);
      
      if (result.success) {
        alert('Report submitted successfully. Our team will review it shortly.');
      }
    } catch (error) {
      console.error('Report submission failed:', error);
      throw error;
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

            {/* Host Info */}
            <HostInfo 
              listing={listing}
              isAuthenticated={isAuthenticated}
              onContactHost={handleContactHost}
              onReportHost={() => setShowReportModal(true)}
            />

            {/* Reviews */}
            <ReviewsSection reviews={reviews} />
          </div>

          {/* Booking Sidebar */}
          <BookingSidebar
            listing={listing}
            reviews={reviews}
            isAuthenticated={isAuthenticated}
            onBooking={handleBooking}
            onContactHost={handleContactHost}
            onViewRequest={() => setShowViewRequestModal(true)}
            isBookingLoading={isBookingLoading}
          />
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

      {/* Modals */}
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