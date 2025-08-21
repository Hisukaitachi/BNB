import React, { useState } from 'react';
import { Send } from 'lucide-react';
import Logo from '../common/Logo';

const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Subscribe:', email);
    setEmail('');
  };

  return (
    <footer className="bg-gray-900 pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <Logo className="mb-4" />
            <p className="text-gray-400">
              Redefining staycations through unique experiences and memorable connections.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              <li><a href="/listings" className="text-gray-400 hover:text-purple-400 transition">Destinations</a></li>
              <li><a href="/experiences" className="text-gray-400 hover:text-purple-400 transition">Experiences</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition">Stories</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition">Gift Cards</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Hosting</h4>
            <ul className="space-y-2">
              <li><a href="/register" className="text-gray-400 hover:text-purple-400 transition">Become a Host</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition">Host Resources</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition">Safety</a></li>
              <li><a href="#" className="text-gray-400 hover:text-purple-400 transition">Community</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Connect</h4>
            <div className="flex space-x-4 mb-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-purple-500 transition flex items-center justify-center">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-purple-500 transition flex items-center justify-center">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-purple-500 transition flex items-center justify-center">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-purple-500 transition flex items-center justify-center">
                <i className="fab fa-tiktok"></i>
              </a>
            </div>
            <p className="text-gray-400 mb-3">
              Subscribe to our newsletter for exclusive offers
            </p>
            <form onSubmit={handleSubscribe} className="flex">
              <input 
                type="email" 
                placeholder="Your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 text-white px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
              />
              <button 
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-r-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; 2024 STAY. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-purple-400 transition text-sm">Privacy</a>
            <a href="#" className="text-gray-500 hover:text-purple-400 transition text-sm">Terms</a>
            <a href="#" className="text-gray-500 hover:text-purple-400 transition text-sm">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;