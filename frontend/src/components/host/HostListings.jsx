// frontend/src/components/host/HostListings.jsx - Complete Listings CRUD
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Star, 
  MapPin, 
  Calendar,
  DollarSign,
  Home,
  Image as ImageIcon,
  Video,
  RefreshCw,
  AlertTriangle,
  Search
} from 'lucide-react';
import { getImageUrl } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import hostService from '../../services/hostService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const HostListings = () => {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [listings, searchTerm, sortBy, statusFilter]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hostService.getHostListings();
      setListings(response.listings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...listings];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(term) ||
        listing.location.toLowerCase().includes(term) ||
        listing.description.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(listing => listing.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'price_high':
        filtered.sort((a, b) => Number(b.price_per_night) - Number(a.price_per_night));
        break;
      case 'price_low':
        filtered.sort((a, b) => Number(a.price_per_night) - Number(b.price_per_night));
        break;
      case 'rating':
        filtered.sort((a, b) => (Number(b.average_rating) || 0) - (Number(a.average_rating) || 0));
        break;
      case 'bookings':
        filtered.sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0));
        break;
      default:
        break;
    }

    setFilteredListings(filtered);
  };

  const handleDeleteListing = async (listingId) => {
    try {
      setDeleting(listingId);
      await hostService.deleteListing(listingId);
      setListings(prev => prev.filter(l => l.id !== listingId));
      setShowDeleteModal(null);
    } catch (error) {
      alert('Failed to delete listing: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    };
    
    const config = configs[status] || configs.active;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price_high', label: 'Price (High to Low)' },
    { value: 'price_low', label: 'Price (Low to High)' },
    { value: 'rating', label: 'Rating (High to Low)' },
    { value: 'bookings', label: 'Most Booked' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load listings</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={loadListings} variant="gradient">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">My Listings</h1>
          <p className="text-gray-400">Manage your property listings</p>
        </div>
        <Button
          onClick={() => navigate('/host/listings/create')}
          variant="gradient"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Listing
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white"
            />
          </div>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-2"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-gray-800">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-16">
          <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchTerm ? 'No listings found' : 'No listings yet'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchTerm ? 'Try adjusting your search criteria' : 'Start by creating your first listing'}
          </p>
          <Button
            onClick={() => navigate('/host/listings/create')}
            variant="gradient"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Listing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="bg-gray-800 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300">
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                {listing.image_url ? (
                  <img 
                    src={getImageUrl(listing.image_url)}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/placeholder.jpg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-500" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  {getStatusBadge(listing.status)}
                </div>

                {/* Media Indicators */}
                <div className="absolute top-3 right-3 flex space-x-2">
                  {listing.image_url && (
                    <div className="bg-black/50 rounded-full p-2">
                      <ImageIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {listing.video_url && (
                    <div className="bg-black/50 rounded-full p-2">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                      {listing.title}
                    </h3>
                    <div className="flex items-center text-gray-400 text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{listing.location}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center text-gray-300">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span>₱{Number(listing.price_per_night).toLocaleString()}/night</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{listing.booking_count || 0} bookings</span>
                  </div>
                  {listing.average_rating && (
                    <div className="flex items-center text-gray-300">
                      <Star className="w-4 h-4 mr-1 text-yellow-400 fill-current" />
                      <span>{Number(listing.average_rating).toFixed(1)} rating</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-300">
                    <Eye className="w-4 h-4 mr-1" />
                    <span>{listing.view_count || 0} views</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300"
                    onClick={() => window.open(`/listings/${listing.id}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="gradient"
                    className="flex-1"
                    onClick={() => navigate(`/host/listings/edit/${listing.id}`)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white px-3"
                    onClick={() => setShowDeleteModal(listing)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Listing</h3>
            
            <div className="mb-4">
              <p className="text-gray-300 mb-3">
                Are you sure you want to delete <strong>"{showDeleteModal.title}"</strong>?
              </p>
              
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  ⚠️ This action cannot be undone. All booking history will be preserved, but the listing will no longer be available for new bookings.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1 bg-red-600 hover:bg-red-700"
                loading={deleting === showDeleteModal.id}
                onClick={() => handleDeleteListing(showDeleteModal.id)}
              >
                Delete Listing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostListings;