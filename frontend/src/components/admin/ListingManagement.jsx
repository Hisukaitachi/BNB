// frontend/src/components/admin/ListingManagement.jsx - FIXED TO MATCH BACKEND
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Filter, 
  Eye, 
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Star,
  RefreshCw,
  Image as ImageIcon,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import { getImageUrl } from '../../services/api';
import adminService from '../../services/adminService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ListingManagement = () => {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hostFilter, setHostFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showListingModal, setShowListingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Get unique hosts and locations for filters
  const uniqueHosts = [...new Set(listings.map(l => l.host_name).filter(Boolean))];
  const uniqueLocations = [...new Set(listings.map(l => l.location).filter(Boolean))];

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, searchTerm, hostFilter, locationFilter]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllListings();
      console.log('Loaded listings:', data);
      setListings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...listings];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(listing => 
        listing.title?.toLowerCase().includes(term) ||
        listing.location?.toLowerCase().includes(term) ||
        listing.host_name?.toLowerCase().includes(term) ||
        listing.id?.toString().includes(term)
      );
    }

    // Host filter
    if (hostFilter !== 'all') {
      filtered = filtered.filter(listing => listing.host_name === hostFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(listing => listing.location === locationFilter);
    }

    setFilteredListings(filtered);
  };

  const handleRemoveListing = async (listingId, reason = '') => {
    try {
      if (!reason) {
        reason = prompt('Reason for removing this listing:');
        if (!reason) return;
      }

      if (!confirm('Are you sure you want to remove this listing? This action cannot be undone.')) {
        return;
      }

      setActionLoading(prev => ({ ...prev, [listingId]: 'remove' }));
      
      const result = await adminService.removeListing(listingId, reason);

      if (result.success) {
        await loadListings(); // Refresh listings
        alert('Listing removed successfully');
      }
    } catch (error) {
      alert(`Failed to remove listing: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [listingId]: false }));
    }
  };

  const formatPrice = (price) => {
    return `₱${Number(price || 0).toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadListings} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Listing Management</h1>
          <p className="text-gray-400">
            {filteredListings.length} of {listings.length} listings
          </p>
        </div>
        
        <Button
          onClick={loadListings}
          variant="outline"
          className="border-gray-600 text-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <select
            value={hostFilter}
            onChange={(e) => setHostFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Hosts</option>
            {uniqueHosts.map(host => (
              <option key={host} value={host}>{host}</option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Locations</option>
            {uniqueLocations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>Filters Applied</span>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No listings found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="bg-gray-700 rounded-xl overflow-hidden">
                {/* Listing Image */}
                <div className="relative h-48 bg-gray-600">
                  {listing.image_url ? (
                    <img 
                      src={getImageUrl(listing.image_url)}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  
                  <div className="absolute top-2 right-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      Active
                    </span>
                  </div>
                </div>

                {/* Listing Details */}
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="text-white font-semibold text-lg line-clamp-1">
                      {listing.title || 'Untitled Listing'}
                    </h3>
                    <div className="flex items-center text-gray-400 text-sm mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="line-clamp-1">{listing.location || 'Location not specified'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center text-gray-300">
                      <User className="w-4 h-4 mr-2 text-blue-400" />
                      <span className="truncate">{listing.host_name || 'Unknown Host'}</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <DollarSign className="w-4 h-4 mr-2 text-green-400" />
                      <span>{formatPrice(listing.price_per_night)}/night</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                      <span>{listing.total_bookings || 0} bookings</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Star className="w-4 h-4 mr-2 text-yellow-400" />
                      <span>{Number(listing.avg_rating || 0).toFixed(1)} rating</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white flex-1"
                      onClick={() => {
                        setSelectedListing(listing);
                        setShowListingModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>

                    <div className="relative group">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      
                      <div className="absolute right-0 mt-2 w-48 bg-gray-600 rounded-lg shadow-lg border border-gray-500 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/listings/${listing.id}`);
                            alert('Listing URL copied to clipboard');
                          }}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-500 w-full text-left"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Copy URL</span>
                        </button>
                        
                        <button
                          onClick={() => window.open(`/listings/${listing.id}`, '_blank')}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-500 w-full text-left"
                        >
                          <Home className="w-4 h-4" />
                          <span>View Public</span>
                        </button>
                        
                        <button
                          onClick={() => handleRemoveListing(listing.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-gray-500 w-full text-left"
                          disabled={actionLoading[listing.id]}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Remove Listing</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listing Detail Modal */}
      {showListingModal && selectedListing && (
        <ListingDetailModal 
          listing={selectedListing}
          onClose={() => {
            setShowListingModal(false);
            setSelectedListing(null);
          }}
          onRemove={handleRemoveListing}
        />
      )}
    </div>
  );
};

// Listing Detail Modal Component
const ListingDetailModal = ({ listing, onClose, onRemove }) => {
  const formatPrice = (price) => `₱${Number(price || 0).toLocaleString()}`;
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Listing Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Images */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Images</h3>
              <div className="space-y-2">
                {(() => {
                  // Try to get image URL from multiple sources
                  let imageUrl = null;
                  
                  if (listing.image_url) {
                    imageUrl = listing.image_url.startsWith('http') 
                      ? listing.image_url 
                      : `http://localhost:5000${listing.image_url}`;
                  } else if (listing.images) {
                    try {
                      const imagesArray = typeof listing.images === 'string' 
                        ? JSON.parse(listing.images) 
                        : listing.images;
                      if (Array.isArray(imagesArray) && imagesArray.length > 0) {
                        imageUrl = imagesArray[0].startsWith('http') 
                          ? imagesArray[0] 
                          : `http://localhost:5000${imagesArray[0]}`;
                      }
                    } catch (e) {
                      console.error('Failed to parse images JSON:', e);
                    }
                  }

                  return imageUrl ? (
                    <img 
                      src={getImageUrl(listing.image_url)}
                      alt={listing.title}
                      className="w-full h-64 object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Modal image failed to load:', e.target.src);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <span className="text-gray-400 ml-2">No image available</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">ID:</span>
                    <span className="text-white ml-2">{listing.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Title:</span>
                    <span className="text-white ml-2">{listing.title || 'Untitled'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <span className="text-white ml-2">{listing.location || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Price per night:</span>
                    <span className="text-white ml-2">{formatPrice(listing.price_per_night)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Host:</span>
                    <span className="text-white ml-2">{listing.host_name || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Host Email:</span>
                    <span className="text-white ml-2">{listing.host_email || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white ml-2">{formatDate(listing.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-4">Description</h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-300">{listing.description || 'No description provided'}</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-4">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-white">{listing.total_bookings || 0}</div>
                <div className="text-gray-400 text-sm">Total Bookings</div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {Number(listing.avg_rating || 0).toFixed(1)}
                </div>
                <div className="text-gray-400 text-sm">Average Rating</div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-green-400">
                  {formatPrice((listing.total_bookings || 0) * (listing.price_per_night || 0))}
                </div>
                <div className="text-gray-400 text-sm">Est. Revenue</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Close
            </Button>
            
            <Button
              onClick={() => window.open(`/listings/${listing.id}`, '_blank')}
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Public
            </Button>
            
            <Button
              onClick={() => {
                onRemove(listing.id);
                onClose();
              }}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Listing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingManagement;