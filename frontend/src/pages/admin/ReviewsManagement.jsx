import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { toast } from "react-toastify";

const ReviewsManagement = () => {
  const [reviews, setReviews] = useState([]);

  const fetchReviews = () => {
    axios.get("/admin/reviews", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(res => setReviews(res.data))
    .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const removeReview = (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    axios.delete(`/admin/reviews/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(() => {
      toast.success("Review removed");
      fetchReviews();
    })
    .catch(() => toast.error("Failed to remove review"));
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="p-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">Reviews Management</h1>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Reviewer ID</th>
              <th className="p-2 border">Listing ID</th>
              <th className="p-2 border">Rating</th>
              <th className="p-2 border">Comment</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id}>
                <td className="p-2 border">{r.user_id}</td>
                <td className="p-2 border">{r.listing_id}</td>
                <td className="p-2 border">{r.rating}</td>
                <td className="p-2 border">{r.comment}</td>
                <td className="p-2 border">
                  <button onClick={() => removeReview(r.id)} className="bg-red-500 text-white px-2 py-1 rounded">
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

export default ReviewsManagement;
