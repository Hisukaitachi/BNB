// src/pages/profile/components/ProfileSidebar.jsx
import { useState } from 'react';
import { User, RefreshCw, Star } from 'lucide-react';
import Button from '../ui/Button';

const ProfileSidebar = ({ user, reviewsData, switchRole }) => {
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [errors, setErrors] = useState({});

  const handleRoleSwitch = async () => {
    setIsSwitchingRole(true);
    try {
      const newRole = user.role === 'client' ? 'host' : 'client';
      await switchRole(newRole);
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      setErrors({ role: error.message || 'Failed to switch role' });
    } finally {
      setIsSwitchingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <ProfileCard user={user} reviewsData={reviewsData} />

      {/* Role Switching */}
      {user.role !== 'admin' && (
        <RoleSwitchCard 
          user={user}
          handleRoleSwitch={handleRoleSwitch}
          isSwitchingRole={isSwitchingRole}
          errors={errors}
        />
      )}

      {/* Quick Stats */}
      <QuickStatsCard user={user} reviewsData={reviewsData} />
    </div>
  );
};

// Profile Card Component
const ProfileCard = ({ user, reviewsData }) => (
  <div className="bg-gray-800 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Account Info</h3>
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-white" />
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-white font-semibold truncate">{user.name}</p>
        <p className="text-gray-400 text-sm break-all">{user.email}</p>
      </div>

      <div className="bg-gray-700 rounded-lg p-4 text-center">
        <span className="text-purple-400 font-semibold text-lg capitalize">
          {user.role}
        </span>
        <p className="text-gray-400 text-sm mt-1">Current Role</p>
      </div>

      {/* Quick Stats */}
      {reviewsData.statistics?.averageRating && (
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center space-x-1 mb-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className={`w-4 h-4 ${
                  index < Math.round(reviewsData.statistics.averageRating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-400'
                }`}
              />
            ))}
          </div>
          <p className="text-white font-semibold">
            {reviewsData.statistics.averageRating.toFixed(1)} Rating
          </p>
          <p className="text-gray-400 text-sm">
            {reviewsData.statistics.totalReviews} reviews
          </p>
        </div>
      )}
    </div>
  </div>
);

// Role Switch Card Component
const RoleSwitchCard = ({ user, handleRoleSwitch, isSwitchingRole, errors }) => (
  <div className="bg-gray-800 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Switch Role</h3>
    
    {errors.role && (
      <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 text-sm">
        {errors.role}
      </div>
    )}
    
    <div className="space-y-4">
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">
              {user.role === 'client' ? 'Become a Host' : 'Switch to Client'}
            </p>
            <p className="text-gray-400 text-sm">
              {user.role === 'client' 
                ? 'Start hosting and earning' 
                : 'Return to booking stays'
              }
            </p>
          </div>
          <RefreshCw className={`w-5 h-5 text-purple-400 ${isSwitchingRole ? 'animate-spin' : ''}`} />
        </div>
      </div>

      <Button
        onClick={handleRoleSwitch}
        loading={isSwitchingRole}
        variant="gradient"
        size="lg"
        className="w-full"
      >
        Switch to {user.role === 'client' ? 'Host' : 'Client'}
      </Button>
    </div>
  </div>
);

// Quick Stats Card Component
const QuickStatsCard = ({ user, reviewsData }) => (
  <div className="bg-gray-800 rounded-xl p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Member since</span>
        <span className="text-white">
          {new Date(user.created_at || Date.now()).toLocaleDateString()}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Account Status</span>
        <span className={`text-sm px-2 py-1 rounded ${
          user.isVerified ? 'bg-green-900/20 text-green-400' : 'bg-yellow-900/20 text-yellow-400'
        }`}>
          {user.isVerified ? 'Verified' : 'Unverified'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Reviews Received</span>
        <span className="text-white">
          {reviewsData.received?.length || 0}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400">Reviews Written</span>
        <span className="text-white">
          {reviewsData.written?.length || 0}
        </span>
      </div>
    </div>
  </div>
);

export default ProfileSidebar;