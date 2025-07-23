import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";

const Inbox = () => {
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const navigate = useNavigate();
  const socket = useSocket();

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await axios.get("/messages/inbox", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConversations(res.data);

        // Optional: Preload online users if backend sends initial online users list in future
      } catch (err) {
        console.error("Inbox fetch error", err);
      }
    };

    if (token) fetchInbox();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (userId) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: true }));
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    };

    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);

    return () => {
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, [socket]);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>

      {conversations.length === 0 ? (
        <p className="text-gray-500">No conversations yet.</p>
      ) : (
        conversations.map((c) => (
          <div
            key={c.other_user_id}
            className="p-4 border rounded mb-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
            onClick={() => navigate(`/chat/${c.other_user_id}`)}
          >
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full inline-block ${
                    onlineUsers[c.other_user_id] ? "bg-green-500" : "bg-gray-400"
                  }`}
                ></span>
                {c.other_user_name}
              </p>
              <p className="text-gray-500 text-sm truncate">{c.last_message}</p>
            </div>
            {c.unread_count > 0 && (
              <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                {c.unread_count}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Inbox;
