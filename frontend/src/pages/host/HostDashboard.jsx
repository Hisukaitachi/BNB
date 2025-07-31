import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

const HostDashboard = () => {
  const [stats, setStats] = useState({
    listingsCount: 0,
    pendingBookings: 0,
    approvedBookings: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");

        const listingsRes = await axios.get("/listings/my-listings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const bookingsRes = await axios.get("/bookings/host-bookings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const allBookings = bookingsRes.data;

        const pending = allBookings.filter(b => b.status === "pending").length;
        const approved = allBookings.filter(b => b.status === "approved").length;

        setStats({
          listingsCount: listingsRes.data.length,
          pendingBookings: pending,
          approvedBookings: approved,
        });

        setRecentBookings(allBookings.slice(0, 3));
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <p className="p-6">Loading dashboard...</p>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Host Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold">My Listings</h2>
          <p className="text-2xl">{stats.listingsCount}</p>
        </div>

        <div className="bg-yellow-50 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold">Pending Bookings</h2>
          <p className="text-2xl">{stats.pendingBookings}</p>
        </div>

        <div className="bg-green-50 rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold">Approved Bookings</h2>
          <p className="text-2xl">{stats.approvedBookings}</p>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Recent Bookings</h2>

        {recentBookings.length === 0 ? (
          <p>No recent bookings.</p>
        ) : (
          <div className="space-y-4">
            {recentBookings.map(b => (
              <div key={b.booking_id} className="border rounded p-4 shadow-sm bg-white">
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm text-gray-600">Guest: {b.client_name}</p>
                <p className="text-sm">Status: {b.status}</p>
                <p className="text-sm">
                  {b.check_in_date} to {b.check_out_date}
                </p>
                <p className="font-bold">₱{b.total_price}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => navigate("/host-dashboard/create-listing")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
        >
          + Create New Listing
        </button>

        <button
          onClick={() => navigate("/host-dashboard/listings")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
        >
          Manage My Listings
        </button>

        <button
          onClick={() => navigate("/host-dashboard/bookings")}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-500"
        >
          Manage Bookings
        </button>
      </div>
    </div>
  );
};

export default HostDashboard;
