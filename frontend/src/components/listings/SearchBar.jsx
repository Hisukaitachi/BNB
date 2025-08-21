import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users } from 'lucide-react';

const SearchBar = ({ onSearch, className = '' }) => {
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
    <form onSubmit={handleSubmit} className={`w-full max-w-4xl mx-auto ${className}`}>
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

export default SearchBar;