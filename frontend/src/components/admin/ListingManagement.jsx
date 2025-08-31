// frontend/src/components/admin/ListingManagement.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X,
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Star,
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon,
  MoreHorizontal
} from 'lucide-react';
import adminService from '../../services/adminService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ListingManagement = () => {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showListingModal, setShowListingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, searchTerm, statusFilter]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllListings();
      console.log('Loaded listings:', data); // ✅ DEBUG: Check what data looks like
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

    // Status filter - ✅ FIXED: Handle undefined status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(listing => {
        const listingStatus = listing.status || 'active'; // Default to 'active'
        return listingStatus === statusFilter;
      });
    }

    setFilteredListings(filtered);
  };

  const handleListingAction = async (listingId, action, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [listingId]: action }));
      
      let result;
      switch (action) {
        case 'approve':
          result = await adminService.approveListing(listingId);
          break;
        case 'reject':
          if (!reason) {
            reason = prompt('Reason for rejection:');
            if (!reason) return;
          }
          result = await adminService.rejectListing(listingId, reason);
          break;
        case 'delete':
          if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
          result = await adminService.deleteListing(listingId);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.success) {
        await loadListings(); // Refresh listings
        alert(`Listing ${action}d successfully`);
      }
    } catch (error) {
      alert(`Failed to ${action} listing: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [listingId]: false }));
    }
  };

  // ✅ FIXED: Handle undefined/null status safely
  const getStatusBadge = (status) => {
    // ✅ FIXED: Provide default value if status is undefined/null
    const safeStatus = status || 'active';
    
    const badges = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    
    // ✅ FIXED: Safely capitalize the status
    const label = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[safeStatus] || 'bg-gray-100 text-gray-800'}`}>
        {label}
      </span>
    );
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
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
            {filteredListings.map((listing) => {
              // ✅ FIXED: Ensure listing has required properties
              const safeStatus = listing.status || 'active';
              console.log(`Listing ${listing.id} status:`, safeStatus); // ✅ DEBUG
              
              return (
                <div key={listing.id} className="bg-gray-700 rounded-xl overflow-hidden">
                  {/* Listing Image */}
                  <div className="relative h-48 bg-gray-600">
                    {listing.image_url ? (
                      <img 
                        src={`http://localhost:5000${listing.image_url}`}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(safeStatus)}
                    </div>
                    
                    {safeStatus === 'pending' && (
                      <div className="absolute top-2 left-2">
                        <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                          Needs Review
                        </span>
                      </div>
                    )}
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
                        <span>{listing.host_name || 'Unknown Host'}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <DollarSign className="w-4 h-4 mr-2 text-green-400" />
                        <span>₱{Number(listing.price_per_night || 0).toLocaleString()}/night</span>
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
                        className="text-gray-400 flex-1"
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowListingModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>

                      {safeStatus === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-400 hover:text-green-300"
                            loading={actionLoading[listing.id] === 'approve'}
                            onClick={() => handleListingAction(listing.id, 'approve')}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            loading={actionLoading[listing.id] === 'reject'}
                            onClick={() => handleListingAction(listing.id, 'reject')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      <div className="relative group">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400"
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
                            <Home className="w-4 h-4" />
                            <span>Copy URL</span>
                          </button>
                          
                          <button
                            onClick={() => handleListingAction(listing.id, 'delete')}
                            className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:bg-gray-500 w-full text-left"
                            disabled={actionLoading[listing.id]}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
          onAction={handleListingAction}
        />
      )}
    </div>
  );
};

// ✅ FIXED: Listing Detail Modal Component
const ListingDetailModal = ({ listing, onClose, onAction }) => {
  // ✅ FIXED: Safe status handling
  const safeStatus = listing.status || 'active';
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Listing Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Images */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Images</h3>
              <div className="grid grid-cols-2 gap-2">
                {listing.image_url ? (
                  <img 
                    src={`http://localhost:5000${listing.image_url}`}
                    alt={listing.title}
                    className="w-full h-32 object-cover rounded-lg col-span-2"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="col-span-2 h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <span className="text-gray-400 ml-2">No image available</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
                <div className="space-y-3">
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
                    <span className="text-white ml-2">₱{Number(listing.price_per_night || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Host:</span>
                    <span className="text-white ml-2">{listing.host_name || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="text-white ml-2">{safeStatus}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white ml-2">
                      {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-white">{listing.total_bookings || 0}</div>
                <div className="text-gray-400 text-sm">Total Bookings</div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-white">{listing.review_count || 0}</div>
                <div className="text-gray-400 text-sm">Reviews</div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {Number(listing.avg_rating || 0).toFixed(1)}
                </div>
                <div className="text-gray-400 text-sm">Rating</div>
              </div>
              <div className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-green-400">
                  ₱{Number(listing.total_revenue || 0).toLocaleString()}
                </div>
                <div className="text-gray-400 text-sm">Revenue</div>
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
            
            {safeStatus === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    onAction(listing.id, 'reject');
                    onClose();
                  }}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    onAction(listing.id, 'approve');
                    onClose();
                  }}
                  variant="gradient"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingManagement;