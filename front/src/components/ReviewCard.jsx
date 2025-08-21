import React from "react";

const ReviewCard = ({ review, onDelete, canDelete }) => {
  return (
    <div className="border p-4 rounded shadow mb-3">
      <p className="font-semibold">{review.reviewer_name || "You"}:</p>
      <p className="text-yellow-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
      <p className="italic mb-2">"{review.comment}"</p>
      <p className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>

      {canDelete && (
        <button
          onClick={() => onDelete(review.id)}
          className="mt-2 text-red-600 hover:underline text-sm"
        >
          Delete
        </button>
      )}
    </div>
  );
};

export default ReviewCard;
