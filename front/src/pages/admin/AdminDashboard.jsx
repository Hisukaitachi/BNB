import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { useSocket } from "../../context/SocketContext";
import {
  UserGroupIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  BellIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    axios
      .get("/admin/dashboard-stats", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setStats(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    axios
      .get("/notifications", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setNotifications(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    socket.on("newNotification", handleNewNotification);
    return () => socket.off("newNotification", handleNewNotification);
  }, [socket]);

  const handleMarkAsRead = (id) => {
    axios
      .patch(`/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
        );
      })
      .catch(console.error);
  };

  const handleMarkAllAsRead = () => {
    axios
      .patch("/notifications/read-all", {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      })
      .catch(console.error);
  };

  const statCards = [
    {
      title: "Users",
      value: stats.totalUsers || 0,
      icon: <UserGroupIcon className="h-8 w-8 text-white fill-current" />,
      color: "from-blue-500 to-indigo-600",
    },
    {
      title: "Listings",
      value: stats.totalListings || 0,
      icon: <HomeIcon className="h-8 w-8 text-white fill-current" />,
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Bookings",
      value: stats.totalBookings || 0,
      icon: <ClipboardDocumentListIcon className="h-8 w-8 text-white fill-current" />,
      color: "from-yellow-500 to-amber-600",
    },
    {
      title: "Revenue",
      value: `₱${stats.totalRevenue || 0}`,
      icon: <CurrencyDollarIcon className="h-8 w-8 text-white fill-current" />,
      color: "from-purple-500 to-fuchsia-600",
    },
  ];

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <AdminSidebar />
      <div className="flex-1 p-6 lg:p-10 space-y-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-6 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold">Welcome back, Admin</h1>
          <p className="text-sm text-indigo-100">Here’s what’s happening today</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className={`bg-gradient-to-r ${card.color} text-white p-6 rounded-2xl shadow-lg hover:scale-105 transform transition`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <BellIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  className={`p-4 cursor-pointer transition duration-200 flex items-start space-x-3 rounded-lg ${
                    n.is_read
                      ? "bg-gray-50 text-gray-500"
                      : "bg-blue-50 text-gray-900 font-medium"
                  } hover:bg-gray-100`}
                >
                  {!n.is_read && <span className="h-2 w-2 mt-2 rounded-full bg-blue-500"></span>}
                  <div className="flex-1">
                    <p>{n.message}</p>
                    <span className="block text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {n.is_read && (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
