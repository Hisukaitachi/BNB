// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, ArrowRight, Shield, Globe, Award } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
  const [searchData, setSearchData] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 1
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchData);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="glass-effect rounded-xl p-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Where to?"
              value={searchData.location}
              onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
              className="w-full pl-10 pr-4 py-4 bg-white/10 border-0 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={searchData.checkIn}
              onChange={(e) => setSearchData({ ...searchData, checkIn: e.target.value })}
              className="w-full pl-10 pr-4 py-4 bg-white/10 border-0 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={searchData.checkOut}
              onChange={(e) => setSearchData({ ...searchData, checkOut: e.target.value })}
              className="w-full pl-10 pr-4 py-4 bg-white/10 border-0 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex">
            <div className="relative flex-1">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={searchData.guests}
                onChange={(e) => setSearchData({ ...searchData, guests: parseInt(e.target.value) })}
                className="w-full pl-10 pr-4 py-4 bg-white/10 border-0 rounded-l-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                {[1,2,3,4,5,6,7,8].map(num => (
                  <option key={num} value={num} className="bg-gray-800">
                    {num} Guest{num > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-r-lg transition-all duration-300 font-medium"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

const HomePage = () => {
  const navigate = useNavigate();

  const handleSearch = (searchData) => {
    navigate('/listings', { state: { searchData } });
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Verified Quality",
      description: "Every property undergoes our verification process"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Local Experts", 
      description: "Our hosts provide authentic local recommendations"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Thoughtful Design",
      description: "Spaces curated for comfort and functionality"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'
          }}
        >
          <div className="gradient-overlay absolute inset-0"></div>
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            <span className="text-stroke">Reimagine</span> Your Staycation
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-gray-300 max-w-3xl mx-auto">
            Discover curated spaces that transform ordinary getaways into extraordinary experiences
          </p>
          
          <SearchBar onSearch={handleSearch} />
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
          <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition animate-bounce-slow">
            <ArrowRight className="w-6 h-6 text-white rotate-90" />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Why <span className="gradient-text">STAY</span>?
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              We go beyond just accommodation to craft memorable experiences that connect you with unique spaces.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1517840901100-8179e982acb7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'
          }}
        >
          <div className="gradient-overlay absolute inset-0"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready for Your Next <span className="gradient-text">Adventure</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of travelers who've discovered unforgettable stays with STAY.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={() => navigate('/listings')}
              className="btn-primary text-lg px-8 py-4"
            >
              Find Your Retreat
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="btn-secondary text-lg px-8 py-4"
            >
              Become a Host
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;