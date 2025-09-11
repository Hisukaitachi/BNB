// src/pages/LandingPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, ArrowRight, Star, Heart, SlidersHorizontal } from 'lucide-react';
import listingService from '../services/listingService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import MapComponent from '../components/common/MapComponent';

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const listingsRef = useRef(null);
  
  // Listings state
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Search and filter state
  const [searchParams, setSearchParams] = useState({
    city: '',
    price_min: '',
    price_max: '',
    keyword: '',
    min_rating: '',
    check_in: '',
    check_out: '',
    guests: 1,
    page: 1,
    limit: 12,
    sortBy: 'created_at',
    order: 'DESC'
  });

  // Initialize search from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const stateData = location.state?.searchData;
    
    const initialParams = {
      city: urlParams.get('city') || stateData?.location || '',
      price_min: urlParams.get('price_min') || '',
      price_max: urlParams.get('price_max') || '',
      keyword: urlParams.get('keyword') || '',
      min_rating: urlParams.get('min_rating') || '',
      check_in: urlParams.get('check_in') || stateData?.checkIn || '',
      check_out: urlParams.get('check_out') || stateData?.checkOut || '',
      guests: parseInt(urlParams.get('guests')) || stateData?.guests || 1,
      page: parseInt(urlParams.get('page')) || 1,
      limit: 12,
      sortBy: urlParams.get('sortBy') || 'created_at',
      order: urlParams.get('order') || 'DESC'
    };

    setSearchParams(initialParams);
    
    // Load listings if there are search parameters
    if (Object.values(initialParams).some(value => value && value !== '' && value !== 1 && value !== 12)) {
      loadListings(initialParams);
      // Scroll to listings after a short delay
      setTimeout(() => {
        listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  const loadListings = async (params = searchParams) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clean params - remove empty values
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      const response = await listingService.searchListings(cleanParams);
      setListings(response.data.listings || []);
    } catch (err) {
      setError(err.message || 'Failed to load listings');
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const newParams = { ...searchParams, page: 1 };
    setSearchParams(newParams);
    loadListings(newParams);
    updateURL(newParams);
  };

  const handleFilterChange = (key, value) => {
    const newParams = { ...searchParams, [key]: value, page: 1 };
    setSearchParams(newParams);
  };

  const applyFilters = () => {
    loadListings(searchParams);
    updateURL(searchParams);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const resetParams = {
      city: '',
      price_min: '',
      price_max: '',
      keyword: '',
      min_rating: '',
      check_in: '',
      check_out: '',
      guests: 1,
      page: 1,
      limit: 12,
      sortBy: 'created_at',
      order: 'DESC'
    };
    setSearchParams(resetParams);
    loadListings(resetParams);
    updateURL(resetParams);
  };

  const updateURL = (params) => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && !(key === 'guests' && value === 1) && !(key === 'limit' && value === 12)) {
        urlParams.set(key, value);
      }
    });
    const newURL = urlParams.toString() ? `?${urlParams.toString()}` : '';
    navigate(newURL, { replace: true });
  };

  const handleSort = (sortBy) => {
    const newOrder = searchParams.sortBy === sortBy && searchParams.order === 'DESC' ? 'ASC' : 'DESC';
    const newParams = { ...searchParams, sortBy, order: newOrder, page: 1 };
    setSearchParams(newParams);
    loadListings(newParams);
    updateURL(newParams);
  };

  const scrollToListings = () => {
    if (listings.length === 0) {
      // If no listings loaded, perform search first
      loadListings(searchParams);
      updateURL(searchParams);
    }
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'
          }}
        >
          <div className="gradient-overlay absolute inset-0"></div>
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            <span className="text-stroke">Reimagine</span> Your Staycation
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto">
            Discover curated spaces that transform ordinary getaways into extraordinary experiences
          </p>
      
            <form onSubmit={handleSearch} className="glass-effect rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search location..."
                    value={searchParams.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="pl-10 bg-white/10 border-0 text-white placeholder-gray-300"
                  />
                </div>
                
                <Input
                  type="date"
                  placeholder="Check in"
                  value={searchParams.check_in}
                  onChange={(e) => handleFilterChange('check_in', e.target.value)}
                  className="bg-white/10 border-0 text-white"
                />
                
                <Input
                  type="date"
                  placeholder="Check out"
                  value={searchParams.check_out}
                  onChange={(e) => handleFilterChange('check_out', e.target.value)}
                  className="bg-white/10 border-0 text-white"
                />

                <Input
                  placeholder="Keywords..."
                  value={searchParams.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  className="bg-white/10 border-0 text-white placeholder-gray-300"
                />

                <Button 
                  type="button"
                  variant="gradient"
                  className="h-full"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  Filters
                </Button>

                <Button type="submit" variant="gradient" className="h-full">
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </Button>
              </div>
            </form>
      
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
          <button 
            onClick={scrollToListings}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition animate-bounce-slow group"
          >
            <ArrowRight className="w-6 h-6 text-white rotate-90 group-hover:translate-y-1 transition-transform" />
          </button>
        </div>
      </section>


      {/* Listings Section */}
      <div ref={listingsRef}>
        <div className="container mx-auto px-6 py-8">
          {/* Advanced Filters */}
          {showFilters && (
            <div className="mb-8 glass-effect rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Min Price (₱)</label>
                  <Input
                    type="number"
                    placeholder="Min price"
                    value={searchParams.price_min}
                    onChange={(e) => handleFilterChange('price_min', e.target.value)}
                    className="bg-white/10 border-0 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Max Price (₱)</label>
                  <Input
                    type="number"
                    placeholder="Max price"
                    value={searchParams.price_max}
                    onChange={(e) => handleFilterChange('price_max', e.target.value)}
                    className="bg-white/10 border-0 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Minimum Rating</label>
                  <Select
                    value={searchParams.min_rating}
                    onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                    className="bg-white/10 border-0 text-white"
                  >
                    <option value="">Any rating</option>
                    <option value="4">4+ stars</option>
                    <option value="3">3+ stars</option>
                    <option value="2">2+ stars</option>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={applyFilters} variant="gradient">
                  Apply Filters
                </Button>
                <Button onClick={clearFilters} variant="outline" className="border-gray-600 text-gray-300">
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Results Header */}
          {listings.length > 0 && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Discover Your Perfect Stay
                </h1>
                <p className="text-gray-400">
                  {listings.length} unique properties available
                </p>
              </div>

              {/* Sort Options */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">Sort by:</span>
                  <div className="flex space-x-2">
                    <Button
                      variant={searchParams.sortBy === 'price_per_night' ? 'gradient' : 'ghost'}
                      size="sm"
                      onClick={() => handleSort('price_per_night')}
                      className="text-gray-300"
                    >
                      Price
                    </Button>
                    <Button
                      variant={searchParams.sortBy === 'created_at' ? 'gradient' : 'ghost'}
                      size="sm"
                      onClick={() => handleSort('created_at')}
                      className="text-gray-300"
                    >
                      Newest
                    </Button>
                    <Button
                      variant={searchParams.sortBy === 'average_rating' ? 'gradient' : 'ghost'}
                      size="sm"
                      onClick={() => handleSort('average_rating')}
                      className="text-gray-300"
                    >
                      Rating
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center min-h-96">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-white mb-4">Unable to load listings</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button onClick={() => loadListings()} variant="gradient">
                Try Again
              </Button>
            </div>
          )}

          {/* No Results */}
          {!loading && !error && listings.length === 0 && (
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-white mb-2">No listings found</h3>
              <p className="text-gray-400 mb-6">Try adjusting your search criteria or explore all properties</p>
              <Button onClick={clearFilters} variant="gradient">
                Clear Filters
              </Button>
            </div>
          )}

          {/* Listings Grid */}
          {listings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-gray-800 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer group"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                >
                  {/* Image */}
                  {listing.image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={listing.image_url ? `/uploads/${listing.image_url.split('/').pop()}` : '/placeholder.jpg'} 
                        alt={listing.title}
                        className="w-full h-48 object-cover"
                      />
                      <button 
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/20 hover:bg-black/40 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Add to favorites:', listing.id);
                        }}
                      >
                        <Heart className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-400 text-sm font-medium">
                        {listing.location}
                      </span>
                      {listing.average_rating && (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-300 ml-1">
                            {Number(listing.average_rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      {listing.title}
                    </h3>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {listing.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-bold text-lg">
                          ₱{Number(listing.price_per_night).toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">/ night</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        by {listing.host_name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Map Section */}
          {listings.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Properties on Map</h2>
              <MapComponent 
                listings={listings}
                center={{ lat: 10.3157, lng: 123.8854 }}
                zoom={12}
                height="500px"
                onMarkerClick={(listing) => navigate(`/listings/${listing.id}`)}
              />
            </div>
          )}

          {/* Load More Button */}
          {listings.length >= searchParams.limit && (
            <div className="text-center">
              <Button
                onClick={() => {
                  const newParams = { ...searchParams, limit: searchParams.limit + 12 };
                  setSearchParams(newParams);
                  loadListings(newParams);
                }}
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;