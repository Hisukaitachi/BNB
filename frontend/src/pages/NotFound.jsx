// src/pages/NotFound.jsx
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="text-center mt-20">
      <h1 className="text-5xl font-bold text-red-500 mb-4">404</h1>
      <p className="text-lg text-gray-700 mb-6">Oops! Page not found.</p>
      <Link
        to="/"
        className="text-white bg-green-600 px-4 py-2 rounded hover:bg-green-700"
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFound;
