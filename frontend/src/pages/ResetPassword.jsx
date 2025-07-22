import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const ResetPassword = () => {
  const location = useLocation();
  const emailFromNav = location.state?.email || "";
  const [form, setForm] = useState({ email: emailFromNav, code: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");

    try {
      const res = await axios.post("http://localhost:5000/api/users/reset-password", form);
      setMessage(res.data.message);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-center">Reset Password</h2>

      {message && <p className="text-green-600 mb-4">{message}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="email" value={form.email} onChange={handleChange} type="email"
          className="w-full border px-3 py-2 rounded" placeholder="Email" required />
        <input name="code" value={form.code} onChange={handleChange} placeholder="Reset Code"
          className="w-full border px-3 py-2 rounded" required />
        <input name="newPassword" value={form.newPassword} onChange={handleChange} type="password"
          placeholder="New Password" className="w-full border px-3 py-2 rounded" required />
        <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;
