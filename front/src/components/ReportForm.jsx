import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const ReportForm = ({ reportedUserId, bookingId, reportedUserRole }) => {
  const { user, token } = useAuth();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ DEBUG: Log the props to ensure values are being passed
  useEffect(() => {
    console.log("Reported User ID:", reportedUserId);
    console.log("Booking ID:", bookingId);
  }, [reportedUserId, bookingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Reason is required.");
      return;
    }

    if (!reportedUserId) {
      toast.error("Reported user ID is missing.");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        "/reports",
        {
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          booking_id: bookingId || null,
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Report submitted successfully.");
      setReason("");
    } catch (err) {
      console.error("Error submitting report:", err);
      toast.error("Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-md p-6 rounded-lg max-w-md w-full"
    >
      <h2 className="text-xl font-semibold mb-4">
        Report {reportedUserRole === "host" ? "a Host" : "a Client"}
      </h2>

      <div className="mb-4">
        <label htmlFor="reason" className="block font-medium mb-1">
          Reason
        </label>
        <textarea
          id="reason"
          className="w-full border rounded p-2 h-32"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
      >
        {loading ? "Submitting..." : "Submit Report"}
      </button>
    </form>
  );
};

export default ReportForm;
