import { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { toast } from "react-toastify";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);

  const fetchUsers = () => {
    axios.get("/admin/users", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(res => setUsers(res.data))
    .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const banUser = (id) => {
    axios.put(`/admin/users/${id}/ban`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(() => {
      toast.success("User banned");
      fetchUsers();
    })
    .catch(() => toast.error("Failed to ban user"));
  };

  const unbanUser = (id) => {
    axios.put(`/admin/users/${id}/unban`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(() => {
      toast.success("User unbanned");
      fetchUsers();
    })
    .catch(() => toast.error("Failed to unban user"));
  };

  const changeRole = (id, role) => {
    axios.put(`/admin/users/${id}/role`, { role }, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
    .then(() => {
      toast.success(`User role changed to ${role}`);
      fetchUsers();
    })
    .catch(() => toast.error("Failed to change role"));
  };

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="p-6 flex-1">
        <h1 className="text-2xl font-bold mb-4">Users Management</h1>
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Role</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className="p-2 border">{u.name}</td>
                <td className="p-2 border">{u.email}</td>
                <td className="p-2 border">{u.role}</td>
                <td className="p-2 border">{u.is_banned ? "Banned" : "Active"}</td>
                <td className="p-2 border space-x-2">
                  {u.is_banned ? (
                    <button onClick={() => unbanUser(u.id)} className="bg-green-500 text-white px-2 py-1 rounded">Unban</button>
                  ) : (
                    <button onClick={() => banUser(u.id)} className="bg-red-500 text-white px-2 py-1 rounded">Ban</button>
                  )}
                  {u.role !== "admin" && (
                    <>
                      {u.role === "client" ? (
                        <button onClick={() => changeRole(u.id, "host")} className="bg-yellow-400 px-2 py-1 rounded">Make Host</button>
                      ) : (
                        <button onClick={() => changeRole(u.id, "client")} className="bg-blue-400 px-2 py-1 rounded">Make Client</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersManagement;
