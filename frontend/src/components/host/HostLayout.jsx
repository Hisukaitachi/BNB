// src/components/host/HostLayout.jsx
import { Outlet } from "react-router-dom";
import HostNavbar from "../../components/host/HostNavbar";

const HostLayout = () => {
  return (
    <div>
      <HostNavbar />
      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default HostLayout;
