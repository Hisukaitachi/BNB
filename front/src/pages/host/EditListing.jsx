import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import { toast } from "react-toastify";

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    price_per_night: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await axios.get(`/listings/${id}`);
        setForm({
          title: res.data.title,
          location: res.data.location,
          description: res.data.description,
          price_per_night: res.data.price_per_night,
        });
      } catch (err) {
        console.error("Failed to fetch listing:", err);
        toast.error("Failed to load listing details.");
      } finally {
        setFetching(false);
      }
    };

    fetchListing();
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`/listings/${id}`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      toast.success("Listing updated successfully!");
      navigate("/host/listings");
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update listing.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-xl mx-auto mt-10 text-center text-gray-500">
        Loading listing details...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded">
      <h2 className="text-2xl font-bold mb-4 text-center">Edit Listing</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Title"
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="Location"
          className="w-full border p-2 rounded"
          required
        />
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
          className="w-full border p-2 rounded"
          required
        />
        <input
          name="price_per_night"
          type="number"
          value={form.price_per_night}
          onChange={handleChange}
          placeholder="₱ Price per night"
          className="w-full border p-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Updating..." : "Update Listing"}
        </button>
      </form>
    </div>
  );
};

export default EditListing;
