import { useState, useEffect, useCallback } from "react";
import axios from "../../api/axios";
import { useSocket } from "../../context/SocketContext";
import { CalendarCheck, CheckCircle, AlertCircle, Bell } from "lucide-react";
import { toast } from "react-toastify";

const PAGE_SIZE = 10;

const NotificationsPage = () => {
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await axios.get(`/notifications?page=${pageNum}&limit=${PAGE_SIZE}`);
      const data = res.data;

      setNotifications((prev) =>
        append ? [...prev, ...data] : data
      );

      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on("newNotification", (data) => {
        setNotifications((prev) => [{ ...data, is_read: 0, created_at: new Date() }, ...prev]);
        toast.info(data.message);
      });

      return () => socket.off("newNotification");
    }
  }, [socket, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "booking_request": return <CalendarCheck className="w-5 h-5 text-blue-500 mr-2" />;
      case "booking_approved": return <CheckCircle className="w-5 h-5 text-green-500 mr-2" />;
      case "admin_notice": return <AlertCircle className="w-5 h-5 text-red-500 mr-2" />;
      default: return <Bell className="w-5 h-5 text-gray-400 mr-2" />;
    }
  };

  const filteredNotifications = notifications.filter(n => 
    filter === "all" ? true : n.type === filter
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Notifications Center</h1>

      <div className="flex justify-between mb-4">
        <div className="space-x-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded ${filter === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("booking_request")}
            className={`px-3 py-1 rounded ${filter === "booking_request" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Booking
          </button>
          <button
            onClick={() => setFilter("admin_notice")}
            className={`px-3 py-1 rounded ${filter === "admin_notice" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            Admin
          </button>
          <button
            onClick={() => setFilter("general")}
            className={`px-3 py-1 rounded ${filter === "general" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            General
          </button>
        </div>

        <button
          onClick={markAllAsRead}
          className="text-sm text-blue-500 hover:underline"
        >
          Mark All as Read
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-gray-500">No notifications to show.</div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer ${
                n.is_read ? "text-gray-600" : "font-semibold text-black"
              }`}
              onClick={() => markAsRead(n.id)}
            >
              {getIcon(n.type)}
              <div>
                <div>{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchNotifications(nextPage, true);
            }}
            className="text-blue-500 hover:underline text-sm"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
