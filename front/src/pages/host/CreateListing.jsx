import { useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LocationPicker = ({ setCoords }) => {
  useMapEvents({
    click(e) {
      setCoords({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });
  return null;
};

const CreateListing = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price_per_night: "",
    location: "",
    image: null,
    video: null,
  });

  const [coords, setCoords] = useState(null); // No default, only set when host clicks
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    if (e.target.type === "file") {
      setForm({ ...form, [e.target.name]: e.target.files[0] });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!coords) {
      toast.error("Please click on the map to select a location.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("price_per_night", form.price_per_night);
    formData.append("location", form.location);
    formData.append("latitude", coords.lat);
    formData.append("longitude", coords.lng);
    if (form.image) formData.append("image", form.image);
    if (form.video) formData.append("video", form.video);

    try {
      await axios.post("/listings", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Listing created successfully!");
      navigate("/host/listings");
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || "Failed to create listing.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Create New Listing</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Price per Night (₱)</label>
          <input
            type="number"
            name="price_per_night"
            value={form.price_per_night}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Location Name (e.g. BGC, Tagaytay)</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
  <label className="block font-medium mb-2">Pick Location on Map</label>
  <div style={{ height: "300px", width: "100%", marginTop: "1rem", borderRadius: "0.5rem" }}>
  <MapContainer
    center={coords || [13.41, 122.56]} // Philippines default
    zoom={6}
    scrollWheelZoom={true}
    style={{ height: "100%", width: "100%" }}
  >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
      />
      <LocationPicker setCoords={setCoords} />
      {coords && <Marker position={[coords.lat, coords.lng]} />}
    </MapContainer>
  </div>
  <p className="text-sm mt-2 text-gray-600">
    Click anywhere on the map to drop a pin for the listing location.
  </p>
</div>


        <div>
          <label className="block font-medium">Image</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-medium">Video (optional)</label>
          <input
            type="file"
            name="video"
            accept="video/*"
            onChange={handleChange}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Creating..." : "Create Listing"}
        </button>
      </form>
    </div>
  );
};

export default CreateListing;
