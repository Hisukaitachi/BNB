// src/pages/Dashboard.jsx
import { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { toast } from "react-toastify";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("newNotification", (data) => {
      toast.info(data.message);
    });

    return () => {
      socket.off("newNotification");
    };
  }, [socket]);

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h2 className="text-3xl font-bold mb-4">My Dashboard</h2>
      <p className="text-gray-700 mb-2">
        Welcome back, <strong>{user?.name}</strong>
      </p>
      <p className="text-gray-600">Role: {user?.role}</p>
    </div>
  );
};

export default Dashboard;
