// src/pages/admin/ListingsTab.jsx
import React, { useState, useEffect } from 'react';
import { Building2, Eye, Edit, Trash2, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';

const ListingsTab = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { showToast } = useApp();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await api.getAllListings();
      if (response.status === 'success') {
        setListings(response.data.listings || []);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      showToast('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (listingId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await api.put(`/admin/listings/${listingId}/status`, { status: newStatus });
      
      setListings(prev => prev.map(listing => 
        listing.id === listingId 
          ? { ...listing, status: newStatus }
          : listing
      ));
      
      showToast(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    } catch (error) {
      showToast('Failed to update listing status', 'error');
    }
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;

    try {
      await api.delete(`/admin/listings/${selectedListing.id}`);
      setListings(prev => prev.filter(listing => listing.id !== selectedListing.id));
      showToast('Listing deleted successfully', 'success');
      setShowDeleteModal(false);
      setSelectedListing(null);
    } catch (error) {
      showToast('Failed to delete listing', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-500/20 text-green-400',
      inactive: 'bg-red-500/20 text-red-400',
      pending: 'bg-yellow-500/20 text-yellow-400'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {status}
      </span>
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.host?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <Loading message="Loading listings..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Listings Management</h2>
          <p className="text-gray-400">Manage and review all property listings</p>
        </div>
        <div className="text-sm text-gray-400">
          Total: {listings.length} listings
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Listing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Host
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredListings.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={listing.image_urls?.[0] || '/placeholder-property.jpg'}
                        alt={listing.title}
                        className="w-12 h-12 rounded-lg object-cover mr-4"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">{listing.title}</div>
                        <div className="text-sm text-gray-400">{listing.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{listing.host?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-400">{listing.host?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {formatPrice(listing.price_per_night)}/night
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(listing.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(listing.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={listing.status === 'active' ? 'danger' : 'success'}
                        onClick={() => handleToggleStatus(listing.id, listing.status)}
                      >
                        {listing.status === 'active' ? 
                          <XCircle className="w-4 h-4" /> : 
                          <CheckCircle className="w-4 h-4" />
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Listing Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Listing Details"
        size="lg"
      >
        {selectedListing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <p className="text-white">{selectedListing.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <p className="text-white">{selectedListing.location}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <p className="text-white">{selectedListing.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                <p className="text-white">{formatPrice(selectedListing.price_per_night)}/night</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Capacity</label>
                <p className="text-white">{selectedListing.max_guests} guests</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                {getStatusBadge(selectedListing.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Bedrooms</label>
                <p className="text-white">{selectedListing.bedrooms}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Bathrooms</label>
                <p className="text-white">{selectedListing.bathrooms}</p>
              </div>
            </div>

            {selectedListing.image_urls && selectedListing.image_urls.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Images</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedListing.image_urls.slice(0, 4).map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`${selectedListing.title} ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Listing"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Are you sure you want to delete <strong>{selectedListing?.title}</strong>?
          </p>
          <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded-lg">
            <strong>This action will:</strong>
            <ul className="mt-2 space-y-1">
              <li>• Permanently delete the listing</li>
              <li>• Cancel all pending bookings</li>
              <li>• Remove all reviews and ratings</li>
              <li>• This action cannot be undone</li>
            </ul>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDeleteListing}
            >
              Delete Listing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ListingsTab;