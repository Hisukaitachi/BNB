import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useSocket } from "../../context/SocketContext";
import { toast } from "react-toastify";
import { BadgeCheck, XCircle, Home, CheckCircle } from "lucide-react";

const HostBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  const fetchHostBookings = async () => {
    try {
      const res = await axios.get("/bookings/host-bookings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setBookings(res.data);
    } catch (err) {
      console.error("Failed to fetch host bookings", err);
      toast.error("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this booking?`)) return;

    try {
      await axios.put(
        `/bookings/${id}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(`Booking ${status}`);
      fetchHostBookings();
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error("Failed to update booking.");
    }
  };

  const markAsCompleted = async (id) => {
    if (!window.confirm("Mark this booking as completed?")) return;

    try {
      await axios.put(
        `/bookings/${id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success("Booking marked as completed.");
      fetchHostBookings();
    } catch (err) {
      console.error("Failed to mark as completed", err);
      toast.error("Failed to mark booking as completed.");
    }
  };

  useEffect(() => {
    fetchHostBookings();

    if (socket) {
      socket.on("newNotification", (data) => {
        toast.info(data.message);
      });

      return () => socket.off("newNotification");
    }
  }, [socket]);

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      declined: "bg-red-100 text-red-700",
      confirmed: "bg-blue-100 text-blue-700",
      rejected: "bg-red-200 text-red-800",
      cancelled: "bg-gray-200 text-gray-600",
      completed: "bg-gray-300 text-gray-700",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-500"}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const BookingCard = ({ booking }) => {
    const title = booking.title || "Untitled Listing";
    const location = booking.location || "No Location Info";

    return (
      <div className="border rounded-lg p-5 shadow bg-white hover:shadow-lg transition flex flex-col justify-between h-full">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center mb-2">
            <Home size={18} className="mr-2 text-gray-500" />
            {title}
          </h2>

          <p className="text-sm text-gray-600 mb-1">Location: {location}</p>
          <p className="text-sm text-gray-600 mb-1">Guest: {booking.client_name}</p>
          <p className="text-sm text-gray-600 mb-1">
            {booking.start_date} → {booking.end_date}
          </p>
          <p className="text-sm font-semibold mt-1">Total: ₱{booking.total_price}</p>

          <div className="mt-2">
            <StatusBadge status={booking.status} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {booking.status === "pending" && (
            <>
              <button
                onClick={() => updateStatus(booking.id, "approved")}
                className="flex items-center bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
              >
                <BadgeCheck size={16} className="mr-1" />
                Approve
              </button>

              <button
                onClick={() => updateStatus(booking.id, "declined")}
                className="flex items-center bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
              >
                <XCircle size={16} className="mr-1" />
                Decline
              </button>
            </>
          )}

          {booking.status === "approved" && (
            <button
              onClick={() => markAsCompleted(booking.id)}
              className="flex items-center bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
            >
              <CheckCircle size={16} className="mr-1" />
              Mark as Completed
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Manage Bookings</h1>

      {loading ? (
        <p className="text-center text-gray-500">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="text-center">No booking requests yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HostBookings;
