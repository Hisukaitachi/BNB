import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("/users/login", form);
      const { token, user } = res.data;

      login(user, token);

      // 🚀 Redirect by role
      if (user.role === "admin") {
        navigate("/admin/users"); // 🔧 Changed to /admin/users as your default admin landing page
      } else if (user.role === "host") {
        navigate("/host-dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full mb-3 p-2 border rounded"
          required
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Password"
          className="w-full mb-4 p-2 border rounded"
          required
        />
        {error && <p className="text-red-500 mb-3">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-500"
        >
          Login
        </button>
      </form>

      <div className="mt-4 text-sm text-center space-y-2">
        <p>
          Don't have an account?{" "}
          <a href="/register" className="text-blue-600 underline">
            Sign up now
          </a>
        </p>
        <p>
          <a href="/forgot-password" className="text-blue-600 underline">
            Forgot your password?
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
