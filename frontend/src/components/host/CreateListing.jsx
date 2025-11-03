// frontend/src/components/host/CreateListing.jsx - Updated with Amenities Checkboxes
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  X, 
  MapPin, 
  Image as ImageIcon,
  Video,
  Save,
  Eye,
  Search,
  Loader,
  Navigation,
  Check,
  Wifi,
  Car,
  Tv,
  Wind,
  Coffee,
  Waves,
  Shield,
  Sparkles
} from 'lucide-react';
import hostService from '../../services/hostService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Textarea } from '../ui/Input';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Amenities options with icons
const AMENITIES_OPTIONS = [
  { id: 'wifi', label: 'WiFi', icon: <Wifi className="w-4 h-4" /> },
  { id: 'parking', label: 'Free Parking', icon: <Car className="w-4 h-4" /> },
  { id: 'pool', label: 'Swimming Pool', icon: <Waves className="w-4 h-4" /> },
  { id: 'aircon', label: 'Air Conditioning', icon: <Wind className="w-4 h-4" /> },
  { id: 'tv', label: 'Cable TV', icon: <Tv className="w-4 h-4" /> },
  { id: 'kitchen', label: 'Kitchen', icon: <Coffee className="w-4 h-4" /> },
  { id: 'washer', label: 'Washer', icon: '🧺' },
  { id: 'dryer', label: 'Dryer', icon: '👔' },
  { id: 'workspace', label: 'Dedicated Workspace', icon: '💼' },
  { id: 'breakfast', label: 'Breakfast Included', icon: '🍳' },
  { id: 'gym', label: 'Gym/Fitness Center', icon: '🏋️' },
  { id: 'hottub', label: 'Hot Tub', icon: '🛁' },
  { id: 'balcony', label: 'Balcony/Terrace', icon: '🏞️' },
  { id: 'garden', label: 'Garden View', icon: '🌳' },
  { id: 'beachfront', label: 'Beachfront', icon: '🏖️' },
  { id: 'security', label: '24/7 Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'elevator', label: 'Elevator', icon: '🛗' },
  { id: 'pets', label: 'Pets Allowed', icon: '🐕' },
  { id: 'smoking', label: 'Smoking Area', icon: '🚬' },
  { id: 'events', label: 'Events Allowed', icon: '🎉' }
];

// Amenities Checkbox Component
const AmenitiesSelector = ({ selectedAmenities, onChange }) => {
  const handleToggle = (amenityId) => {
    if (selectedAmenities.includes(amenityId)) {
      onChange(selectedAmenities.filter(id => id !== amenityId));
    } else {
      onChange([...selectedAmenities, amenityId]);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm text-gray-300 mb-3">
        Select Amenities (Choose all that apply)
      </label>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AMENITIES_OPTIONS.map((amenity) => (
          <button
            key={amenity.id}
            type="button"
            onClick={() => handleToggle(amenity.id)}
            className={`
              flex items-center space-x-2 p-3 rounded-lg border transition-all
              ${selectedAmenities.includes(amenity.id)
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
              }
            `}
          >
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
              ${selectedAmenities.includes(amenity.id)
                ? 'bg-purple-600 border-purple-600'
                : 'border-gray-500'
              }
            `}>
              {selectedAmenities.includes(amenity.id) && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm flex items-center space-x-1.5">
              {typeof amenity.icon === 'string' ? (
                <span>{amenity.icon}</span>
              ) : (
                amenity.icon
              )}
              <span>{amenity.label}</span>
            </span>
          </button>
        ))}
      </div>

      {selectedAmenities.length > 0 && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-600 rounded-lg">
          <p className="text-green-400 text-sm">
            <Sparkles className="w-4 h-4 inline mr-1" />
            {selectedAmenities.length} amenities selected
          </p>
        </div>
      )}
    </div>
  );
};

// [Keep your existing Map Controller and Location Search components as they are]
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 16, {
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
  
  return null;
};

const LocationSearch = ({ onLocationFound, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);

  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocation(searchQuery);
      }, 500);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchLocation = async (query) => {
    if (!query.trim()) return;
    
    setSearching(true);
    onSearch(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + 
        `format=json&` +
        `q=${encodeURIComponent(query)}&` +
        `limit=8&` +
        `countrycodes=ph&` +
        `addressdetails=1&` +
        `extratags=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const enhancedResults = data.map(location => ({
          ...location,
          displayName: formatDisplayName(location),
          category: getCategoryIcon(location)
        }));
        setSuggestions(enhancedResults);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setSuggestions([]);
    } finally {
      setSearching(false);
      onSearch(false);
    }
  };

  const formatDisplayName = (location) => {
    if (location.namedetails?.name) {
      return location.namedetails.name;
    }
    
    const parts = location.display_name.split(',');
    if (parts.length > 3) {
      return parts.slice(0, 3).join(',');
    }
    return location.display_name;
  };

  const getCategoryIcon = (location) => {
    const type = location.type || location.class;
    
    if (type?.includes('mall') || type?.includes('shop')) return '🏬';
    if (type?.includes('hotel') || type?.includes('resort')) return '🏨';
    if (type?.includes('beach')) return '🏖️';
    if (type?.includes('airport')) return '✈️';
    if (type?.includes('hospital')) return '🏥';
    if (type?.includes('school') || type?.includes('university')) return '🎓';
    if (type?.includes('restaurant') || type?.includes('food')) return '🍽️';
    if (type?.includes('park')) return '🌳';
    if (location.class === 'tourism') return '🎯';
    if (location.class === 'building') return '🏢';
    return '📍';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchLocation(searchQuery);
    }
  };

  const selectLocation = (location) => {
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lon);
    
    onLocationFound({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      displayName: location.displayName || location.display_name,
      fullAddress: location.display_name
    });
    
    setSearchQuery(location.displayName || location.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const popularLocations = [
    { name: 'Ayala Center Cebu', lat: 10.3181, lng: 123.9054, icon: '🏬' },
    { name: 'SM City Cebu', lat: 10.3114, lng: 123.9185, icon: '🏬' },
    { name: 'IT Park Cebu', lat: 10.3279, lng: 123.9056, icon: '🏢' },
    { name: 'BGC Taguig', lat: 14.5547, lng: 121.0244, icon: '🏙️' },
    { name: 'Greenbelt Makati', lat: 14.5524, lng: 121.0215, icon: '🏬' },
    { name: 'Boracay Station 2', lat: 11.9604, lng: 121.9248, icon: '🏖️' },
    { name: 'Mactan Airport', lat: 10.3074, lng: 123.9794, icon: '✈️' },
    { name: 'Mall of Asia', lat: 14.5351, lng: 120.9821, icon: '🏬' }
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Search for a place (e.g., Ayala Mall, BGC, Boracay)"
              className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              autoComplete="off"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            )}
            {searchQuery && !searching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
            {suggestions.map((location, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectLocation(location)}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 text-white border-b border-gray-700 last:border-b-0 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-xl mt-0.5">{location.category}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {location.displayName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {location.display_name.split(',').slice(1, 3).join(',')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {location.type?.replace(/_/g, ' ') || location.class}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-400 mb-2">Popular locations:</p>
        <div className="flex flex-wrap gap-2">
          {popularLocations.map((loc) => (
            <button
              key={loc.name}
              type="button"
              onClick={() => {
                onLocationFound({
                  lat: loc.lat,
                  lng: loc.lng,
                  displayName: loc.name
                });
                                setSearchQuery(loc.name);
                setShowSuggestions(false);
              }}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-full transition flex items-center space-x-1"
            >
              <span>{loc.icon}</span>
              <span>{loc.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const LocationPicker = ({ onLocationSelect, selectedLocation }) => {
  const [mapCenter, setMapCenter] = useState([10.3157, 123.8854]);
  const [mapZoom, setMapZoom] = useState(12);
  const [isSearching, setIsSearching] = useState(false);

  const handleLocationSearch = (location) => {
    setMapCenter([location.lat, location.lng]);
    setMapZoom(17);
    onLocationSelect(location);
  };

  const handleSearchStatus = (searching) => {
    setIsSearching(searching);
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        onLocationSelect({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          displayName: 'Custom Location'
        });
      },
    });

    return selectedLocation ? (
      <Marker 
        position={[selectedLocation.lat, selectedLocation.lng]}
        icon={L.divIcon({
          className: 'custom-location-marker',
          html: `
            <div style="position: relative;">
              <div style="
                width: 40px; 
                height: 40px; 
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 3px 10px rgba(0,0,0,0.5);
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
              "></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        })}
      />
    ) : null;
  };

  return (
    <div className="space-y-4">
      <LocationSearch 
        onLocationFound={handleLocationSearch}
        onSearch={handleSearchStatus}
      />

      <div className="relative">
        <MapContainer 
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '450px', width: '100%' }}
          className="rounded-lg"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
          <MapController center={mapCenter} zoom={mapZoom} />
        </MapContainer>
        
        {isSearching && (
          <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center z-10">
            <div className="bg-gray-800 px-4 py-3 rounded-lg flex items-center space-x-3">
              <Loader className="w-5 h-5 animate-spin text-purple-500" />
              <span className="text-white">Searching location...</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>Search or click on map to set location</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  const location = {
                    lat: Number(latitude.toFixed(6)),
                    lng: Number(longitude.toFixed(6)),
                    displayName: 'My Current Location'
                  };
                  handleLocationSearch(location);
                },
                (error) => {
                  console.error('Error getting location:', error);
                  alert('Unable to get your current location. Please search or click on the map.');
                }
              );
            } else {
              alert('Geolocation is not supported by your browser');
            }
          }}
          className="absolute bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transition"
        >
          <Navigation className="w-4 h-4" />
          <span>Use My Location</span>
        </button>

        <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
          <button
            type="button"
            onClick={() => setMapZoom(prev => Math.min(prev + 1, 18))}
            className="bg-white hover:bg-gray-100 text-gray-700 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setMapZoom(prev => Math.max(prev - 1, 5))}
            className="bg-white hover:bg-gray-100 text-gray-700 w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition"
          >
            −
          </button>
        </div>
      </div>

      {selectedLocation && (
        <div className="bg-purple-900/20 border border-purple-600 rounded-lg p-4 animate-fadeIn">
          <h4 className="text-purple-400 font-medium mb-2 flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Location Selected
          </h4>
          <div className="text-purple-300 text-sm space-y-2">
            {selectedLocation.displayName && (
              <p className="font-medium text-white">{selectedLocation.displayName}</p>
            )}
            {selectedLocation.fullAddress && selectedLocation.fullAddress !== selectedLocation.displayName && (
              <p className="text-xs text-gray-400">{selectedLocation.fullAddress}</p>
            )}
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-purple-800">
              <div>
                <span className="text-gray-400 text-xs">Latitude:</span>
                <p className="font-mono">{selectedLocation.lat}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Longitude:</span>
                <p className="font-mono">{selectedLocation.lng}</p>
              </div>
            </div>
          </div>
        </div>
      )}
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
    amenities: '', // Will be converted from array
    house_rules: '',
    latitude: '',
    longitude: ''
  });
  
  // UPDATED: Separate state for amenities array
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
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
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedMapLocation(location);
    setFormData(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
      ...(location.displayName && location.displayName !== 'Custom Location' 
        ? { location: location.displayName }
        : {})
    }));
    
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

    if (field === 'latitude' && formData.longitude && numValue) {
      setSelectedMapLocation({ 
        lat: numValue, 
        lng: formData.longitude,
        displayName: 'Manual Coordinates'
      });
    } else if (field === 'longitude' && formData.latitude && numValue) {
      setSelectedMapLocation({ 
        lat: formData.latitude, 
        lng: numValue,
        displayName: 'Manual Coordinates'
      });
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (imageFiles.length + files.length > 8) {
      setErrors(prev => ({ ...prev, image: 'Maximum 8 images allowed' }));
      return;
    }

    const validFiles = [];
    const newPreviews = [];
    let hasErrors = false;

    files.forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: 'Please select valid image files only' }));
        hasErrors = true;
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Each image must be less than 10MB' }));
        hasErrors = true;
        return;
      }

      validFiles.push(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push({
          id: Date.now() + index,
          url: e.target.result,
          file: file
        });

        if (newPreviews.length === validFiles.length) {
          setImageFiles(prev => [...prev, ...validFiles]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (!hasErrors) {
      setErrors(prev => ({ ...prev, image: '' }));
    }

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
    reader.onload = (e) => {
      setVideoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (imageId) => {
    setImageFiles(prev => {
      const imageToRemove = imagePreviews.find(img => img.id === imageId);
      if (imageToRemove) {
        return prev.filter(file => file !== imageToRemove.file);
      }
      return prev;
    });
    setImagePreviews(prev => prev.filter(img => img.id !== imageId));
    setErrors(prev => ({ ...prev, image: '' }));
  };

  const removeAllImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setErrors(prev => ({ ...prev, image: '' }));
    
    const input = document.getElementById('image-upload');
    if (input) input.value = '';
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setErrors(prev => ({ ...prev, video: '' }));
    
    const input = document.getElementById('video-upload');
    if (input) input.value = '';
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

    if (imageFiles.length === 0) {
      newErrors.image = 'At least 1 property image is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      if (formErrors.image && currentStep !== 4) {
        setCurrentStep(4);
      }
      return;
    }

    try {
      setLoading(true);
      
      // Convert selected amenities array to comma-separated string
      const amenitiesString = selectedAmenities
        .map(id => AMENITIES_OPTIONS.find(a => a.id === id)?.label)
        .filter(Boolean)
        .join(', ');
      
      const submissionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
                price_per_night: formData.price_per_night,
        max_guests: formData.max_guests,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        amenities: amenitiesString, // Converted from array to string
        house_rules: formData.house_rules?.trim() || '',
        latitude: formData.latitude,
        longitude: formData.longitude,
        images: imageFiles,
        video: videoFile
      };

      const result = await hostService.createListing(submissionData);
      
      if (result.success) {
        navigate('/host/listings', { 
          state: { message: 'Listing created successfully!' }
        });
      }
    } catch (error) {
      console.error('Create listing error:', error);
      
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
    
    if (currentStep === 4) {
      if (imageFiles.length === 0) {
        setErrors({ image: 'At least 1 property image is required' });
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
                  label="Location Name *"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  error={errors.location}
                  placeholder="e.g., Cebu City, BGC Taguig, Boracay"
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
                <div>
                  <label className="block text-sm text-gray-300 mb-3">
                    Search and click on your exact property location *
                  </label>
                  <LocationPicker 
                    onLocationSelect={handleLocationSelect}
                    selectedLocation={selectedMapLocation}
                  />
                  {errors.location_coordinates && (
                    <p className="text-red-400 text-sm mt-2">{errors.location_coordinates}</p>
                  )}
                </div>

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

                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                  <h4 className="text-blue-400 font-medium mb-2">📍 Location Tips</h4>
                  <ul className="text-blue-300 text-sm space-y-1">
                    <li>• Type your property address or nearby landmark in the search box</li>
                    <li>• Click on a search result to navigate there instantly</li>
                    <li>• Use popular locations for quick navigation</li>
                    <li>• Click "Use My Location" if you're at the property</li>
                    <li>• Fine-tune by clicking directly on the map</li>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              </div>

              {/* UPDATED: Amenities Checkboxes */}
              <div className="mb-6">
                <AmenitiesSelector 
                  selectedAmenities={selectedAmenities}
                  onChange={setSelectedAmenities}
                />
              </div>

              {/* House Rules */}
              <Textarea
                label="House Rules (Optional)"
                name="house_rules"
                value={formData.house_rules}
                onChange={handleInputChange}
                placeholder="No smoking, No pets, Quiet hours after 10 PM..."
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
              
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3">
                  Property Images * (1-8 images)
                </label>
                
                {imagePreviews.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm text-green-400">
                        {imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''} selected
                      </p>
                      <button
                        type="button"
                        onClick={removeAllImages}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove All
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={preview.id} className="relative">
                          <img
                            src={preview.url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(preview.id)}
                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-1 py-0.5 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imagePreviews.length < 8 && (
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      multiple
                      max="4"
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-300 mb-1">
                        {imagePreviews.length === 0 
                          ? 'Click to upload property images' 
                          : `Add more images (${8 - imagePreviews.length} remaining)`
                        }
                      </p>
                      <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 10MB each</p>
                      <p className="text-gray-500 text-xs mt-1">You can select multiple files at once</p>
                    </label>
                  </div>
                )}

                {errors.image && <p className="text-red-400 text-sm mt-2">{errors.image}</p>}
              </div>

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
                    <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      ✓ Video Ready
                    </div>
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

              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">📸 Photo & Video Tips</h4>
                <ul className="text-blue-300 text-sm space-y-1">
                  <li>• Use high-quality, well-lit photos</li>
                  <li>• Upload 3-4 images for better guest engagement</li>
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
            'bg-gray-700 text-gray-400'          }`}>
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

  // Helper function to get selected amenities labels for preview
  const getSelectedAmenitiesLabels = () => {
    return selectedAmenities
      .map(id => AMENITIES_OPTIONS.find(a => a.id === id)?.label)
      .filter(Boolean);
  };

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
            <p className="font-medium">Error creating listing:</p>
            <p>{errors.submit}</p>
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
      {(formData.title || formData.description || imagePreviews.length > 0 || selectedAmenities.length > 0) && (
        <div className="mt-8 bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Preview
          </h3>
          
          <div className="bg-gray-700 rounded-lg overflow-hidden">
            {imagePreviews.length > 0 && (
              <div className="relative">
                <img 
                  src={imagePreviews[0].url}
                  alt="Property preview"
                  className="w-full h-48 object-cover"
                />
                {imagePreviews.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    +{imagePreviews.length - 1} more
                  </div>
                )}
              </div>
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
                      📍 Location set
                    </span>
                  )}
                </div>
              )}
              
              {formData.description && (
                <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                  {formData.description}
                </p>
              )}
              
              {(formData.bedrooms > 0 || formData.bathrooms > 0 || formData.max_guests > 0) && (
                <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-400">
                  {formData.max_guests > 0 && <span>👥 {formData.max_guests} guests</span>}
                  {formData.bedrooms > 0 && <span>🛏️ {formData.bedrooms} bedrooms</span>}
                  {formData.bathrooms > 0 && <span>🚿 {formData.bathrooms} bathrooms</span>}
                </div>
              )}

              {/* Display selected amenities in preview */}
              {selectedAmenities.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-xs text-gray-400 mb-2">Amenities:</p>
                  <div className="flex flex-wrap gap-2">
                    {getSelectedAmenitiesLabels().slice(0, 5).map((amenity, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                    {getSelectedAmenitiesLabels().length > 5 && (
                      <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded-full">
                        +{getSelectedAmenitiesLabels().length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {formData.house_rules && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">House Rules:</p>
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {formData.house_rules}
                  </p>
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