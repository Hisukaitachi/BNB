import React from 'react';

const Logo = ({ size = 'normal', className = '' }) => {
  const sizes = {
    small: 'text-lg',
    normal: 'text-2xl',
    large: 'text-4xl'
  };

  return (
    <div className={`font-bold ${sizes[size]} ${className}`}>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        STAY
      </span>
    </div>
  );
};

export default Logo;