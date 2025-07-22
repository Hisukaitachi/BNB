import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    totalBookings: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    axios.get("/admin/dashboard-stats", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(res => setStats(res.data))
    .catch(err => console.error(err));
  }, []);

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="p-6 flex-1">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white shadow p-4 rounded text-center">
            <p className="text-lg font-semibold">Users</p>
            <p className="text-2xl">{stats.totalUsers}</p>
          </div>
          <div className="bg-white shadow p-4 rounded text-center">
            <p className="text-lg font-semibold">Listings</p>
            <p className="text-2xl">{stats.totalListings}</p>
          </div>
          <div className="bg-white shadow p-4 rounded text-center">
            <p className="text-lg font-semibold">Bookings</p>
            <p className="text-2xl">{stats.totalBookings}</p>
          </div>
          <div className="bg-white shadow p-4 rounded text-center">
            <p className="text-lg font-semibold">Revenue</p>
            <p className="text-2xl">₱{stats.totalRevenue}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
