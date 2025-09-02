// frontend/src/components/host/CreateListing.jsx - Create Listing with Interactive Map
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  MapPin, 
  DollarSign, 
  Home,
  Image as ImageIcon,
  Video,
  Save,
  Eye,
  Target
} from 'lucide-react';
import hostService from '../../services/hostService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Textarea } from '../ui/Input';
import MapComponent from '../common/MapComponent';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Location Picker Component
const LocationPicker = ({ onLocationSelect, selectedLocation }) => {
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

  return (
    <div className="relative">
      <MapContainer 
        center={[10.3157, 123.8854]} // Cebu City default
        zoom={12} 
        style={{ height: '400px', width: '100%' }}
        className="rounded-lg cursor-crosshair"
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
          <span>Click on the map to set location</span>
        </div>
      </div>
    </div>
  );
};

const CreateListing = () => {
  const navigate = useNavigate();
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
    longitude: ''
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
    
    // Clear errors when user starts typing
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

    // Validate image
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image file' }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrors(prev => ({ ...prev, image: 'Image size must be less than 10MB' }));
      return;
    }

    setImageFile(file);
    setErrors(prev => ({ ...prev, image: '' }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate video
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi'];
    if (!allowedVideoTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, video: 'Please select a valid video file (MP4, MOV, WebM, AVI)' }));
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit for videos
      setErrors(prev => ({ ...prev, video: 'Video size must be less than 100MB' }));
      return;
    }

    setVideoFile(file);
    setErrors(prev => ({ ...prev, video: '' }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setVideoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setErrors(prev => ({ ...prev, image: '' }));
  };

  const removeVideo = () => {
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
    if (formData.max_guests < 1) newErrors.max_guests = 'At least 1 guest must be allowed';
    if (formData.bedrooms < 0) newErrors.bedrooms = 'Bedrooms cannot be negative';
    if (formData.bathrooms < 0) newErrors.bathrooms = 'Bathrooms cannot be negative';

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
      setLoading(true);
      console.log('Submitting listing with data:', formData);
      console.log('Image file:', imageFile);
      console.log('Video file:', videoFile);
      
      const submissionData = {
        ...formData,
        image: imageFile,
        video: videoFile
      };

      const result = await hostService.createListing(submissionData);
      console.log('Create listing result:', result);
      
      if (result.success) {
        navigate('/host/listings', { 
          state: { message: 'Listing created successfully!' }
        });
      }
    } catch (error) {
      console.error('Create listing error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create listing';
      
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const step1Errors = {};
      if (!formData.title.trim()) step1Errors.title = 'Title is required';
      if (!formData.description.trim()) step1Errors.description = 'Description is required';
      if (!formData.location.trim()) step1Errors.location = 'Location is required';
      
      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 4));
    setErrors({});
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <Input
                  label="Property Title *"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  error={errors.title}
                  placeholder="Amazing beachfront villa with pool"
                  className="bg-gray-700 border-gray-600 text-white"
                />

                <Textarea
                  label="Description *"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  error={errors.description}
                  placeholder="Describe your property, its unique features, and what makes it special..."
                  rows={5}
                  className="bg-gray-700 border-gray-600 text-white"
                />

                <Input
                  label="Location *"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  error={errors.location}
                  placeholder="Cebu City, Philippines"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Select Property Location
              </h3>
              
              <div className="space-y-6">
                {/* Interactive Map */}
                <div>
                  <label className="block text-sm text-gray-300 mb-3">
                    Click on the map to select your property location *
                  </label>
                  <LocationPicker 
                    onLocationSelect={handleLocationSelect}
                    selectedLocation={selectedMapLocation}
                  />
                  {errors.location_coordinates && (
                    <p className="text-red-400 text-sm mt-2">{errors.location_coordinates}</p>
                  )}
                </div>

                {/* Selected Coordinates Display */}
                {selectedMapLocation && (
                  <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                    <h4 className="text-green-400 font-medium mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Selected Location
                    </h4>
                    <div className="text-green-300 text-sm space-y-1">
                      <p>Latitude: {selectedMapLocation.lat}</p>
                      <p>Longitude: {selectedMapLocation.lng}</p>
                    </div>
                  </div>
                )}

                {/* Manual Input (Optional) */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-4">
                    Or enter coordinates manually (optional)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => handleManualCoordinates('latitude', e.target.value)}
                      placeholder="10.3157"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <Input
                      label="Longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => handleManualCoordinates('longitude', e.target.value)}
                      placeholder="123.8854"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                {/* Location Tips */}
                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                  <h4 className="text-blue-400 font-medium mb-2">📍 Location Tips</h4>
                  <ul className="text-blue-300 text-sm space-y-1">
                    <li>• Click directly on your property's location on the map</li>
                    <li>• The more accurate the location, the easier it is for guests to find</li>
                    <li>• You can zoom in for better precision</li>
                    <li>• The location will be shown to guests on the listing page</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
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
                  placeholder="2500"
                  className="bg-gray-700 border-gray-600 text-white"
                />

                <Input
                  label="Maximum Guests *"
                  name="max_guests"
                  type="number"
                  min="1"
                  value={formData.max_guests}
                  onChange={handleInputChange}
                  error={errors.max_guests}
                  className="bg-gray-700 border-gray-600 text-white"
                />

                <Input
                  label="Bedrooms"
                  name="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  error={errors.bedrooms}
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
                  error={errors.bathrooms}
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
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Media Upload</h3>
              
              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3">Property Image *</label>
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300 mb-2">Click to upload property image</p>
                      <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                )}
                {errors.image && <p className="text-red-400 text-sm mt-2">{errors.image}</p>}
              </div>

              {/* Video Upload */}
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3">Property Video (Optional)</label>
                {videoPreview ? (
                  <div className="relative">
                    <video 
                      src={videoPreview} 
                      className="w-full h-64 object-cover rounded-lg"
                      controls
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                      id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300 mb-2">Click to upload property video</p>
                      <p className="text-gray-500 text-sm">MP4, MOV, WebM up to 100MB</p>
                    </label>
                  </div>
                )}
                {errors.video && <p className="text-red-400 text-sm mt-2">{errors.video}</p>}
              </div>

              {/* Upload Tips */}
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">📸 Photo & Video Tips</h4>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• Use high-quality, well-lit photos</li>
                  <li>• Show different angles and rooms</li>
                  <li>• Videos should be 30-60 seconds long</li>
                  <li>• Highlight unique features and amenities</li>
                  <li>• Ensure clean and tidy spaces</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
            step === currentStep ? 'bg-purple-600 text-white' :
            step < currentStep ? 'bg-green-600 text-white' :
            'bg-gray-700 text-gray-400'
          }`}>
            {step < currentStep ? '✓' : step}
          </div>
          {step < 4 && (
            <div className={`w-16 h-1 mx-2 ${
              step < currentStep ? 'bg-green-600' : 'bg-gray-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
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
            <h1 className="text-2xl font-bold text-white">Create New Listing</h1>
            <p className="text-gray-400">Add a new property to your portfolio</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Form */}
      <div className="bg-gray-800 rounded-xl p-8">
        {errors.submit && (
          <div className="mb-6 bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="border-gray-600 text-gray-300"
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/host/listings')}
                className="text-gray-300"
              >
                Cancel
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  variant="gradient"
                  onClick={nextStep}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="gradient"
                  loading={loading}
                  className="min-w-32"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Listing
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Preview Section */}
      {(formData.title || formData.description || imagePreview) && (
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Preview
          </h3>
          
          <div className="bg-gray-700 rounded-lg overflow-hidden">
            {imagePreview && (
              <img 
                src={imagePreview} 
                alt="Property preview"
                className="w-full h-48 object-cover"
              />
            )}
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-semibold text-white">
                  {formData.title || 'Your Property Title'}
                </h4>
                {formData.price_per_night && (
                  <span className="text-green-400 font-bold">
                    ₱{Number(formData.price_per_night).toLocaleString()}/night
                  </span>
                )}
              </div>
              
              {formData.location && (
                <div className="flex items-center text-gray-400 mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{formData.location}</span>
                  {selectedMapLocation && (
                    <span className="ml-2 text-xs text-green-400">
                      ({selectedMapLocation.lat}, {selectedMapLocation.lng})
                    </span>
                  )}
                </div>
              )}
              
              {formData.description && (
                <p className="text-gray-300 text-sm line-clamp-3">
                  {formData.description}
                </p>
              )}
              
              {(formData.bedrooms > 0 || formData.bathrooms > 0 || formData.max_guests > 0) && (
                <div className="flex space-x-4 mt-3 text-sm text-gray-400">
                  {formData.max_guests > 0 && <span>👥 {formData.max_guests} guests</span>}
                  {formData.bedrooms > 0 && <span>🛏️ {formData.bedrooms} bedrooms</span>}
                  {formData.bathrooms > 0 && <span>🚿 {formData.bathrooms} bathrooms</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateListing;