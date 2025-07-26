import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const fetchFavorites = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("You need to be logged in to view favorites.");
      navigate("/login");
      return;
    }

    try {
      const res = await axios.get("/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(res.data);
    } catch (err) {
      console.error("Failed to fetch favorites", err);

      if (err.response && err.response.status === 401) {
        toast.error("Session expired. Please log in again.");
        logout(); // Auto-logout on session expiration
        navigate("/login");
      } else {
        toast.error("Failed to load favorites.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  if (loading) return <p className="text-center mt-10">Loading favorites...</p>;

  if (favorites.length === 0)
    return <p className="text-center mt-10">You have no favorites yet.</p>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">My Favorites</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((fav) => (
          <Link
            key={fav.id}
            to={`/listing/${fav.id}`}
            className="border p-4 rounded shadow hover:shadow-md transition"
          >
            <img
              src={`http://localhost:5000${fav.image_url}`}
              alt={fav.title}
              className="w-full h-40 object-cover mb-2 rounded"
            />
            <h2 className="text-xl font-semibold">{fav.title}</h2>
            <p className="text-gray-600">{fav.location}</p>
            <p className="font-bold text-green-600">₱{fav.price_per_night} / night</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Favorites;
