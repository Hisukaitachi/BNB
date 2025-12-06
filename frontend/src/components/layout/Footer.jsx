import React from 'react';
import Logo from '../common/Logo';

const Footer = () => {
  return (
    <footer className="bg-gray-900 py-10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          <Logo className="mb-4" />
          <p className="text-gray-400 mb-8">
            Redefining staycations through unique experiences and memorable connections.
          </p>
          <p className="text-gray-500 text-sm">
            &copy; 2025 STAY. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;