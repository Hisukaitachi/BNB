import { useEffect, useState } from "react";
import axios from "../api/axios";
import { useSocket } from "../context/SocketContext";
import { toast } from "react-toastify";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const socket = useSocket();

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/notifications/${id}/read`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      // Locally update the notification state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      toast.error("Failed to mark notification as read.");
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      const handleNewNotification = (notif) => {
        toast.info(notif.message);

        setNotifications((prev) => [notif, ...prev]);
      };

      socket.on("newNotification", handleNewNotification);

      return () => {
        socket.off("newNotification", handleNewNotification);
      };
    }
  }, [socket]);

  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      {loading ? (
        <p className="text-gray-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3 mb-2 border rounded ${
              n.is_read ? "bg-gray-100" : "bg-white"
            }`}
          >
            <p>{n.message}</p>
            <small className="text-gray-500">
              {new Date(n.created_at).toLocaleString()}
            </small>
            {!n.is_read && (
              <button
                onClick={() => markAsRead(n.id)}
                className="ml-3 text-sm text-blue-500 hover:underline"
              >
                Mark as Read
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications;
