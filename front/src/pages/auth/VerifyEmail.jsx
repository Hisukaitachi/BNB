import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromRegister = location.state?.email || "";

  const [email, setEmail] = useState(emailFromRegister);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");

    try {
      const res = await axios.post("http://localhost:5000/api/users/verify-email", { email, code });
      setMessage(res.data.message);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 border rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-center">Verify Your Email</h2>

      {message && <p className="text-green-600 mb-4">{message}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email"
          className="w-full border px-3 py-2 rounded" required />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Verification Code"
          className="w-full border px-3 py-2 rounded" required />
        <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Verify</button>
      </form>
    </div>
  );
};

export default VerifyEmail;
