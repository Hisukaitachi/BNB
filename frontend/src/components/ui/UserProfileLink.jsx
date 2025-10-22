// src/components/ui/UserProfileLink.jsx - WITH PROFILE PICTURES
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';

const UserProfileLink = ({ 
  userId, 
  name, 
  role = 'user',
  profilePicture = null,  // ✅ ADD THIS
  className = '', 
  showAvatar = true, 
  showRole = false,
  size = 'md' 
}) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (userId) {
      console.log('Navigating to profile:', userId);
      navigate(`/profile/${userId}`);
    } else {
      console.log('No userId provided');
    }
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const debugClass = userId ? '' : 'opacity-50 cursor-not-allowed';

  return (
    <div 
      onClick={handleClick}
      className={`flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity ${className} ${debugClass}`}
      title={userId ? `View ${name}'s profile` : 'No user ID'}
    >
      {showAvatar && (
        <Avatar 
          user={{ 
            name: name, 
            profile_picture: profilePicture 
          }} 
          size={size}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-medium hover:text-purple-400 transition-colors truncate ${textSizeClasses[size]} ${userId ? 'text-white' : 'text-red-400'}`}>
          {name || 'No name provided'}
          {!userId && ' (No ID)'}
        </p>
        {showRole && (
          <p className="text-gray-400 text-xs capitalize">
            {role}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserProfileLink;