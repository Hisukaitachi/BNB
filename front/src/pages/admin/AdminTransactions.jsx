import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { toast } from "react-toastify";

const AdminTransactions = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const fetchPayouts = async () => {
    try {
      const res = await axios.get("/admin/bookings");
      setBookings(res.data);
    } catch (err) {
      console.error("Error fetching payouts:", err);
      toast.error("Failed to fetch payouts");
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const releasePayout = async (booking) => {
    if (!booking) {
      console.error("Booking is undefined");
      return;
    }

    const confirm = window.confirm(`Release payout of ₱${booking.total_price} to host?`);
    if (!confirm) return;

    setLoading(true);
    setProcessingId(booking.id);

    try {
      await axios.post("/payouts/release", {
        host_id: booking.host_id,
        booking_id: booking.id,
        amount: booking.total_price,
      });

      toast.success("Payout released successfully!");
      await fetchPayouts();
    } catch (err) {
      console.error("Payout error:", err);
      toast.error(err.response?.data?.message || "Failed to release payout");
    } finally {
      setLoading(false);
      setProcessingId(null);
    }
  };

  const processRefund = async (bookingId) => {
    const confirm = window.confirm("Are you sure you want to process a refund?");
    if (!confirm) return;

    setLoading(true);
    setProcessingId(bookingId);

    try {
      await axios.post("/refunds/process", { booking_id: bookingId });
      toast.success("Refund processed successfully!");
      await fetchPayouts();
    } catch (err) {
      console.error("Refund error:", err);
      toast.error(err.response?.data?.message || "Failed to process refund");
    } finally {
      setLoading(false);
      setProcessingId(null);
    }
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="p-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">Transaction Management</h1>

        {loading && (
          <p className="text-blue-500 mb-4">
            Processing transaction #{processingId}...
          </p>
        )}

        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-gray-200 text-left">
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
              <tr key={b.id} className="border-b">
                <td className="p-2">{b.id}</td>
                <td className="p-2">{b.listing_title}</td>
                <td className="p-2">{b.client_name}</td>
                <td className="p-2">₱{b.total_price}</td>
                <td className="p-2 capitalize">{b.status}</td>
                <td className="p-2 space-x-2">
                  <button
                    onClick={() => releasePayout(b)}
                    disabled={
                      loading ||
                      processingId === b.id ||
                      b.status === "paid_out" ||
                      b.status === "refunded"
                    }
                    className={`px-3 py-1 rounded text-white ${
                      b.status === "paid_out" || b.status === "refunded"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    Payout
                  </button>
                  <button
                    onClick={() => processRefund(b.id)}
                    disabled={
                      loading ||
                      processingId === b.id ||
                      b.status === "paid_out" ||
                      b.status === "refunded"
                    }
                    className={`px-3 py-1 rounded text-white ${
                      b.status === "paid_out" || b.status === "refunded"
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    Refund
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <p className="text-gray-500 text-center mt-6">No bookings found.</p>
        )}
      </div>
    </div>
  );
};

export default AdminTransactions;
