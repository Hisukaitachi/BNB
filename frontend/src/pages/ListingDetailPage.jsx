// src/pages/ListingDetailPage.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BookingCalendar from '../components/booking/BookingCalendar';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListingData();
    } else {
      setError('No listing ID provided');
      setLoading(false);
    }
  }, [id]);

  // Handle booking completion
  const handleBookingComplete = (bookingData) => {
    alert(`Booking confirmed! 
    Dates: ${bookingData.start_date} to ${bookingData.end_date}
    Total: ₱${bookingData.total_price.toLocaleString()}`);
    // Refresh booked dates
    fetchListingData();
  };

  const fetchListingData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching data for listing ID:', id);

      // Validate ID first
      if (!id || id === 'undefined' || id === 'null' || isNaN(parseInt(id))) {
        throw new Error('Invalid listing ID');
      }

      // Convert to number to ensure it's valid
      const listingId = parseInt(id);
      if (listingId <= 0) {
        throw new Error('Invalid listing ID');
      }

      console.log('Validated listing ID:', listingId);

      // Use Promise.allSettled instead of Promise.all to handle partial failures
      const [listingResult, reviewsResult, bookedDatesResult] = await Promise.allSettled([
        api.getListingById(listingId),
        api.getListingReviews(listingId),
        api.getBookedDatesByListing(listingId)
      ]);

      console.log('API Results:');
      console.log('Listing result:', listingResult);
      console.log('Reviews result:', reviewsResult);
      console.log('Booked dates result:', bookedDatesResult);

      // Handle listing data (critical)
      if (listingResult.status === 'fulfilled') {
        const listingData = listingResult.value;
        console.log('Raw listing data:', listingData);
        
        if (listingData && (listingData.data || listingData.id)) {
          const actualListing = listingData.data?.listing || listingData.data || listingData;
          console.log('Processed listing:', actualListing);
          setListing(actualListing);
        } else {
          console.error('No valid listing data found:', listingData);
          throw new Error('Listing not found or invalid data received');
        }
      } else {
        console.error('Failed to fetch listing:', listingResult.reason);
        throw new Error('Failed to fetch listing details');
      }

      // Handle reviews data (non-critical) - always set to empty array if failed
      if (reviewsResult.status === 'fulfilled' && reviewsResult.value) {
        const reviewsData = reviewsResult.value;
        const reviewsArray = reviewsData?.data || reviewsData?.reviews || reviewsData || [];
        setReviews(Array.isArray(reviewsArray) ? reviewsArray : []);
      } else {
        console.warn('Failed to fetch reviews - using empty array:', reviewsResult.reason?.message || 'Unknown error');
        setReviews([]); // Always set empty array if reviews fail
      }

      // Handle booked dates data (non-critical) - always set to empty array if failed
      if (bookedDatesResult.status === 'fulfilled' && bookedDatesResult.value) {
        const bookedDatesData = bookedDatesResult.value;
        const datesArray = bookedDatesData?.data?.bookedDates || bookedDatesData?.data || bookedDatesData || [];
        setBookedDates(Array.isArray(datesArray) ? datesArray : []);
      } else {
        console.warn('Failed to fetch booked dates - using empty array:', bookedDatesResult.reason?.message || 'Unknown error');
        setBookedDates([]); // Always set empty array if booked dates fail
      }

    } catch (error) {
      console.error('Failed to fetch listing:', error);
      setError(error.message || 'Failed to load listing details');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading listing details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Failed to Load Listing</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => fetchListingData()}
              className="btn-primary mr-4"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate('/listings')}
              className="btn-secondary"
            >
              Back to Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No listing found
  if (!listing) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold text-gray-400 mb-4">Listing Not Found</h2>
          <p className="text-gray-500 mb-6">The listing you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/listings')}
            className="btn-primary"
          >
            Browse All Listings
          </button>
        </div>
      </div>
    );
  }

  // Render listing details
  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <button 
            onClick={() => navigate('/listings')}
            className="btn-secondary mb-4"
          >
            ← Back to Listings
          </button>
          
          <h1 className="text-3xl font-bold mb-2">{listing.title || 'Untitled Listing'}</h1>
          <p className="text-gray-400">{listing.location || 'Location not specified'}</p>
        </div>

        {/* Listing Image */}
        <div className="mb-8">
          <img
            src={listing.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"}
            alt={listing.title}
            className="w-full h-96 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
            }}
          />
        </div>

        {/* Listing Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <p className="text-gray-300">{listing.description || 'No description available'}</p>
            </div>

            {/* Reviews Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">
                Reviews ({Array.isArray(reviews) ? reviews.length : 0})
              </h2>
              
              {Array.isArray(reviews) && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <div key={review.id || index} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{review.user_name || review.reviewer_name || 'Anonymous'}</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={i < (review.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300">{review.comment || 'No comment provided'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No reviews yet. Be the first to review!</p>
              )}
            </div>
          </div>

          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 sticky top-24">
              <div className="mb-4">
                <span className="text-2xl font-bold">₱{parseInt(listing.price_per_night || 0).toLocaleString()}</span>
                <span className="text-gray-400 ml-1">/ night</span>
              </div>
              
              {listing.average_rating && (
                <div className="flex items-center mb-4">
                  <span className="text-yellow-400 mr-1">★</span>
                  <span className="text-sm">{parseFloat(listing.average_rating).toFixed(1)}</span>
                </div>
              )}
              
              <button 
                className="btn-primary w-full mb-4"
                onClick={() => setShowBookingModal(true)}
              >
                Book Now
              </button>
              
              <p className="text-xs text-gray-400 text-center">
                You won't be charged yet
              </p>
            </div>
          </div>
        </div>

        {/* Booking Modal */}
        {showBookingModal && (
          <BookingCalendar
            listing={listing}
            bookedDates={bookedDates}
            onClose={() => setShowBookingModal(false)}
            onBookingComplete={handleBookingComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ListingDetailPage;