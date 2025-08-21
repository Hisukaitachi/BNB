import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { toast } from "react-toastify";

const ListingsManagement = () => {
  const [listings, setListings] = useState([]);

  const fetchListings = () => {
    axios.get("/admin/listings", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(res => setListings(res.data))
    .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const removeListing = (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;

    axios.delete(`/admin/listings/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(() => {
      toast.success("Listing removed");
      fetchListings();
    })
    .catch(() => toast.error("Failed to remove listing"));
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="p-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">Listings Management</h1>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Title</th>
              <th className="p-2 border">Location</th>
              <th className="p-2 border">Price/Night</th>
              <th className="p-2 border">Host ID</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map(listing => (
              <tr key={listing.id}>
                <td className="p-2 border">{listing.title}</td>
                <td className="p-2 border">{listing.location}</td>
                <td className="p-2 border">₱{listing.price_per_night}</td>
                <td className="p-2 border">{listing.host_id}</td>
                <td className="p-2 border">
                  <button onClick={() => removeListing(listing.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListingsManagement;
