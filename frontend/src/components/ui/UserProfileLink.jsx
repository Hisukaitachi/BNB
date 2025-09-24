// src/components/ui/UserProfileLink.jsx - With debugging
import React from 'react';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserProfileLink = ({ 
  userId, 
  name, 
  role = 'user', 
  className = '', 
  showAvatar = true, 
  showRole = false,
  size = 'md' 
}) => {
  const navigate = useNavigate();

  // Debug logging
  console.log('UserProfileLink rendered:', { userId, name, role });

  const handleClick = (e) => {
    console.log('UserProfileLink clicked:', { userId, name });
    e.preventDefault();
    e.stopPropagation();
    
    if (userId) {
      console.log('Navigating to:', `/profile/${userId}`);
      navigate(`/profile/${userId}`);
    } else {
      console.log('No userId provided, cannot navigate');
    }
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  // Show different styling if no userId to make debugging easier
  const debugClass = userId ? '' : 'opacity-50 cursor-not-allowed';

  return (
    <div 
      onClick={handleClick}
      className={`flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity ${className} ${debugClass}`}
      title={`Click to view profile (ID: ${userId})`} // Tooltip for debugging
    >
      {showAvatar && (
        <div className={`${sizeClasses[size]} bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0`}>
          <User className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
        </div>
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