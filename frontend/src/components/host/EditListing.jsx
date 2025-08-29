// frontend/src/components/host/EditListing.jsx - Edit Listing Form
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
  Eye
} from 'lucide-react';
import hostService from '../../services/hostService';
import listingService from '../../services/listingService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Textarea } from '../ui/Input';

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
      
      // Prepare update data
      const updateData = { ...formData };
      
      // Handle file uploads separately if new files are selected
      if (imageFile || videoFile) {
        const submissionData = {
          ...formData,
          image: imageFile,
          video: videoFile
        };
        await hostService.createListing(submissionData); // This handles file uploads
      } else {
        await hostService.updateListing(id, updateData);
      }
      
      navigate('/host/listings', { 
        state: { message: 'Listing updated successfully!' }
      });
    } catch (error) {
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

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <Input
                      label="Longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={handleInputChange}
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
                <span className="text-gray-400">Created</span>
                <span className="text-white">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditListing;