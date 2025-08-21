import React from 'react';
import { Building2, Search } from 'lucide-react';
import ListingCard from './ListingCard';
import Loading from '../common/Loading';

const ListingGrid = ({ listings, viewMode = 'grid', loading = false }) => {
  if (loading) {
    return <Loading message="Loading listings..." fullScreen={false} />;
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">No listings found</h3>
        <p className="text-gray-500 mb-6">Try adjusting your search filters or explore different locations</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            <Search className="w-4 h-4 mr-2" />
            Search All Listings
          </button>
          <button 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        {listings.map((listing) => (
          <ListingCard 
            key={listing.id} 
            listing={listing} 
            viewMode="list"
          />
        ))}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {listings.map((listing) => (
        <ListingCard 
          key={listing.id} 
          listing={listing} 
          viewMode="grid"
        />
      ))}
    </div>
  );
};

export default ListingGrid;