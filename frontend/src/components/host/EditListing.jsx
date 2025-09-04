// frontend/src/components/host/EditListing.jsx - Multiple Images (3-4) + 1 Video Support
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
    latitude: '',
    longitude: '',
    status: 'active'
  });
  
  // UPDATED: Multiple images support
  const [newImageFiles, setNewImageFiles] = useState([]); // New images to upload
  const [videoFile, setVideoFile] = useState(null);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [videoPreview, setVideoPreview] = useState(null);
  const [currentImages, setCurrentImages] = useState([]); // Existing images
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

      // UPDATED: Handle multiple existing images - FIXED JSON PARSING
      let existingImages = [];
      
      // Try to get images from the new 'images' JSON column first
      if (listing.images) {
        try {
          // Parse JSON string to array
          const parsedImages = typeof listing.images === 'string' 
            ? JSON.parse(listing.images) 
            : listing.images;
          
          if (Array.isArray(parsedImages) && parsedImages.length > 0) {
            existingImages = parsedImages.map((img, index) => ({
              id: index + 1,
              url: img.startsWith('/uploads/') ? img : `/uploads/${img.split('/').pop()}`,
              isExisting: true
            }));
          }
        } catch (e) {
          console.warn('Failed to parse images JSON:', e);
        }
      }
      
      // Fallback to single image_url if no images found
      if (existingImages.length === 0 && listing.image_url) {
        const imageUrl = listing.image_url.startsWith('/uploads/') 
          ? listing.image_url 
          : `/uploads/${listing.image_url.split('/').pop()}`;
        existingImages = [{ id: 1, url: imageUrl, isExisting: true }];
      }
      
      setCurrentImages(existingImages);
      console.log('📁 Loaded existing images:', existingImages);
      
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

  // UPDATED: Handle multiple new image uploads
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Check total image limit (existing + new)
    const totalImages = currentImages.length + newImageFiles.length + files.length;
    if (totalImages > 4) {
      setErrors(prev => ({ ...prev, image: 'Maximum 4 images allowed total' }));
      return;
    }

    console.log(`📁 ${files.length} new image files selected`);

    const validFiles = [];
    const newPreviews = [];
    let hasErrors = false;

    files.forEach((file, index) => {
      // Validate each image
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: 'Please select valid image files only' }));
        hasErrors = true;
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setErrors(prev => ({ ...prev, image: 'Each image must be less than 10MB' }));
        hasErrors = true;
        return;
      }

      validFiles.push(file);

      // Create preview for each valid file
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push({
          id: Date.now() + index,
          url: e.target.result,
          file: file,
          isNew: true
        });

        // Update state when all previews are ready
        if (newPreviews.length === validFiles.length) {
          setNewImageFiles(prev => [...prev, ...validFiles]);
          setNewImagePreviews(prev => [...prev, ...newPreviews]);
          console.log(`✅ ${validFiles.length} new image previews created`);
        }
      };
      reader.readAsDataURL(file);
    });

    if (!hasErrors) {
      setErrors(prev => ({ ...prev, image: '' }));
    }

    // Clear the file input
    e.target.value = '';
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

  // UPDATED: Remove existing image
  const removeExistingImage = (imageId) => {
    console.log('🗑️ Removing existing image with ID:', imageId);
    setCurrentImages(prev => prev.filter(img => img.id !== imageId));
  };

  // UPDATED: Remove new image
  const removeNewImage = (imageId) => {
    console.log('🗑️ Removing new image with ID:', imageId);
    setNewImageFiles(prev => {
      const imageToRemove = newImagePreviews.find(img => img.id === imageId);
      if (imageToRemove) {
        return prev.filter(file => file !== imageToRemove.file);
      }
      return prev;
    });
    setNewImagePreviews(prev => prev.filter(img => img.id !== imageId));
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
      
      // Prepare data for hostService update
      const updateData = {
        title: formData.title?.trim(),
        description: formData.description?.trim(),
        location: formData.location?.trim(),
        price_per_night: formData.price_per_night,
        max_guests: formData.max_guests,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        amenities: formData.amenities?.trim(),
        house_rules: formData.house_rules?.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        status: formData.status
      };

      // UPDATED: Add new images if they exist
      if (newImageFiles.length > 0) {
        updateData.images = newImageFiles; // Array of File objects
      }
      if (videoFile) {
        updateData.video = videoFile;
      }

      console.log('🚀 Using hostService.updateListing with data:', updateData);

      // Use hostService instead of direct API call
      const result = await hostService.updateListing(id, updateData);
      
      if (result.success) {
        navigate('/host/listings', { 
          state: { message: result.message || 'Listing updated successfully!' }
        });
      }
      
    } catch (error) {
      console.error('❌ Update error:', error);
      setErrors({ submit: error.message });
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

  // Calculate total images (existing + new)
  const totalImages = currentImages.length + newImageFiles.length;
  const canAddMoreImages = totalImages < 4;

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
          {/* UPDATED: Multiple Images Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Property Images ({totalImages}/4)
            </h3>
            
            {/* Existing Images */}
            {currentImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-3">Current Images</p>
                <div className="grid grid-cols-2 gap-3">
                  {currentImages.map((image, index) => (
                    <div key={image.id} className="relative">
                      <img 
                        src={image.url} 
                        alt={`Current ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(image.id)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images */}
            {newImagePreviews.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-3">New Images</p>
                <div className="grid grid-cols-2 gap-3">
                  {newImagePreviews.map((preview, index) => (
                    <div key={preview.id} className="relative">
                      <img 
                        src={preview.url} 
                        alt={`New ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(preview.id)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-1 py-0.5 rounded">
                        New
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Upload Area */}
            {canAddMoreImages && (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-purple-500 transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  multiple
                  className="hidden"
                  id="image-upload-edit"
                />
                <label htmlFor="image-upload-edit" className="cursor-pointer">
                  <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">
                    {currentImages.length === 0 && newImageFiles.length === 0
                      ? 'Add Images'
                      : `Add More (${4 - totalImages} remaining)`
                    }
                  </p>
                  <p className="text-gray-500 text-xs">PNG, JPG, GIF up to 10MB each</p>
                  <p className="text-gray-500 text-xs">Select multiple files at once</p>
                </label>
              </div>
            )}
            {errors.image && <p className="text-red-400 text-sm mt-2">{errors.image}</p>}
          </div>

          {/* Video Section */}
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
                    className="w-full h-32 object-cover rounded-lg"
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
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-purple-500 transition cursor-pointer">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload-edit"
              />
              <label htmlFor="video-upload-edit" className="cursor-pointer">
                <Video className="w-6 h-6 text-gray-400 mx-auto mb-2" />
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

            {/* Media Summary */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-300 mb-2">Media Files</p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Images: {totalImages}/4</p>
                <p>Video: {currentVideo || videoFile ? 'Yes' : 'None'}</p>
              </div>
            </div>

            {/* File Status Debug */}
            {(newImageFiles.length > 0 || videoFile) && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-300 mb-2">New Files to Upload</p>
                <div className="text-xs text-gray-400 space-y-1">
                  {newImageFiles.length > 0 && (
                    <p>New Images: {newImageFiles.length}</p>
                  )}
                  {videoFile && (
                    <p>New Video: {videoFile.name}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditListing;