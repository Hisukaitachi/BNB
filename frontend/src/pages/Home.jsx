import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Home = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    city: "",
    keyword: "",
    price_min: "",
    price_max: "",
    min_rating: "",
    sortBy: "created_at",
    order: "DESC",
  });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/listings/search", {
        params: filters,
      });
      setListings(res.data.listings || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero + Search */}
      <div className="bg-blue-100 p-8 rounded-xl shadow mb-10">
        <h1 className="text-4xl font-bold mb-4 text-center text-blue-900">
          Horizon Retreats
        </h1>
        <p className="text-center text-blue-800 mb-6">
          Find your perfect getaway 🌴 — from cozy cabins to beachside bungalows
        </p>

        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <input
            type="text"
            name="city"
            placeholder="City"
            value={filters.city}
            onChange={handleChange}
            className="p-2 rounded border w-full"
          />
          <input
            type="text"
            name="keyword"
            placeholder="Keyword"
            value={filters.keyword}
            onChange={handleChange}
            className="p-2 rounded border w-full"
          />
          <input
            type="number"
            name="price_min"
            placeholder="Min Price"
            value={filters.price_min}
            onChange={handleChange}
            className="p-2 rounded border w-full"
          />
          <input
            type="number"
            name="price_max"
            placeholder="Max Price"
            value={filters.price_max}
            onChange={handleChange}
            className="p-2 rounded border w-full"
          />

          <select
            name="min_rating"
            value={filters.min_rating}
            onChange={handleChange}
            className="p-2 rounded border w-full"
          >
            <option value="">Min Rating</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>

          <select
            name="sortBy"
            value={filters.sortBy}
            onChange={handleChange}
            className="p-2 rounded border w-full"
          >
            <option value="created_at">Newest</option>
            <option value="price_per_night">Price</option>
          </select>

          <select
            name="order"
            value={filters.order}
            onChange={handleChange}
            className="p-2 rounded border w-full"
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>

          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition w-full"
          >
            Search
          </button>
        </form>
      </div>

      {/* Listings */}
      {loading ? (
        <p className="text-center text-gray-600">Loading listings...</p>
      ) : listings.length === 0 ? (
        <p className="text-center text-gray-500">No listings found.</p>
      ) : (
        <>
          <p className="text-gray-700 mb-4 text-sm text-right">
            {total} listing{total !== 1 && "s"} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="border rounded-lg shadow hover:shadow-md transition overflow-hidden"
              >
                <img
                  src={`http://localhost:5000${listing.image_url}`}
                  alt={listing.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h2 className="text-xl font-semibold">{listing.title}</h2>
                  <p className="text-gray-500">{listing.location}</p>
                  <p className="text-green-600 font-bold mt-2">
                    ₱{listing.price_per_night} / night
                  </p>
                  <p className="text-yellow-500 text-sm mt-1">
                    ⭐{" "}
                    {typeof listing.average_rating === "number"
                      ? listing.average_rating.toFixed(1)
                      : "N/A"}{" "}
                    / 5
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-center mt-10">
        <Link
          to="/listings"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          View All Listings
        </Link>
      </div>
    </div>
  );
};

export default Home;
