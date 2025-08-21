import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import { Pencil, Trash2, Plus, ImageOff } from "lucide-react";
import { toast } from "react-toastify";

const HostListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchListings = async () => {
    try {
      const res = await axios.get("/listings/my-listings", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setListings(res.data);
    } catch (err) {
      console.error("Failed to fetch listings", err);
      toast.error("Failed to load listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;

    try {
      await axios.delete(`/listings/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setListings((prev) => prev.filter((listing) => listing.id !== id));
      toast.success("Listing deleted successfully.");
    } catch (err) {
      console.error("Error deleting listing", err);
      toast.error("Failed to delete listing.");
    }
  };

  const ListingCard = ({ listing }) => (
    <div className="border rounded-lg p-4 shadow hover:shadow-lg transition bg-white flex flex-col">
      {listing.image_url ? (
        <img
          src={`http://localhost:5000${listing.image_url}`}
          alt={listing.title}
          className="w-full h-40 object-cover rounded mb-3"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center rounded mb-3 text-gray-400">
          <ImageOff size={40} />
        </div>
      )}

      <h2 className="text-lg font-semibold">{listing.title}</h2>
      <p className="text-sm text-gray-600">{listing.location}</p>
      <p className="font-bold text-green-600">₱{listing.price_per_night} / night</p>

      <div className="mt-auto pt-4 flex space-x-2">
        <button
          onClick={() => navigate(`/host-dashboard/edit-listing/${listing.id}`)}
          className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
        >
          <Pencil size={16} className="mr-1" />
          Edit
        </button>
        <button
          onClick={() => handleDelete(listing.id)}
          className="flex items-center bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
        >
          <Trash2 size={16} className="mr-1" />
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Listings</h1>
        <button
          onClick={() => navigate("/host-dashboard/create-listing")}
          className="flex items-center bg-green-600 text-white px-4 py-2 rounded-xl shadow hover:bg-green-500 transition"
        >
          <Plus size={20} className="mr-2" />
          Create New Listing
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading listings...</p>
      ) : listings.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          <p className="mb-4">You have no listings yet.</p>
          <button
            onClick={() => navigate("/host-dashboard/create-listing")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 transition"
          >
            + Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HostListings;
