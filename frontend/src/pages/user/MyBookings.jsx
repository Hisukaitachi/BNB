import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { toast } from "react-toastify";
import ReportForm from "../../components/ReportForm";
import { useAuth } from "../../context/AuthContext"; // Required for getting user/token

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(null);

  const { user, token } = useAuth();

  const fetchBookings = async () => {
    try {
      const res = await axios.get("/bookings/my-bookings");
      setBookings(res.data);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
      toast.error("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (bookingId) => {
    try {
      const res = await axios.get(`/bookings/${bookingId}/history`);
      setHistory((prev) => ({ ...prev, [bookingId]: res.data }));
    } catch (err) {
      console.error("Failed to fetch booking history", err);
      toast.error("Failed to load booking history.");
    }
  };

  const toggleHistory = (bookingId) => {
    if (expandedBooking === bookingId) {
      setExpandedBooking(null);
    } else {
      setExpandedBooking(bookingId);
      if (!history[bookingId]) {
        fetchHistory(bookingId);
      }
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      await axios.put(`/bookings/${bookingId}/status`, { status: "cancelled" });
      toast.success("Booking cancelled.");
      fetchBookings();
    } catch (err) {
      console.error("Cancel failed", err);
      toast.error(err.response?.data?.message || "Failed to cancel booking.");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading bookings...</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-center text-gray-500">You have no bookings yet.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map((booking) => (
            <li key={booking.id} className="border rounded p-4 shadow-sm bg-white">
              <div className="flex justify-between items-start md:items-center flex-col md:flex-row">
                <div>
                  <p className="font-semibold text-lg">{booking.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.start_date).toLocaleDateString()} -{" "}
                    {new Date(booking.end_date).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-sm">
                    Status: <span className="font-medium capitalize">{booking.status}</span>
                  </p>
                </div>

                <div className="space-x-2 mt-2 md:mt-0">
                  {booking.status === "pending" && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-400 transition"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={() => toggleHistory(booking.id)}
                    className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 transition"
                  >
                    {expandedBooking === booking.id ? "Hide History" : "View History"}
                  </button>

                  {["completed", "cancelled"].includes(booking.status) && (
                    <button
                      onClick={() => setShowReportForm(showReportForm === booking.id ? null : booking.id)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-400 transition"
                    >
                      {showReportForm === booking.id ? "Hide Report" : "Report"}
                    </button>
                  )}
                </div>
              </div>

              {expandedBooking === booking.id && (
                <div className="mt-4 bg-gray-50 p-3 rounded border text-sm">
                  {history[booking.id] ? (
                    history[booking.id].length === 0 ? (
                      <p className="text-gray-500">No history for this booking.</p>
                    ) : (
                      <ul className="space-y-2">
                        {history[booking.id].map((log) => (
                          <li key={log.id} className="border rounded p-2 bg-white">
                            <p className="font-semibold">
                              {log.old_status} → {log.new_status}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{log.note}</p>
                            <p className="text-xs text-gray-400">
                              By: {log.changed_by_name} |{" "}
                              {new Date(log.changed_at).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    <p>Loading history...</p>
                  )}
                </div>
              )}

              {showReportForm === booking.id && (
                <div className="mt-4">
                <ReportForm reportedUserId={booking.host_id} bookingId={booking.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyBookings;
