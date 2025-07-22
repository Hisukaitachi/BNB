import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";

const Profile = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/users/me");
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, []);

  if (!profile) return <p className="text-center">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 border rounded">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <p><strong>Name:</strong> {profile.name}</p>
      <p><strong>Email:</strong> {profile.email}</p>
      <p><strong>Role:</strong> {profile.role}</p>

      {/* Edit Profile Link */}
      <Link
        to="/edit-profile"
        className="inline-block mt-6 text-blue-600 hover:underline"
      >
        ✏️ Edit Profile
      </Link>

      <Link
  to="/change-password"
  className="text-blue-600 hover:underline block mt-2"
>
  Change Password
</Link>
    </div>
  );
};

export default Profile;
