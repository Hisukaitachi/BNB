import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { toast } from "react-toastify";

const AdminTransactions = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await axios.get("/admin/bookings");
      setBookings(res.data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      toast.error("Failed to fetch bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const processPayout = async (bookingId) => {
    const confirm = window.confirm("Are you sure you want to process payout for this booking?");
    if (!confirm) return;

    setLoading(true);
    try {
      await axios.post(`/admin/payout/${bookingId}`);
      toast.success("Payout processed successfully");
      fetchBookings();
    } catch (err) {
      console.error("Payout error:", err);
      toast.error(err.response?.data?.message || "Failed to process payout");
    }
    setLoading(false);
  };

  const processRefund = async (bookingId) => {
    const confirm = window.confirm("Are you sure you want to refund this booking?");
    if (!confirm) return;

    setLoading(true);
    try {
      await axios.post(`/admin/refund/${bookingId}`);
      toast.success("Refund processed successfully");
      fetchBookings();
    } catch (err) {
      console.error("Refund error:", err);
      toast.error(err.response?.data?.message || "Failed to process refund");
    }
    setLoading(false);
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="p-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">Transaction Management</h1>

        {loading && <p className="text-blue-500 mb-4">Processing...</p>}

        <table className="w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Booking ID</th>
              <th className="p-2">Listing</th>
              <th className="p-2">Client</th>
              <th className="p-2">Total Price</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="text-center border-b">
                <td className="p-2">{b.id}</td>
                <td className="p-2">{b.listing_title}</td>
                <td className="p-2">{b.client_name}</td>
                <td className="p-2">₱{b.total_price}</td>
                <td className="p-2">{b.status}</td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => processPayout(b.id)}
                    disabled={loading || b.status === "paid_out" || b.status === "refunded"}
                    className={`px-3 py-1 rounded ${
                      b.status === "paid_out" || b.status === "refunded"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white`}
                  >
                    Payout
                  </button>
                  <button
                    onClick={() => processRefund(b.id)}
                    disabled={loading || b.status === "paid_out" || b.status === "refunded"}
                    className={`px-3 py-1 rounded ${
                      b.status === "paid_out" || b.status === "refunded"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600"
                    } text-white`}
                  >
                    Refund
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <p className="text-gray-500 text-center mt-4">No bookings found.</p>
        )}
      </div>
    </div>
  );
};

export default AdminTransactions;
