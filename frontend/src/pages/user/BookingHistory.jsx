// src/pages/BookingHistory.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { toast } from "react-toastify";

const BookingHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState("");

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`/bookings/${id}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Error fetching booking history", err);
      toast.error("Failed to fetch booking history.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingStatus = async () => {
    try {
      const res = await axios.get(`/bookings/${id}`);
      setBookingStatus(res.data.status);
    } catch (err) {
      console.error("Failed to fetch booking status", err);
    }
  };

  const handleCancelBooking = async () => {
    try {
      await axios.put(`/bookings/${id}/status`, { status: "cancelled" });
      toast.success("Booking cancelled.");
      navigate("/my-bookings");
    } catch (err) {
      console.error("Cancel failed", err);
      toast.error(err.response?.data?.message || "Cancel failed");
    }
  };

  useEffect(() => {
    if (!id) {
      toast.error("Booking ID is missing in the URL.");
      navigate("/my-bookings");
      return;
    }

    fetchHistory();
    fetchBookingStatus();
  }, [id]);

  if (loading) return <p className="text-center mt-10">Loading booking history...</p>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Booking History</h1>

      {history.length === 0 ? (
        <p className="text-center text-gray-500">No history for this booking.</p>
      ) : (
        <ul className="space-y-4">
          {history.map((log) => (
            <li key={log.id} className="border rounded p-4 shadow-sm bg-white">
              <p className="font-semibold">{log.old_status} → {log.new_status}</p>
              <p className="text-sm text-gray-600 mt-1">{log.note}</p>
              <p className="text-xs text-gray-400 mt-1">
                Changed by: {log.changed_by_name} | {new Date(log.changed_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {bookingStatus === "pending" && (
        <div className="mt-6 text-center">
          <button
            onClick={handleCancelBooking}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-400 transition"
          >
            Cancel Booking
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingHistory;
