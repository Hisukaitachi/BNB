import { useEffect, useState } from "react";
import axios from "../../api/axios";
import ReviewCard from "../../components/ReviewCard";

const ReviewsAndFeedback = () => {
  const [written, setWritten] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const res = await axios.get("/reviews/my-reviews", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setWritten(res.data.written);
      setReceived(res.data.received);
    } catch (err) {
      console.error("Failed to load reviews", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      await axios.delete(`/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      fetchReviews();
    } catch (err) {
      alert("Failed to delete review");
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading reviews...</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Reviews & Feedback</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">Reviews You've Written</h2>
        {written.length === 0 ? (
          <p>No reviews written yet.</p>
        ) : (
          written.map((rev) => (
            <ReviewCard key={rev.id} review={rev} onDelete={handleDelete} canDelete />
          ))
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-3">Reviews You've Received</h2>
        {received.length === 0 ? (
          <p>No reviews received yet.</p>
        ) : (
          received.map((rev) => (
            <ReviewCard key={rev.id} review={rev} />
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewsAndFeedback;
