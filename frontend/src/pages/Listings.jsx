// src/pages/Listings.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";

const Listings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await axios.get("/listings");
        setListings(res.data.listings || []);
      } catch (err) {
        console.error("Failed to fetch listings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">All Listings</h1>
      {loading ? (
        <p className="text-center">Loading listings...</p>
      ) : listings.length === 0 ? (
        <p className="text-center">No listings found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              to={`/listing/${listing.id}`}
              className="border rounded shadow hover:shadow-lg transition"
            >
              <img
                src={`http://localhost:5000${listing.image_url}`}
                alt={listing.title}
                className="w-full h-48 object-cover rounded-t"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold">{listing.title}</h2>
                <p className="text-gray-600">{listing.location}</p>
                <p className="font-bold text-green-600">
                  ₱{listing.price_per_night} / night
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Listings;
