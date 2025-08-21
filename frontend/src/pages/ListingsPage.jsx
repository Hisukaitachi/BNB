// src/pages/ListingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, MapPin, Star, Heart, Filter, Search } from 'lucide-react';
import api from '../services/api';

const ListingCard = ({ listing }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await api.removeFavorite(listing.id);
      } else {
        await api.addFavorite(listing.id);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Favorite error:', error);
    }
  };

  return (
    <div 
      className="card-hover bg-gray-800 rounded-xl overflow-hidden cursor-pointer"
      onClick={() => navigate(`/listing/${listing.id}`)}
    >
      <div className="relative h-48">
        <img
          src={listing.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
          alt={listing.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
          }}
        />
        <button 
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-white'}`} />
        </button>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg truncate">{listing.title}</h3>
          {listing.average_rating && (
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-400">{parseFloat(listing.average_rating).toFixed(1)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center text-gray-400 text-sm mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{listing.location}</span>
        </div>
        
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {listing.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">₱{parseInt(listing.price_per_night).toLocaleString()}</span>
            <span className="text-gray-400 text-sm ml-1">/ night</span>
          </div>
          <button className="btn-primary text-sm px-4 py-2">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterPanel = ({ filters, setFilters, onApply }) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mb-8">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="md:hidden mb-4 flex items-center space-x-2 btn-secondary"
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
      </button>

      <div className={`glass-effect rounded-lg p-6 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Location"
              value={filters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <input
            type="number"
            placeholder="Min Price"
            value={filters.price_min || ''}
            onChange={(e) => handleFilterChange('price_min', e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
          />
          
          <input
            type="number"
            placeholder="Max Price"
            value={filters.price_max || ''}
            onChange={(e) => handleFilterChange('price_max', e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
          />
          
          <select
            value={filters.min_rating || ''}
            onChange={(e) => handleFilterChange('min_rating', e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Any Rating</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
          </select>

          <button
            onClick={onApply}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    city: '',
    price_min: '',
    price_max: '',
    min_rating: ''
  });
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have search data from navigation
    if (location.state?.searchData) {
      const searchData = location.state.searchData;
      setFilters(prev => ({
        ...prev,
        city: searchData.location || ''
      }));
    }
    
    fetchListings();
  }, [location.state]);

  const fetchListings = async (searchFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = { ...filters, ...searchFilters };
      
      // Remove empty filters
      Object.keys(queryParams).forEach(key => {
        if (!queryParams[key]) {
          delete queryParams[key];
        }
      });

      let response;
      
      // Use search endpoint if we have filters, otherwise get all listings
      if (Object.keys(queryParams).length > 0) {
        response = await api.searchListings(queryParams);
      } else {
        response = await api.getListings();
      }
      
      if (response.status === 'success') {
        setListings(response.data.listings || []);
      } else {
        setError(response.message || 'Failed to fetch listings');
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setError(error.message || 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchListings(filters);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading amazing places...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Make sure your backend is running on port 5000</p>
            <button 
              onClick={() => fetchListings()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Discover Amazing Places</h1>
          <p className="text-gray-400">Find your perfect staycation from our curated collection</p>
        </div>

        <FilterPanel 
          filters={filters}
          setFilters={setFilters}
          onApply={handleApplyFilters}
        />

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No listings found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search filters</p>
            <button 
              onClick={() => {
                setFilters({
                  city: '',
                  price_min: '',
                  price_max: '',
                  min_rating: ''
                });
                fetchListings({});
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingsPage;