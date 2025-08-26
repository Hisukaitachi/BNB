// src/components/host/ListingsTab.jsx - Fixed with Full Functionality
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Building2, Eye, Heart, MapPin, Star, 
  Edit, Trash2, MoreVertical, Copy, ExternalLink,
  Upload, X, Save, DollarSign, Users, Bed
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const navigate = useNavigate();
  const { showToast } = useApp();

  // Form state for add/edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    price_per_night: '',
    max_guests: '',
    bedrooms: '',
    bathrooms: '',
    amenities: [],
    house_rules: '',
    cancellation_policy: 'flexible',
    property_type: 'apartment',
    status: 'active'
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);

  // Available options
  const amenitiesList = [
    'WiFi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating',
    'TV', 'Hot tub', 'Pool', 'Gym', 'Parking', 'Elevator', 'Balcony',
    'Garden', 'Beach access', 'Pet friendly', 'Smoking allowed', 'Events allowed'
  ];

  const propertyTypes = [
    'apartment', 'house', 'condo', 'villa', 'studio', 'loft', 'townhouse', 'cabin'
  ];

  const cancellationPolicies = [
    { value: 'flexible', label: 'Flexible' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'strict', label: 'Strict' },
    { value: 'super_strict', label: 'Super Strict' }
  ];

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

  const handleAddListing = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditListing = (listing) => {
    setSelectedListing(listing);
    setFormData({
      title: listing.title || '',
      description: listing.description || '',
      location: listing.location || '',
      price_per_night: listing.price_per_night || '',
      max_guests: listing.max_guests || '',
      bedrooms: listing.bedrooms || '',
      bathrooms: listing.bathrooms || '',
      amenities: Array.isArray(listing.amenities) 
        ? listing.amenities 
        : (listing.amenities ? listing.amenities.split(',') : []),
      house_rules: listing.house_rules || '',
      cancellation_policy: listing.cancellation_policy || 'flexible',
      property_type: listing.property_type || 'apartment',
      status: listing.status || 'active'
    });
    setImagePreview(listing.image_url);
    setShowEditModal(true);
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

  const handleSaveListing = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!formData.title || !formData.location || !formData.price_per_night) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      const listingData = {
        ...formData,
        price_per_night: parseFloat(formData.price_per_night),
        max_guests: parseInt(formData.max_guests) || 1,
        bedrooms: parseInt(formData.bedrooms) || 1,
        bathrooms: parseInt(formData.bathrooms) || 1,
        amenities: formData.amenities.join(',')
      };

      const files = selectedImages.length > 0 ? { image: selectedImages[0] } : {};

      if (selectedListing) {
        // Update existing listing
        await api.updateListing(selectedListing.id, listingData);
        showToast('Listing updated successfully', 'success');
        setShowEditModal(false);
      } else {
        // Create new listing
        await api.createListing(listingData, files);
        showToast('Listing created successfully', 'success');
        setShowAddModal(false);
      }

      fetchListings(); // Refresh listings
      resetForm();
    } catch (error) {
      console.error('Failed to save listing:', error);
      showToast(error.message || 'Failed to save listing', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      price_per_night: '',
      max_guests: '',
      bedrooms: '',
      bathrooms: '',
      amenities: [],
      house_rules: '',
      cancellation_policy: 'flexible',
      property_type: 'apartment',
      status: 'active'
    });
    setSelectedImages([]);
    setImagePreview(null);
    setSelectedListing(null);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(files);
    
    if (files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(files[0]);
    }
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
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

  // Render form modal
  const renderFormModal = (isEdit = false) => (
    <Modal
      isOpen={isEdit ? showEditModal : showAddModal}
      onClose={() => {
        if (isEdit) setShowEditModal(false);
        else setShowAddModal(false);
        resetForm();
      }}
      title={isEdit ? 'Edit Listing' : 'Add New Listing'}
      size="lg"
    >
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="Beautiful apartment in the city center"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Location <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="Cebu City, Philippines"
            />
          </div>
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Price/Night <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={formData.price_per_night}
              onChange={(e) => setFormData({...formData, price_per_night: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="2500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Max Guests</label>
            <input
              type="number"
              value={formData.max_guests}
              onChange={(e) => setFormData({...formData, max_guests: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="4"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Bedrooms</label>
            <input
              type="number"
              value={formData.bedrooms}
              onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Bathrooms</label>
            <input
              type="number"
              value={formData.bathrooms}
              onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="1"
            />
          </div>
        </div>

        {/* Property Type and Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Property Type</label>
            <select
              value={formData.property_type}
              onChange={(e) => setFormData({...formData, property_type: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              {propertyTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Cancellation Policy</label>
            <select
              value={formData.cancellation_policy}
              onChange={(e) => setFormData({...formData, cancellation_policy: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              {cancellationPolicies.map(policy => (
                <option key={policy.value} value={policy.value}>
                  {policy.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            placeholder="Describe your property..."
          />
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Amenities</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {amenitiesList.map(amenity => (
              <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* House Rules */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">House Rules</label>
          <textarea
            value={formData.house_rules}
            onChange={(e) => setFormData({...formData, house_rules: e.target.value})}
            rows="2"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            placeholder="No smoking, No pets, Quiet hours after 10 PM..."
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Property Images</label>
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-purple-500 file:text-white hover:file:bg-purple-600"
              multiple
            />
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-32 h-24 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setSelectedImages([]);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <Button
          variant="outline"
          onClick={() => {
            if (isEdit) setShowEditModal(false);
            else setShowAddModal(false);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveListing}
          loading={saving}
          icon={<Save className="w-4 h-4" />}
        >
          {isEdit ? 'Update' : 'Create'} Listing
        </Button>
      </div>
    </Modal>
  );

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
          onClick={handleAddListing}
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
          <Button onClick={handleAddListing}>
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
                      onClick={() => handleEditListing(listing)}
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
                </div>
                
                <div className="flex items-center text-gray-400 text-sm mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="line-clamp-1">{listing.location}</span>
                </div>

                {/* Property Details */}
                <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{listing.max_guests || 1} guests</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Bed className="w-4 h-4" />
                    <span>{listing.bedrooms || 1} beds</span>
                  </div>
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
                    onClick={() => handleEditListing(listing)}
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

      {/* Add Modal */}
      {renderFormModal(false)}

      {/* Edit Modal */}
      {renderFormModal(true)}

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