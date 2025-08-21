import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, Star, MapPin, Users, Wifi, Car, 
  Swimming, Utensils, AirVent, PawPrint,
  Share, Flag, ArrowLeft, Calendar,
  MessageCircle, Shield, Award, Copy,
  Facebook, Twitter, Send, CheckCircle,
  AlertTriangle, ImageIcon, Play
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import BookingForm from '../components/booking/BookingForm';
import Modal from '../components/common/Modal';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useApp();
  
  const [listing, setListing] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookedDates, setBookedDates] = useState([]);
  const [reportData, setReportData] = useState({
    reason: '',
    details: ''
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  const amenityIcons = {
    'WiFi': Wifi,
    'Parking': Car,
    'Swimming Pool': Swimming,
    'Kitchen': Utensils,
    'Air Conditioning': AirVent,
    'Pet Friendly': PawPrint,
    'Free WiFi': Wifi,
    'Pool': Swimming,
    'Gym': Users,
    'Beach Access': Swimming,
    'Mountain View': MapPin,
    'City View': MapPin
  };

  useEffect(() => {
    fetchListingData();
  }, [id]);

  const fetchListingData = async () => {
    try {
      setLoading(true);
      const [listingResponse, reviewsResponse, bookedDatesResponse] = await Promise.all([
        api.getListingById(id),
        api.getListingReviews(id).catch(() => ({ data: { reviews: [] } })),
        api.get(`/bookings/booked-dates/${id}`).catch(() => ({ data: { bookedDates: [] } }))
      ]);

      if (listingResponse.status === 'success') {
        setListing(listingResponse.data.listing);
        
        // Check if already favorited
        if (isAuthenticated) {
          try {
            const favoritesResponse = await api.getFavorites();
            if (favoritesResponse.status === 'success') {
              const isFav = favoritesResponse.data.favorites.some(fav => fav.id === parseInt(id));
              setIsFavorited(isFav);
            }
          } catch (error) {
            console.log('Could not check favorites status');
          }
        }
      }
      
      if (reviewsResponse.status === 'success') {
        setReviews(reviewsResponse.data.reviews || []);
      }

      if (bookedDatesResponse.status === 'success') {
        setBookedDates(bookedDatesResponse.data.bookedDates || []);
      }
    } catch (error) {
      console.error('Failed to fetch listing:', error);
      showToast('Failed to load listing details', 'error');
      navigate('/listings');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to add favorites', 'info');
      navigate('/login');
      return;
    }

    try {
      if (isFavorited) {
        await api.removeFromFavorites(id);
        setIsFavorited(false);
        showToast('Removed from favorites', 'success');
      } else {
        await api.addToFavorites(id);
        setIsFavorited(true);
        showToast('Added to favorites', 'success');
      }
    } catch (error) {
      showToast('Failed to update favorites', 'error');
    }
  };

  const handleContactHost = () => {
    if (!isAuthenticated) {
      showToast('Please sign in to message the host', 'info');
      navigate('/login');
      return;
    }
    navigate(`/messages?user=${listing.host_id}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: listing.description,
          url: window.location.href
        });
      } catch (error) {
        setShowShareModal(true);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied to clipboard!', 'success');
    setShowShareModal(false);
  };

  const shareToSocial = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this amazing place: ${listing.title}`);
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`
    };
    
    window.open(urls[platform], '_blank', 'width=600,height=400');
    setShowShareModal(false);
  };

  const handleReport = async () => {
    if (!reportData.reason) {
      showToast('Please select a reason for reporting', 'error');
      return;
    }

    setSubmittingReport(true);
    try {
      // Here you would call your report API
      // await api.reportListing(id, reportData);
      
      showToast('Report submitted successfully. We will review it shortly.', 'success');
      setShowReportModal(false);
      setReportData({ reason: '', details: '' });
    } catch (error) {
      showToast('Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Sample images if not provided
  const images = listing?.images || [
    listing?.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  ];

  if (loading) {
    return <Loading message="Loading listing details..." />;
  }

  if (!listing) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-400 mb-4">Listing not found</h2>
          <Button onClick={() => navigate('/listings')}>
            Browse All Listings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to listings
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
              <div className="flex items-center space-x-4 text-gray-400 mb-4">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                  <span>{listing.average_rating || 'New'}</span>
                  <span className="mx-1">•</span>
                  <span>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-1" />
                  <span>{listing.location}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                icon={<Share className="w-4 h-4" />}
              >
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteToggle}
                icon={<Heart className={`w-4 h-4 ${isFavorited ? 'text-red-500 fill-current' : ''}`} />}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReportModal(true)}
                icon={<Flag className="w-4 h-4" />}
              >
                Report
              </Button>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 mb-8 rounded-xl overflow-hidden">
          <div className="lg:col-span-2 lg:row-span-2 relative group cursor-pointer">
            <img
              src={images[0]}
              alt={listing.title}
              className="w-full h-64 lg:h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onClick={() => {
                setCurrentImageIndex(0);
                setShowImageGallery(true);
              }}
            />
            {listing.video_url && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                <Play className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
          {images.slice(1, 5).map((image, index) => (
            <div key={index} className="hidden lg:block relative group cursor-pointer">
              <img
                src={image}
                alt={`${listing.title} ${index + 2}`}
                className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-105"
                onClick={() => {
                  setCurrentImageIndex(index + 1);
                  setShowImageGallery(true);
                }}
              />
            </div>
          ))}
          {images.length > 5 && (
            <button
              onClick={() => setShowImageGallery(true)}
              className="hidden lg:flex absolute bottom-4 right-4 items-center space-x-2 bg-white text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Show all photos</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host Info */}
            <div className="border-b border-gray-700 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={listing.host_avatar || `https://ui-avatars.com/api/?name=${listing.host_name}&background=6366f1&color=fff`}
                    alt={listing.host_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold">Hosted by {listing.host_name}</h3>
                    <p className="text-gray-400 text-sm">
                      Host since {new Date(listing.host_joined || listing.created_at).getFullYear()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleContactHost}
                  icon={<MessageCircle className="w-4 h-4" />}
                >
                  Contact Host
                </Button>
              </div>
            </div>

            {/* Property Details */}
            <div>
              <h3 className="text-xl font-semibold mb-4">About this place</h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            </div>

            {/* Property Features */}
            <div>
              <h3 className="text-xl font-semibold mb-4">What this place offers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Default amenities */}
                <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                  <Wifi className="w-5 h-5 text-purple-400" />
                  <span className="text-sm">WiFi</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span className="text-sm">Safe & Secure</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                  <span className="text-sm">Self check-in</span>
                </div>
                {listing.pet_friendly && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                    <PawPrint className="w-5 h-5 text-purple-400" />
                    <span className="text-sm">Pet Friendly</span>
                  </div>
                )}
                
                {/* Custom amenities if any */}
                {listing.amenities && listing.amenities.map((amenity, index) => {
                  const IconComponent = amenityIcons[amenity] || CheckCircle;
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                      <IconComponent className="w-5 h-5 text-purple-400" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* House Rules */}
            <div>
              <h3 className="text-xl font-semibold mb-4">House Rules</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span>Check-in: {listing.check_in_time || '3:00 PM'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span>Check-out: {listing.check_out_time || '11:00 AM'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-gray-500" />
                  <span>Maximum guests: {listing.max_guests || '4'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-gray-500" />
                  <span>No smoking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-gray-500" />
                  <span>No parties or events</span>
                </div>
              </div>
            </div>

            {/* Safety Features */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Safety & Property</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Verified listing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Award className="w-5 h-5 text-blue-400" />
                  <span className="text-sm">Superhost status</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Self check-in with keypad</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-sm">Smoke alarm</span>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div>
              <h3 className="text-xl font-semibold mb-6">
                <Star className="w-5 h-5 text-yellow-400 fill-current inline mr-2" />
                {listing.average_rating && `${listing.average_rating} • `}
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </h3>
              
              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {/* Rating breakdown */}
                  {listing.average_rating && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-gray-800 rounded-lg">
                      {['Cleanliness', 'Accuracy', 'Check-in', 'Communication', 'Location'].map((category) => (
                        <div key={category} className="text-center">
                          <div className="text-lg font-semibold">{(listing.average_rating + Math.random() * 0.5 - 0.25).toFixed(1)}</div>
                          <div className="text-sm text-gray-400">{category}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Individual reviews */}
                  {reviews.slice(0, 6).map((review) => (
                    <div key={review.id} className="border-b border-gray-700 pb-6 last:border-b-0">
                      <div className="flex items-start space-x-4">
                        <img
                          src={review.reviewer_avatar || `https://ui-avatars.com/api/?name=${review.reviewer_name}&background=random`}
                          alt={review.reviewer_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{review.reviewer_name}</h4>
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed mb-2">{review.comment}</p>
                          <p className="text-gray-500 text-xs">
                            {formatDate(review.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {reviews.length > 6 && (
                    <Button variant="outline" className="w-full">
                      Show all {reviews.length} reviews
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p>No reviews yet. Be the first to review this place!</p>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Where you'll be</h3>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <MapPin className="w-5 h-5 text-purple-400" />
                  <span>{listing.location}</span>
                </div>
                {listing.latitude && listing.longitude ? (
                  <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400">Interactive map coming soon</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400">Exact location provided after booking</p>
                    </div>
                  </div>
                )}
                <p className="text-gray-400 text-sm">
                  Explore the area and discover local attractions, restaurants, and entertainment options nearby.
                </p>
              </div>
            </div>

            {/* Host Information */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Meet your host</h3>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={listing.host_avatar || `https://ui-avatars.com/api/?name=${listing.host_name}&background=6366f1&color=fff`}
                    alt={listing.host_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold mb-2">{listing.host_name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                      <span>Host since {new Date(listing.host_joined || listing.created_at).getFullYear()}</span>
                      <span>•</span>
                      <span>{Math.floor(Math.random() * 50 + 10)} reviews</span>
                      <span>•</span>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                        <span>{(4.5 + Math.random() * 0.5).toFixed(1)} rating</span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Welcome to my place! I'm passionate about providing guests with exceptional stays and local insights. 
                      I'm always available to help make your visit memorable.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleContactHost}
                      icon={<MessageCircle className="w-4 h-4" />}
                    >
                      Contact Host
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-2xl font-bold">{formatPrice(listing.price_per_night)}</span>
                    <span className="text-gray-400 ml-1">/ night</span>
                  </div>
                  {listing.average_rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm">{listing.average_rating}</span>
                    </div>
                  )}
                </div>

                <BookingForm
                  listing={listing}
                  bookedDates={bookedDates}
                  onBookingSubmit={() => {
                    showToast('Booking request sent!', 'success');
                    fetchListingData(); // Refresh booked dates
                  }}
                />

                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                    <Shield className="w-4 h-4" />
                    <span>Secure payment through STAY</span>
                  </div>
                </div>
              </div>

              {/* Quick Contact */}
              <div className="mt-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h4 className="font-semibold mb-4">Have questions?</h4>
                <Button
                  variant="outline"
                  className="w-full mb-3"
                  onClick={handleContactHost}
                  icon={<MessageCircle className="w-4 h-4" />}
                >
                  Message {listing.host_name}
                </Button>
                <p className="text-xs text-gray-400 text-center">
                  Response rate: 95% • Response time: within an hour
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <Modal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        size="full"
        showCloseButton={true}
      >
        <div className="relative">
          <img
            src={images[currentImageIndex]}
            alt={`${listing.title} ${currentImageIndex + 1}`}
            className="w-full max-h-96 object-cover rounded-lg"
          />
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
              className="btn-secondary"
            >
              Previous
            </button>
            <span className="text-gray-400">
              {currentImageIndex + 1} of {images.length}
            </span>
            <button
              onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
              className="btn-secondary"
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2 mt-4">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className={`w-full h-16 object-cover rounded cursor-pointer ${
                  index === currentImageIndex ? 'ring-2 ring-purple-500' : 'opacity-70 hover:opacity-100'
                }`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share this listing"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
            <input
              type="text"
              value={window.location.href}
              readOnly
              className="flex-1 bg-transparent text-white text-sm"
            />
            <Button size="sm" onClick={copyToClipboard} icon={<Copy className="w-4 h-4" />}>
              Copy
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => shareToSocial('facebook')}
              icon={<Facebook className="w-4 h-4" />}
            >
              Facebook
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => shareToSocial('twitter')}
              icon={<Twitter className="w-4 h-4" />}
            >
              Twitter
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => shareToSocial('whatsapp')}
              icon={<Send className="w-4 h-4" />}
            >
              WhatsApp
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report this listing"
      >
        <div className="space-y-4">
          <p className="text-gray-400">Help us keep STAY safe. What's wrong with this listing?</p>
          <div className="space-y-2">
            {[
              'Inappropriate content',
              'Fraudulent listing', 
              'Safety concerns',
              'Discrimination',
              'Spam or misleading',
              'Other'
            ].map((reason) => (
              <label key={reason} className="flex items-center cursor-pointer p-2 hover:bg-gray-700 rounded">
                <input 
                  type="radio" 
                  name="report-reason" 
                  value={reason}
                  checked={reportData.reason === reason}
                  onChange={(e) => setReportData(prev => ({ ...prev, reason: e.target.value }))}
                  className="mr-3 text-purple-500 focus:ring-purple-500" 
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>
          <textarea
            placeholder="Additional details (optional)..."
            value={reportData.details}
            onChange={(e) => setReportData(prev => ({ ...prev, details: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
            rows={3}
          />
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => setShowReportModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger"
              className="flex-1"
              loading={submittingReport}
              onClick={handleReport}
              disabled={!reportData.reason}
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ListingDetailPage;