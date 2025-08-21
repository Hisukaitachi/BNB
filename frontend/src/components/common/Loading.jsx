import React from 'react';
import Logo from './Logo';

const Loading = ({ message = 'Loading...', fullScreen = true }) => {
  const Spinner = () => (
    <div className="relative">
      <div className="w-12 h-12 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-pink-500 rounded-full animate-spin animation-delay-150"></div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Spinner />
          <p className="text-gray-400 mt-4">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        <Logo size="large" className="mb-8" />
        <Spinner />
        <p className="text-gray-400 mt-6 text-lg">{message}</p>
      </div>
    </div>
  );
};

export default Loading;