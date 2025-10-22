// src/components/listings/HostInfo.jsx - UPDATED WITH AVATAR
import React from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import UserProfileLink from '../ui/UserProfileLink';
import Avatar from '../ui/Avatar';

const HostInfo = ({ listing, isAuthenticated, onContactHost, onReportHost }) => {
  return (
    <div className="mb-8 p-6 bg-gray-800 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* ✅ Replace the gradient circle with Avatar */}
          <Avatar 
            user={{
              name: listing.host_name,
              profile_picture: listing.host_profile_picture
            }}
            size="xl"
          />
          <div>
            <UserProfileLink
              userId={listing.host_id}
              name={`Hosted by ${listing.host_name}`}
              role="host"
              profilePicture={listing.host_profile_picture}  // ✅ Pass profile picture
              size="md"
              showAvatar={false}
              className="text-white hover:text-purple-400"
            />
            <p className="text-sm text-gray-400">Host since {new Date(listing.created_at).getFullYear()}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onContactHost}
          className="border-purple-500 text-purple-400"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Contact Host
        </Button>
      </div>

      {/* Review and Report Actions */}
      {isAuthenticated && (
        <div className="flex space-x-3 pt-4 border-t border-gray-700">
          <Button
            onClick={onReportHost}
            variant="outline"
            size="sm"
            className="border-red-600 text-red-400 hover:bg-red-900/20"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Report Issue
          </Button>
        </div>
      )}
    </div>
  );
};

export default HostInfo;