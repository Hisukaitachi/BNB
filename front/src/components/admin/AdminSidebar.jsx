import { Link } from "react-router-dom";

const AdminSidebar = () => {
  return (
    <div className="w-64 bg-gray-800 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
      <nav className="space-y-3">
        <Link to="/admin/dashboard-stats" className="block hover:underline">Dashboard</Link>
        <Link to="/admin/users" className="block hover:underline">Users</Link>
        <Link to="/admin/listings" className="block hover:underline">Listings</Link>
        <Link to="/admin/bookings" className="block hover:underline">Bookings</Link>
        <Link to="/admin/reviews" className="block hover:underline">Reviews</Link>
        <Link to="/admin/transactions" className="block hover:underline text-green-400">Transactions</Link>
        <Link to="/admin/reports" className="block hover:underline text-blue-400">Reports</Link>
      </nav>
    </div>
  );
};

export default AdminSidebar;
