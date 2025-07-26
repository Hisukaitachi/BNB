import axios from "axios";
import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const BecomeHost = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const promoteUser = async () => {
      try {
        await axios.put(`http://localhost:5000/api/users/${user.id}/promote`);
        updateUser({ ...user, role: "host" });
        navigate("/dashboard");
      } catch (err) {
        console.error("Promotion failed", err);
      }
    };

    promoteUser();
  }, [user, navigate, updateUser]);

  return (
    <div className="text-center mt-20 text-lg text-gray-700">
      Promoting your account to Host...
    </div>
  );
};

export default BecomeHost;
