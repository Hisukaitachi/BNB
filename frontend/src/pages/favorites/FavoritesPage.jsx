// src/components/favorites/FavoritesPage.jsx - Favorites Management
import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Star, Trash2, Grid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { favoritesService } from '../../services/favoritesService';
import Button from '../../components/ui/Button';
import { getImageUrl } from '../../services/api';

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [removing, setRemoving] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await favoritesService.getFavorites();
      setFavorites(data.favorites || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (listingId) => {
    try {
      setRemoving(listingId);
      await favoritesService.removeFromFavorites(listingId);
      setFavorites(prev => prev.filter(fav => fav.id !== listingId));
    } catch (error) {
      alert('Failed to remove from favorites: ' + error.message);
    } finally {
      setRemoving(null);
    }
  };

  const handleViewListing = (listingId) => {
    navigate(`/listings/${listingId}`);
  };

  const stats = favoritesService.getFavoriteStats(favorites);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadFavorites} variant="gradient">Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Favorites</h1>
            <p className="text-gray-400">
              {favorites.length} saved propert{favorites.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {favorites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm text-gray-400">Total Favorites</h3>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm text-gray-400">Average Price</h3>
              <p className="text-2xl font-bold text-white">₱{stats.averagePrice.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm text-gray-400">Price Range</h3>
              <p className="text-2xl font-bold text-white">
                ₱{stats.priceRange.min.toLocaleString()} - ₱{stats.priceRange.max.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm text-gray-400">Top Location</h3>
              <p className="text-lg font-bold text-white truncate">
                {Object.keys(stats.byLocation)[0] || 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No favorites yet</h3>
            <p className="text-gray-400 mb-6">
              Start exploring and save properties you love!
            </p>
            <Button 
              onClick={() => navigate('/')} 
              variant="gradient"
            >
              Explore Properties
            </Button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
          }>
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className={`bg-gray-800 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Image */}
                {favorite.image_url && (
                  <div className={`relative ${viewMode === 'list' ? 'w-48 h-32' : 'h-48'} overflow-hidden`}>
                    <img 
                      src={getImageUrl(favorite.image_url)}
                      alt={favorite.title}
                      className="w-full h-full object-cover"
                    />
                    <button 
                      onClick={() => handleRemoveFavorite(favorite.id)}
                      disabled={removing === favorite.id}
                      className="absolute top-3 right-3 p-2 rounded-full bg-black/20 hover:bg-black/40 transition"
                    >
                      {removing === favorite.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                )}

                {/* Content */}
                <div className={`p-5 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-400 text-sm font-medium">
                      {favorite.location}
                    </span>
                    {favorite.average_rating && (
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-300 ml-1">
                          {Number(favorite.average_rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2 hover:text-purple-400 transition-colors cursor-pointer"
                      onClick={() => handleViewListing(favorite.id)}>
                    {favorite.title}
                  </h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {favorite.description}
                  </p>

                  <div className={`flex items-center justify-between ${viewMode === 'list' ? 'mt-auto' : ''}`}>
                    <div>
                      <span className="text-white font-bold text-lg">
                        ₱{Number(favorite.price_per_night).toLocaleString()}
                      </span>
                      <span className="text-gray-400 text-sm ml-1">/ night</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => handleViewListing(favorite.id)}
                      >
                        View Details
                      </Button>
                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        disabled={removing === favorite.id}
                        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition"
                        title="Remove from favorites"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>

                  {favorite.favorited_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Saved on {new Date(favorite.favorited_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;