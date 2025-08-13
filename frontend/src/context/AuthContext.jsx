import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const navigate = useNavigate();

  const login = (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  // ✅ Check ban status every 30 seconds for logged-in users
  useEffect(() => {
    if (!user) return;

    const checkBanStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:5000/api/admin/check-ban/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.banned) {
          logout();
          navigate("/banned");
        }
      } catch (err) {
        console.error("Ban check error:", err);
      }
    };

    // Run immediately on load
    checkBanStatus();
    // Run every 30s in background
    const interval = setInterval(checkBanStatus, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
