import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { toast } from "react-toastify";

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get("/admin/reports");
        setReports(response.data.reports);
      } catch (err) {
        toast.error("Failed to load reports.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleAction = async (reportId, userId, actionType) => {
    const reason = prompt("Enter reason for this action:");
    if (!reason) return;

    setActionInProgress(true);
    try {
      await axios.post("/admin/actions", {
        admin_id: 6, // Replace with actual logged-in admin's ID
        user_id: userId,
        action_type: actionType,
        reason,
        report_id: reportId,
      });

      toast.success(`Action "${actionType}" applied.`);
      // Refresh reports list
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      console.error(err);
      toast.error("Failed to take action.");
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="flex">
        <AdminSidebar />
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Reports</h1>
      {loading ? (
        <p>Loading reports...</p>
      ) : reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white p-4 rounded-xl shadow border"
            >
              <p className="text-sm text-gray-500">
                <strong>Reported by:</strong> {report.reporter_name}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Reported user:</strong> {report.reported_name}
              </p>
              <p className="mt-2 text-gray-700">{report.reason}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() =>
                    handleAction(report.id, report.reported_user_id, "ban")
                  }
                  disabled={actionInProgress}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Ban
                </button>
                <button
                  onClick={() =>
                    handleAction(report.id, report.reported_user_id, "warn")
                  }
                  disabled={actionInProgress}
                  className="bg-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500"
                >
                  Warn
                </button>
                <button
                  onClick={() =>
                    handleAction(report.id, report.reported_user_id, "dismiss")
                  }
                  disabled={actionInProgress}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

export default AdminReports;
