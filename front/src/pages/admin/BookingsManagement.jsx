import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { toast } from "react-toastify";

const BookingsManagement = () => {
  const [bookings, setBookings] = useState([]);

  const fetchBookings = () => {
    axios.get("/admin/bookings", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(res => setBookings(res.data))
    .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const cancelBooking = (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    axios.delete(`/admin/bookings/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(() => {
      toast.success("Booking cancelled");
      fetchBookings();
    })
    .catch(() => toast.error("Failed to cancel booking"));
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="p-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">Bookings Management</h1>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Client ID</th>
              <th className="p-2 border">Listing ID</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id}>
                <td className="p-2 border">{b.client_id}</td>
                <td className="p-2 border">{b.listing_id}</td>
                <td className="p-2 border">{b.start_date} - {b.end_date}</td>
                <td className="p-2 border">{b.status}</td>
                <td className="p-2 border space-x-2">
                  <button onClick={() => cancelBooking(b.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                    Cancel
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

export default BookingsManagement;
