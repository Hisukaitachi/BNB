import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../../api/axios";
import ListingMap from "../../components/ListingMap";
import DatePicker from "react-datepicker"; // ✅ NEW
import "react-datepicker/dist/react-datepicker.css"; // ✅ NEW

const ListingDetails = () => {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(null); // ✅ Changed to Date object
  const [endDate, setEndDate] = useState(null); // ✅ Changed to Date object
  const [totalPrice, setTotalPrice] = useState(0);
  const [nights, setNights] = useState(0);

  const [bookedRanges, setBookedRanges] = useState([]); // ✅ NEW

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [completedBooking, setCompletedBooking] = useState(null);

  // ... your imports stay exactly the same

useEffect(() => {
  window.scrollTo(0, 0);
  const fetchData = async () => {
    try {
      const resListing = await axios.get(`/listings/${id}`);
      setListing(resListing.data);

      const token = localStorage.getItem("token");

      const [resFavorites, resReviews, resBookings, resBlockedDates] = await Promise.all([
        axios.get("/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/reviews/listing/${id}`),
        axios.get("/bookings/my-bookings", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/bookings/booked-dates/${id}`) // ✅ Removed extra `/api` unless needed
      ]);

      setIsFavorited(resFavorites.data.some((f) => f.listing_id === parseInt(id)));
      setReviews(resReviews.data.reviews || []);

      // ✅ Handle both possible backend formats
      const bookedArray = resBlockedDates.data.bookedDates || resBlockedDates.data;
      const blocked = bookedArray.map(b => ({
        start: new Date(b.start_date),
        end: new Date(b.end_date)
      }));
      setBookedRanges(blocked);

      const completed = resBookings.data.find(
        (b) => b.listing_id === parseInt(id) && b.status === "completed"
      );
      setCompletedBooking(completed || null);
    } catch (err) {
      console.error("Error loading listing details:", err);
      alert("Failed to load listing data.");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [id]);

  useEffect(() => {
    if (startDate && endDate && listing) {
      const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (diff > 0) {
        setNights(diff);
        setTotalPrice(diff * listing.price_per_night);
      } else {
        setNights(0);
        setTotalPrice(0);
      }
    }
  }, [startDate, endDate, listing]);

  useEffect(() => {
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      setAverageRating(avg.toFixed(1));
    } else {
      setAverageRating(null);
    }
  }, [reviews]);

  const toggleFavorite = async () => {
    const token = localStorage.getItem("token");
    try {
      if (isFavorited) {
        await axios.delete(`/favorites/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`/favorites/${id}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setIsFavorited(!isFavorited);
    } catch (err) {
      console.error("Failed to toggle favorite", err);
      alert("Something went wrong with favorites.");
    }
  };

  const handleBooking = async () => {
    try {
      await axios.post(
        "/bookings",
        {
          listing_id: listing.id,
          start_date: startDate.toISOString().split("T")[0], // ✅ Convert to YYYY-MM-DD
          end_date: endDate.toISOString().split("T")[0],
          total_price: totalPrice,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      alert("Booking request sent!");
    } catch (err) {
      console.error("Booking failed", err);
      alert("Booking failed.");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!completedBooking) {
      alert("You can only leave a review after completing a booking!");
      return;
    }

    try {
      await axios.post(
        "/reviews",
        {
          booking_id: completedBooking.id,
          reviewee_id: listing.host_id,
          rating: parseInt(rating),
          comment,
          type: "listing",
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setComment("");
      setRating(5);

      const res = await axios.get(`/reviews/listing/${id}`);
      setReviews(res.data.reviews || []);

      alert("Review submitted!");
    } catch (err) {
      console.error("Failed to submit review", err);
      alert(err.response?.data?.message || "Failed to submit review.");
    }
  };

  const renderStars = (count) => {
    return "★".repeat(count) + "☆".repeat(5 - count);
  };

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (!listing) return <p className="text-center mt-10">Listing not found</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <img
        src={`http://localhost:5000${listing.image_url}`}
        alt={listing.title}
        className="w-full h-64 object-cover rounded mb-4"
      />
      <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>

      {averageRating && (
        <p className="text-yellow-600 font-semibold mb-2">
          ⭐ {averageRating} average rating ({reviews.length} review{reviews.length !== 1 && "s"})
        </p>
      )}
      <h1>{listing.title}</h1>

      <button
        onClick={toggleFavorite}
        className={`px-3 py-1 rounded ${
          isFavorited ? "bg-red-500 text-white" : "bg-gray-300 text-black"
        }`}
      >
        {isFavorited ? "❤️ Unfavorite" : "🤍 Favorite"}
      </button>

      <p className="text-gray-600 mt-2">{listing.location}</p>
      <p className="text-green-600 font-semibold mb-4">₱{listing.price_per_night} / night</p>
      <p className="mb-6">{listing.description}</p>

      <ListingMap
        latitude={listing.latitude}
        longitude={listing.longitude}
        location={listing.location}
      />

      {/* ✅ Booking Section with disabled booked dates */}
      <div className="border rounded p-4 space-y-3 mb-10 mt-6">
        <h2 className="text-xl font-semibold">Book This Listing</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            startDate={startDate}
            endDate={endDate}
            selectsStart
            excludeDateIntervals={bookedRanges}
            minDate={new Date()}
            placeholderText="Check-in"
            className="border p-2 rounded w-full"
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            startDate={startDate}
            endDate={endDate}
            selectsEnd
            excludeDateIntervals={bookedRanges}
            minDate={startDate || new Date()}
            placeholderText="Check-out"
            className="border p-2 rounded w-full"
          />
        </div>
        {nights > 0 && (
          <p>
            {nights} night(s) × ₱{listing.price_per_night} = <strong>₱{totalPrice}</strong>
          </p>
        )}
        <button
          onClick={handleBooking}
          disabled={!startDate || !endDate || nights <= 0}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Confirm Booking
        </button>
      </div>

      {/* Reviews Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Guest Reviews</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="border-b py-3">
              <div className="flex justify-between">
                <p className="font-semibold">{rev.reviewer_name}</p>
                <span className="text-sm text-gray-500">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-yellow-500">{renderStars(rev.rating)}</p>
              <p>{rev.comment}</p>
            </div>
          ))
        )}

        {completedBooking ? (
          <form onSubmit={handleReviewSubmit} className="mt-6 space-y-3">
            <h3 className="text-xl font-semibold">Leave a Review</h3>
            <div>
              <label className="block mb-1">Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="border p-2 rounded w-full"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border p-2 rounded w-full"
                rows="4"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!comment.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Submit Review
            </button>
          </form>
        ) : (
          <p className="text-red-500 mt-4">
            You can leave a review after your booking is completed.
          </p>
        )}
      </div>
    </div>
  );
};

export default ListingDetails;
