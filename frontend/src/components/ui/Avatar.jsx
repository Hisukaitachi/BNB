// src/components/ui/Avatar.jsx
import React from 'react';
import { getImageUrl } from '../../services/api';

const Avatar = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl',
    '2xl': 'w-24 h-24 text-3xl'
  };

  const getInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  const profilePic = user?.profile_picture || user?.profilePicture;
  if (profilePic) {
    return (
      <img
        src={getImageUrl(user.profile_picture)}
        alt={`${user.name}'s profile`}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          // Fallback to initials on error
          e.target.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = `${sizeClasses[size]} rounded-full bg-gradient-to-r from-purple-400 to-pink-600 flex items-center justify-center text-white font-medium ${className}`;
          fallback.textContent = getInitials();
          e.target.parentNode.appendChild(fallback);
        }}
      />
    );
  }

  // Default avatar with initials
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-purple-400 to-pink-600 flex items-center justify-center text-white font-medium ${className}`}>
      {getInitials()}
    </div>
  );
};

export default Avatar;