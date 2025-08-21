import React, { useState } from 'react';
import { X, Star, DollarSign, Users, MapPin, Calendar } from 'lucide-react';
import Button from '../common/Button';

const FilterPanel = ({ filters, onFilterChange, onClear }) => {
  const [localFilters, setLocalFilters] = useState({
    priceMin: filters.priceMin || '',
    priceMax: filters.priceMax || '',
    rating: filters.rating || '',
    guests: filters.guests || 1,
    amenities: [],
    propertyType: '',
    instantBook: false
  });

  const propertyTypes = [
    'House',
    'Apartment', 
    'Villa',
    'Condo',
    'Resort',
    'Hotel',
    'Cabin',
    'Treehouse'
  ];

  const amenitiesList = [
    'WiFi',
    'Swimming Pool',
    'Kitchen',
    'Air Conditioning',
    'Parking',
    'Pet Friendly',
    'Gym',
    'Beach Access',
    'Mountain View',
    'City View'
  ];

  const handleLocalChange = (key, value) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const handlePriceChange = (type, value) => {
    const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    handleLocalChange(type, numValue);
  };

  const handleAmenityToggle = (amenity) => {
    const updated = localFilters.amenities.includes(amenity)
      ? localFilters.amenities.filter(a => a !== amenity)
      : [...localFilters.amenities, amenity];
    handleLocalChange('amenities', updated);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      priceMin: '',
      priceMax: '',
      rating: '',
      guests: 1,
      amenities: [],
      propertyType: '',
      instantBook: false
    };
    setLocalFilters(clearedFilters);
    onClear();
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          icon={<X className="w-4 h-4" />}
        >
          Clear All
        </Button>
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <DollarSign className="w-4 h-4 mr-2 text-purple-400" />
            Price Range (PHP)
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min</label>
              <input
                type="number"
                placeholder="0"
                value={localFilters.priceMin}
                onChange={(e) => handlePriceChange('priceMin', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max</label>
              <input
                type="number"
                placeholder="No limit"
                value={localFilters.priceMax}
                onChange={(e) => handlePriceChange('priceMax', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Guest Count */}
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2 text-purple-400" />
            Guests
          </h4>
          <select
            value={localFilters.guests}
            onChange={(e) => handleLocalChange('guests', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(num => (
              <option key={num} value={num}>
                {num} Guest{num > 1 ? 's' : ''}
              </option>
            ))}
            <option value={11}>11+ Guests</option>
          </select>
        </div>

        {/* Minimum Rating */}
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Star className="w-4 h-4 mr-2 text-purple-400" />
            Minimum Rating
          </h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => (
              <label key={rating} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={rating}
                  checked={localFilters.rating === rating.toString()}
                  onChange={(e) => handleLocalChange('rating', e.target.value)}
                  className="text-purple-500 focus:ring-purple-500 mr-2"
                />
                <div className="flex items-center">
                  {[...Array(rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                  {[...Array(5 - rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-gray-600" />
                  ))}
                  <span className="ml-2 text-sm">{rating}+ Stars</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-purple-400" />
            Property Type
          </h4>
          <select
            value={localFilters.propertyType}
            onChange={(e) => handleLocalChange('propertyType', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Any Type</option>
            {propertyTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Amenities */}
        <div>
          <h4 className="font-medium mb-3">Amenities</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {amenitiesList.map(amenity => (
              <label key={amenity} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="text-purple-500 focus:ring-purple-500 rounded mr-2"
                />
                <span className="text-sm">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Instant Book */}
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localFilters.instantBook}
              onChange={(e) => handleLocalChange('instantBook', e.target.checked)}
              className="text-purple-500 focus:ring-purple-500 rounded mr-2"
            />
            <span className="text-sm">Instant Book Available</span>
          </label>
        </div>
      </div>

      {/* Applied Filters Count */}
      {(localFilters.priceMin || localFilters.priceMax || localFilters.rating || 
        localFilters.propertyType || localFilters.amenities.length > 0 || 
        localFilters.instantBook) && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            {[
              localFilters.priceMin || localFilters.priceMax ? 1 : 0,
              localFilters.rating ? 1 : 0,
              localFilters.propertyType ? 1 : 0,
              localFilters.amenities.length,
              localFilters.instantBook ? 1 : 0
            ].reduce((a, b) => a + b, 0)} filter(s) applied
          </p>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;