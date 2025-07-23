import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "../api/axios";
import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCircle, CalendarCheck, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

const PAGE_SIZE = 5;

const Navbar = () => {
  const { user, isLoggedIn, logout, login } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await axios.get(`/notifications?page=${pageNum}&limit=${PAGE_SIZE}`);
      if (append) {
        setNotifications((prev) => [...prev, ...res.data]);
      } else {
        setNotifications(res.data);
      }
      setHasMore(res.data.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!isLoggedIn || !socket) return;

    // 🔥 Register user in socket.io so backend knows their socketId
    if (user && user.id) {
      socket.emit('register', user.id);
    }

    fetchNotifications();

    const handleNewNotification = (data) => {
      setNotifications((prev) => [{ ...data, is_read: 0, created_at: new Date() }, ...prev]);
      toast.info(data.message, {
        position: "top-right",
        autoClose: 4000,
        pauseOnHover: true,
        theme: "colored",
      });
    };

    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("newNotification", handleNewNotification);
    };
  }, [isLoggedIn, socket, user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch(`/notifications/read-all`);
      setNotifications((prev) => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleBecomeHost = async () => {
    try {
      await axios.put(`/users/${user.id}/promote`);
      const updatedUser = { ...user, role: "host" };
      login(updatedUser, localStorage.getItem("token"));
      navigate("/host-dashboard");
    } catch (err) {
      console.error("Become host failed:", err);
      toast.error("Failed to become a host.");
    }
  };

  const handleSwitchToClient = async () => {
    try {
      await axios.put(`/users/${user.id}/demote`);
      const updatedUser = { ...user, role: "client" };
      login(updatedUser, localStorage.getItem("token"));
      navigate("/");
    } catch (err) {
      console.error("Switch to client failed:", err);
      toast.error("Failed to switch role.");
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "booking_request": return <CalendarCheck className="w-4 h-4 text-blue-500 mr-2" />;
      case "booking_approved": return <CheckCircle className="w-4 h-4 text-green-500 mr-2" />;
      case "admin_notice": return <AlertCircle className="w-4 h-4 text-red-500 mr-2" />;
      default: return <Bell className="w-4 h-4 text-gray-400 mr-2" />;
    }
  };

  return (
    <nav className="bg-white shadow py-4 px-6">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          Horizon Retreats
        </Link>

        <div className="flex items-center space-x-4 relative">
          <Link to="/listings" className="hover:underline">
            Listings
          </Link>

          {isLoggedIn && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown((prev) => !prev)}
                className="relative focus:outline-none"
              >
                <Bell className="w-6 h-6 hover:text-blue-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  <div className="flex justify-between items-center p-3 border-b font-semibold">
                    <span>Notifications</span>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Mark All as Read
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-3 text-gray-500 text-sm">No notifications.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                          setShowDropdown(false);
                          navigate("/notifications");
                        }}
                        className={`p-3 text-sm flex items-start cursor-pointer hover:bg-gray-100 ${
                          n.is_read ? "text-gray-600" : "font-semibold text-black"
                        }`}
                      >
                        {getIcon(n.type)}
                        <div>
                          {n.message}
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {hasMore && (
                    <div className="p-3 flex justify-center">
                      <button
                        onClick={loadMore}
                        className="text-blue-500 text-sm hover:underline"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isLoggedIn && (
            <>
              {user?.role === "host" && (
                <Link to="/host-dashboard" className="hover:underline">
                  Host Dashboard
                </Link>
              )}
              {user?.role === "client" && (
                <>
                  <Link to="/dashboard" className="hover:underline">
                    Dashboard
                  </Link>
                  <Link to="/my-bookings" className="hover:underline">
                    My Bookings
                  </Link>
                  <Link to="/favorites" className="hover:underline">
                    My Favorites
                  </Link>
                </>
              )}

              {user?.role === "host" && (
                <Link to="/host-bookings" className="hover:underline">
                  Booking Requests
                </Link>
              )}

              {user?.role === "client" ? (
                <button
                  onClick={handleBecomeHost}
                  className="text-sm font-medium bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-300"
                >
                  Become a Host
                </button>
              ) : (
                <button
                  onClick={handleSwitchToClient}
                  className="text-sm font-medium bg-blue-400 px-3 py-1 rounded hover:bg-blue-300"
                >
                  Switch to Traveller
                </button>
              )}

              <Link to="/profile" className="hover:underline">
                Profile
              </Link>
              <button onClick={handleLogout} className="text-red-500 hover:underline">
                Logout
              </button>
            </>
          )}

          {!isLoggedIn && (
            <>
              <Link to="/login" className="hover:underline">
                Login
              </Link>
              <Link to="/register" className="hover:underline">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
