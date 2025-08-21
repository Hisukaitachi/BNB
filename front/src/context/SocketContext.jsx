import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        console.log("Socket disconnected due to logout");
      }
      return;
    }

    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      auth: {
        token: localStorage.getItem("token"),
      },
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket.io:", newSocket.id);
      newSocket.emit("register", user.id);
    });

    newSocket.on("reconnect", (attempt) => {
      console.log(`Reconnected (attempt ${attempt}) - re-registering user`);
      newSocket.emit("register", user.id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    // Real-time ban event
    newSocket.on("banned", (data) => {
      console.log(data.message);
      toast.error(data.message); // show toast
      logout();
      navigate("/banned");
    });

    // Real-time unban event
    newSocket.on("unbanned", (data) => {
      console.log(data.message);
      toast.success(data.message); // show friendly toast
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      console.log("Socket disconnected on component unmount");
    };
  }, [user, logout, navigate]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
