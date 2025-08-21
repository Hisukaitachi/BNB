import { useState } from "react";
import axios from "../api/axios";

const ReviewForm = ({ bookingId, revieweeId, type, onSuccess }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/reviews", {
        booking_id: bookingId,
        reviewee_id: revieweeId,
        rating,
        comment,
        type,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      alert("Review submitted!");
      setComment("");
      setRating(5);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div>
        <label className="block mb-1">Rating:</label>
        <select value={rating} onChange={(e) => setRating(e.target.value)} className="border p-2 rounded w-full">
          {[5,4,3,2,1].map(star => (
            <option key={star} value={star}>{star} Star{star > 1 && "s"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1">Comment:</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="border p-2 rounded w-full"
          rows={3}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
};

export default ReviewForm;
