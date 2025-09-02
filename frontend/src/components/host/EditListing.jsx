// frontend/src/components/host/EditListing.jsx - Fixed Edit Listing with Interactive Map
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Upload, 
  Image as ImageIcon,
  Video,
  RefreshCw,
  AlertTriangle,
  Eye,
  MapPin,
  Target
} from 'lucide-react';
import hostService from '../../services/hostService';
import listingService from '../../services/listingService';
import api from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Textarea } from '../ui/Input';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Location Picker Component for Edit
const LocationPickerEdit = ({ onLocationSelect, selectedLocation, initialLocation }) => {
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        onLocationSelect({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6))
        });
      },
    });

    return selectedLocation ? (
      <Marker 
        position={[selectedLocation.lat, selectedLocation.lng]}
        icon={L.divIcon({
          className: 'custom-location-marker',
          html: `<div style="
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            background: linear-gradient(135deg, #10b981, #059669); 
            border: 4px solid white;
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="color: white; font-size: 14px; font-weight: bold;">📍</span>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })}
      />
    ) : null;
  };

  // Determine map center - use selected location, initial location, or default to Cebu
  const getMapCenter = () => {
    if (selectedLocation) return [selectedLocation.lat, selectedLocation.lng];
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      return [initialLocation.lat, initialLocation.lng];
    }
    return [10.3157, 123.8854]; // Cebu City default
  };

  return (
    <div className="relative">
      <MapContainer 
        center={getMapCenter()}
        zoom={14} 
        style={{ height: '300px', width: '100%' }}
        className="rounded-lg cursor-crosshair"
        key={`${selectedLocation?.lat}-${selectedLocation?.lng}`} // Force re-render when location changes
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker />
      </MapContainer>
      
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <span>Click to update location</span>
        </div>
      </div>
    </div>
  );
};

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    price_per_night: '',
    max_guests: 1,
    bedrooms: 1,
    bathrooms: 1,
    amenities: '',
    house_rules: '',
    check_in_time: '15:00',
    check_out_time: '11:00',
    minimum_stay: 1,
    maximum_stay: 30,
    latitude: '',
    longitude: '',
    status: 'active'
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [errors, setErrors] = useState({});
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [initialMapLocation, setInitialMapLocation] = useState(null);

  useEffect(() => {
    if (id) {
      loadListing();
    }
  }, [id]);

  const loadListing = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await listingService.getListingById(id);
      const listing = response.data.listing;
      
      setFormData({
        title: listing.title || '',
        description: listing.description || '',
        location: listing.location || '',
        price_per_night: listing.price_per_night || '',
        max_guests: listing.max_guests || 1,
        bedrooms: listing.bedrooms || 1,
        bathrooms: listing.bathrooms || 1,
        amenities: listing.amenities || '',
        house_rules: listing.house_rules || '',
        check_in_time: listing.check_in_time || '15:00',
        check_out_time: listing.check_out_time || '11:00',
        minimum_stay: listing.minimum_stay || 1,
        maximum_stay: listing.maximum_stay || 30,
        latitude: listing.latitude || '',
        longitude: listing.longitude || '',
        status: listing.status || 'active'
      });

      // Set map location if coordinates exist
      if (listing.latitude && listing.longitude) {
        const mapLocation = {
          lat: Number(listing.latitude),
          lng: Number(listing.longitude)
        };
        setSelectedMapLocation(mapLocation);
        setInitialMapLocation(mapLocation);
      }

      // Set current media
      if (listing.image_url) {
        setCurrentImage(`/uploads/${listing.image_url.split('/').pop()}`);
      }
      if (listing.video_url) {
        setCurrentVideo(`/uploads/${listing.video_url.split('/').pop()}`);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedMapLocation(location);
    setFormData(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng
    }));
    
    // Clear location-related errors
    setErrors(prev => ({ 
      ...prev, 
      latitude: '', 
      longitude: '',
      location_coordinates: ''
    }));
  };

  const handleManualCoordinates = (field, value) => {
    const numValue = value === '' ? '' : Number(value);
    
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));

    // Update map marker if both coordinates are valid
    if (field === 'latitude' && formData.longitude && numValue) {
      setSelectedMapLocation({ lat: numValue, lng: formData.longitude });
    } else if (field === 'longitude' && formData.latitude && numValue) {
      setSelectedMapLocation({ lat: formData.latitude, lng: numValue });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image file' }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'Image size must be less than 10MB' }));
      return;
    }

    setImageFile(file);
    setErrors(prev => ({ ...prev, image: '' }));

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi'];
    if (!allowedVideoTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, video: 'Please select a valid video file (MP4, MOV, WebM, AVI)' }));
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, video: 'Video size must be less than 100MB' }));
      return;
    }

    setVideoFile(file);
    setErrors(prev => ({ ...prev, video: '' }));

    const reader = new FileReader();
    reader.onload = (e) => setVideoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeNewImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setErrors(prev => ({ ...prev, image: '' }));
  };

  const removeNewVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setErrors(prev => ({ ...prev, video: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.price_per_night || formData.price_per_night <= 0) {
      newErrors.price_per_night = 'Valid price is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      setSaving(true);
      
      // Check if we have new files to upload
      if (imageFile || videoFile) {
        // If there are new files, use FormData approach
        const formDataWithFiles = new FormData();
        
        // Add all text fields to FormData
        Object.keys(formData).forEach(key => {
          if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
            formDataWithFiles.append(key, formData[key]);
          }
        });
        
        // Add files
        if (imageFile) {
          formDataWithFiles.append('image', imageFile);
        }
        if (videoFile) {
          formDataWithFiles.append('video', videoFile);
        }

        // Use direct API call with FormData
        await api.put(`/listings/${id}`, formDataWithFiles, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
      } else {
        // If no new files, just update the listing data
        await hostService.updateListing(id, formData);
      }
      
      navigate('/host/listings', { 
        state: { message: 'Listing updated successfully!' }
      });
    } catch (error) {
      console.error('Update error:', error);
      
      // Get the actual error message from the response
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update listing';
      
      console.error('Detailed error:', error.response?.data);
      setErrors({ submit: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load listing</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={loadListing} variant="gradient">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/host/listings')}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Listing</h1>
            <p className="text-gray-400">Update your property information</p>
          </div>
        </div>
        
        <Button
          onClick={() => window.open(`/listings/${id}`, '_blank')}
          variant="outline"
          className="border-gray-600 text-gray-300"
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl p-6">
            {errors.submit && (
              <div className="mb-6 bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4">
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <Input
                    label="Property Title *"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    error={errors.title}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Textarea
                    label="Description *"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    error={errors.description}
                    rows={4}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Location *"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    error={errors.location}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Interactive Map Location Selector */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Property Location
                </h3>
                
                <div className="space-y-4">
                  {/* Interactive Map */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-3">
                      Click on the map to update your property location
                    </label>
                    <LocationPickerEdit 
                      onLocationSelect={handleLocationSelect}
                      selectedLocation={selectedMapLocation}
                      initialLocation={initialMapLocation}
                    />
                  </div>

                  {/* Selected Coordinates Display */}
                  {selectedMapLocation && (
                    <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                      <h4 className="text-green-400 font-medium mb-2 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Current Location
                      </h4>
                      <div className="text-green-300 text-sm space-y-1">
                        <p>Latitude: {selectedMapLocation.lat}</p>
                        <p>Longitude: {selectedMapLocation.lng}</p>
                      </div>
                    </div>
                  )}

                  {/* Manual Input */}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => handleManualCoordinates('latitude', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <Input
                      label="Longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => handleManualCoordinates('longitude', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Property Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Price per Night *"
                    name="price_per_night"
                    type="number"
                    value={formData.price_per_night}
                    onChange={handleInputChange}
                    error={errors.price_per_night}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Maximum Guests *"
                    name="max_guests"
                    type="number"
                    min="1"
                    value={formData.max_guests}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Bedrooms"
                    name="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Bathrooms"
                    name="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Check-in Time"
                    name="check_in_time"
                    type="time"
                    value={formData.check_in_time}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Check-out Time"
                    name="check_out_time"
                    type="time"
                    value={formData.check_out_time}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Minimum Stay (nights)"
                    name="minimum_stay"
                    type="number"
                    min="1"
                    value={formData.minimum_stay}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Input
                    label="Maximum Stay (nights)"
                    name="maximum_stay"
                    type="number"
                    min="1"
                    value={formData.maximum_stay}
                    onChange={handleInputChange}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  <Textarea
                    label="Amenities"
                    name="amenities"
                    value={formData.amenities}
                    onChange={handleInputChange}
                    placeholder="WiFi, Pool, Air Conditioning, Kitchen, Parking..."
                    rows={3}
                    className="bg-gray-700 border-gray-600 text-white"
                  />

                  <Textarea
                    label="House Rules"
                    name="house_rules"
                    value={formData.house_rules}
                    onChange={handleInputChange}
                    placeholder="No smoking, No pets, Check-in after 3 PM..."
                    rows={3}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-300 mb-2">Listing Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/host/listings')}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  loading={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Listing
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Media Upload Sidebar */}
        <div className="space-y-6">
          {/* Current Image */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Property Image</h3>
            
            {/* Current Image Display */}
            {(currentImage || imagePreview) && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  {imagePreview ? 'New Image (Preview)' : 'Current Image'}
                </p>
                <div className="relative">
                  <img 
                    src={imagePreview || currentImage} 
                    alt="Property"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeNewImage}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload-edit"
              />
              <label htmlFor="image-upload-edit" className="cursor-pointer">
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-300 text-sm">
                  {currentImage ? 'Upload New Image' : 'Upload Image'}
                </p>
                <p className="text-gray-500 text-xs">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
            {errors.image && <p className="text-red-400 text-sm mt-2">{errors.image}</p>}
          </div>

          {/* Current Video */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Property Video</h3>
            
            {/* Current Video Display */}
            {(currentVideo || videoPreview) && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  {videoPreview ? 'New Video (Preview)' : 'Current Video'}
                </p>
                <div className="relative">
                  <video 
                    src={videoPreview || currentVideo} 
                    className="w-full h-48 object-cover rounded-lg"
                    controls
                  />
                  {videoPreview && (
                    <button
                      type="button"
                      onClick={removeNewVideo}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Video Upload */}
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition cursor-pointer">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload-edit"
              />
              <label htmlFor="video-upload-edit" className="cursor-pointer">
                <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-300 text-sm">
                  {currentVideo ? 'Upload New Video' : 'Upload Video (Optional)'}
                </p>
                <p className="text-gray-500 text-xs">MP4, MOV, WebM up to 100MB</p>
              </label>
            </div>
            {errors.video && <p className="text-red-400 text-sm mt-2">{errors.video}</p>}
          </div>

          {/* Listing Stats */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Listing Performance</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Views</span>
                <span className="text-white">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bookings</span>
                <span className="text-white">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rating</span>
                <span className="text-white">No reviews yet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`capitalize ${
                  formData.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {formData.status}
                </span>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <label className="block text-sm text-gray-300 mb-2">Listing Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditListing;