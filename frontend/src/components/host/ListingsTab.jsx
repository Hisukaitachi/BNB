// src/components/host/ListingsTab.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Building2, Eye, Heart, MapPin, Star, 
  Edit, Trash2, MoreVertical, Copy, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

const ListingsTab = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useApp();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await api.getMyListings();
      if (response.status === 'success') {
        setListings(response.data.listings || []);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      showToast('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;
    
    try {
      setDeleting(true);
      await api.deleteListing(selectedListing.id);
      setListings(prev => prev.filter(l => l.id !== selectedListing.id));
      showToast('Listing deleted successfully', 'success');
      setShowDeleteModal(false);
      setSelectedListing(null);
    } catch (error) {
      console.error('Failed to delete listing:', error);
      showToast('Failed to delete listing', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const copyListingLink = (listingId) => {
    const url = `${window.location.origin}/listing/${listingId}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Listing link copied to clipboard', 'success');
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatRating = (rating) => {
    if (!rating || rating === null || rating === undefined) return 'New';
    const numRating = Number(rating);
    if (isNaN(numRating)) return 'New';
    return numRating.toFixed(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'inactive': return 'bg-gray-500/20 text-gray-400';
      case 'suspended': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return <Loading message="Loading your listings..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Listings</h2>
          <p className="text-gray-400">Manage your properties and track performance</p>
        </div>
        <Button 
          onClick={() => navigate('/host/listings/new')}
          icon={<Plus className="w-4 h-4" />}
        >
          Add New Listing
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Listings</p>
          <p className="text-2xl font-bold">{listings.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">
            {listings.filter(l => l.status === 'active').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">
            {listings.filter(l => l.status === 'pending').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Views</p>
          <p className="text-2xl font-bold">
            {listings.reduce((sum, l) => sum + (l.views || 0), 0)}
          </p>
        </div>
      </div>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-6">Create your first listing to start hosting</p>
          <Button onClick={() => navigate('/host/listings/new')}>
            Create Your First Listing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-750 transition-colors">
              {/* Image */}
              <div className="relative h-48 group">
                <img
                  src={listing.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                    {listing.status || 'active'}
                  </span>
                </div>
                
                {/* Views/Favorites */}
                <div className="absolute top-3 right-3 flex space-x-2">
                  <div className="bg-black/50 rounded-full px-2 py-1 flex items-center space-x-1">
                    <Eye className="w-3 h-3 text-white" />
                    <span className="text-white text-xs">{listing.views || 0}</span>
                  </div>
                  <div className="bg-black/50 rounded-full px-2 py-1 flex items-center space-x-1">
                    <Heart className="w-3 h-3 text-red-400" />
                    <span className="text-white text-xs">{listing.favorites || 0}</span>
                  </div>
                </div>

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      icon={<ExternalLink className="w-4 h-4" />}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/host/listings/${listing.id}/edit`)}
                      icon={<Edit className="w-4 h-4" />}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg line-clamp-2 flex-1">{listing.title}</h3>
                  <div className="relative ml-2">
                    <button className="p-1 hover:bg-gray-700 rounded">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center text-gray-400 text-sm mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="line-clamp-1">{listing.location}</span>
                </div>
                
                {/* Stats Row */}
                <div className="flex items-center justify-between mb-4 text-sm">
                  <div className="flex items-center space-x-4 text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{formatRating(listing.average_rating)}</span>
                      {listing.review_count && (
                        <span>({listing.review_count})</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">{formatPrice(listing.price_per_night)}</span>
                    <span className="text-gray-400 text-sm block">/ night</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyListingLink(listing.id)}
                    icon={<Copy className="w-3 h-3" />}
                  >
                    Copy Link
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/host/listings/${listing.id}/edit`)}
                    icon={<Edit className="w-3 h-3" />}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-400 border-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      setSelectedListing(listing);
                      setShowDeleteModal(true);
                    }}
                    icon={<Trash2 className="w-3 h-3" />}
                  >
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedListing(null);
        }}
        title="Delete Listing"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete "<strong>{selectedListing?.title}</strong>"? 
            This action cannot be undone and all associated bookings will be cancelled.
          </p>
          
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedListing(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteListing}
              loading={deleting}
            >
              Delete Listing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ListingsTab;