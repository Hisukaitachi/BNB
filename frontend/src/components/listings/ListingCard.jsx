import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star, Users, Calendar, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';

const ListingCard = ({ listing, viewMode = 'grid' }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useApp();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      showToast('Please sign in to add favorites', 'info');
      navigate('/login');
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorited) {
        await api.removeFromFavorites(listing.id);
        setIsFavorited(false);
        showToast('Removed from favorites', 'success');
      } else {
        await api.addToFavorites(listing.id);
        setIsFavorited(true);
        showToast('Added to favorites', 'success');
      }
    } catch (error) {
      showToast('Failed to update favorites', 'error');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/listing/${listing.id}`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="card-hover bg-gray-800 rounded-xl overflow-hidden cursor-pointer flex"
        onClick={handleCardClick}
      >
        <div className="relative w-80 h-56 flex-shrink-0">
          <img
            src={listing.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          <button 
            onClick={handleFavoriteClick}
            disabled={favoriteLoading}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
          >
            <Heart 
              className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-white'}`} 
            />
          </button>
          {listing.average_rating && (
            <div className="absolute bottom-3 left-3 flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-white text-sm font-medium">{listing.average_rating}</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-xl truncate flex-1 mr-4">{listing.title}</h3>
              <div className="text-right">
                <span className="text-2xl font-bold">{formatPrice(listing.price_per_night)}</span>
                <span className="text-gray-400 text-sm block">/ night</span>
              </div>
            </div>
            
            <div className="flex items-center text-gray-400 text-sm mb-3">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">{listing.location}</span>
            </div>
            
            <p className="text-gray-300 text-sm mb-4 line-clamp-3">
              {listing.description}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              {listing.max_guests && (
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{listing.max_guests} guests</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{listing.views || 0} views</span>
              </div>
            </div>
            <button className="btn-primary text-sm px-6 py-2">
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div 
      className="card-hover bg-gray-800 rounded-xl overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative h-48">
        <img
          src={listing.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <button 
          onClick={handleFavoriteClick}
          disabled={favoriteLoading}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
        >
          <Heart 
            className={`w-5 h-5 ${isFavorited ? 'text-red-500 fill-current' : 'text-white'}`} 
          />
        </button>
        {listing.average_rating && (
          <div className="absolute bottom-3 left-3 flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-white text-sm font-medium">{listing.average_rating}</span>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg truncate flex-1 mr-2">{listing.title}</h3>
        </div>
        
        <div className="flex items-center text-gray-400 text-sm mb-3">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">{listing.location}</span>
        </div>
        
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {listing.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm text-gray-400">
            {listing.max_guests && (
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{listing.max_guests}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-xl font-bold">{formatPrice(listing.price_per_night)}</span>
            <span className="text-gray-400 text-sm block">/ night</span>
          </div>
        </div>
        
        <button className="w-full btn-primary text-sm mt-4">
          View Details
        </button>
      </div>
    </div>
  );
};

export default ListingCard;