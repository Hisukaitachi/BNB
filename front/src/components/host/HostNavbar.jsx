import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import axios from "../../api/axios";
import { Bell, LogOut, Repeat } from "lucide-react"; // Use Repeat for switching roles


const HostNavbar = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await axios.get("/notifications", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const unread = res.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };

    fetchUnreadCount();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSwitchToClient = async () => {
    try {
      await axios.put(`/users/${user.id}/demote`);
      const updatedUser = { ...user, role: "client" };
      login(updatedUser, localStorage.getItem("token"));
      navigate("/");
    } catch (err) {
      console.error("Switch role failed", err);
      alert("Failed to switch role.");
    }
  };

  return (
    <nav className="bg-gray-900 text-white px-8 py-4 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/host-dashboard" className="text-2xl font-bold text-yellow-400 hover:text-yellow-300 transition-colors">
          Horizon Host Panel
        </Link>

        <div className="flex items-center space-x-6">
          <Link to="/host-dashboard" className="hover:text-yellow-300 transition-colors">
            Dashboard
          </Link>
          <Link to="/host-dashboard/listings" className="hover:text-yellow-300 transition-colors">
            My Listings
          </Link>
          <Link to="/host-dashboard/bookings" className="hover:text-yellow-300 transition-colors">
            Bookings
          </Link>

          <Link to="/host-dashboard/calendar" className="hover:text-yellow-300 transition-colors">
            Calendar & Earnings
          </Link>

          <Link to="/notifications" className="relative hover:text-yellow-300 transition-colors">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs px-1.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </Link>

          <button
            onClick={handleSwitchToClient}
            className="flex items-center bg-blue-600 px-3 py-1 rounded-md hover:bg-blue-500 text-sm transition"
          >
            <Repeat size={16} className="mr-1" />
            Switch to Traveller
          </button>


          <button
            onClick={handleLogout}
            className="flex items-center bg-red-500 px-3 py-1 rounded-md hover:bg-red-600 text-sm transition"
          >
            <LogOut size={16} className="mr-1" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default HostNavbar;
