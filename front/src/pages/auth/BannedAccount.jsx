import React from "react";
import { Link } from "react-router-dom";

export default function BannedAccount() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
      <h1 className="text-3xl font-bold text-red-600">Account Banned</h1>
      <p className="mt-4 text-gray-700 text-center max-w-md">
        Your account has been banned by an administrator.  
        If you believe this is a mistake, please contact our support team.
      </p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
      >
        Back to Home
      </Link>
    </div>
  );
}
