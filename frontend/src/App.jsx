import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Pages - Public & Client/Host
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import MyBookings from "./pages/MyBookings"; // New combined file
import ListingDetails from "./pages/ListingDetails";
import Notifications from "./pages/Notifications";
import NotificationsPage from "./pages/NotificationsPage";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";
import ListingsManagement from "./pages/admin/ListingsManagement";
import BookingsManagement from "./pages/admin/BookingsManagement";
import ReviewsManagement from "./pages/admin/ReviewsManagement";
import AdminTransactions from './pages/admin/AdminTransactions';

// Host Pages
import HostDashboard from "./pages/host/HostDashboard";
import HostBookings from "./pages/host/HostBookings";
import HostListings from "./pages/host/HostListings";
import CreateListing from "./pages/host/CreateListing";
import EditListing from "./pages/host/EditListing";

// Components
import Navbar from "./components/Navbar";
import HostLayout from "./components/host/HostLayout";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <Router>
          <Navbar />
          <main className="p-4">
            <Routes>

              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/listing/:id" element={<ListingDetails />} />
              <Route path="/favorites" element={<Favorites />} />

              {/* Host Routes with Layout */}
              <Route path="/host-dashboard" element={<PrivateRoute><HostLayout /></PrivateRoute>}>
                <Route index element={<HostDashboard />} />
                <Route path="listings" element={<HostListings />} />
                <Route path="bookings" element={<HostBookings />} />
                <Route path="create-listing" element={<CreateListing />} />
                <Route path="edit-listing/:id" element={<EditListing />} />
              </Route>

              {/* Client/Host Protected Routes */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
              <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
              <Route path="/my-bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/notifications-page" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard-stats" element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} />
              <Route path="/admin/users" element={<PrivateRoute adminOnly={true}><UsersManagement /></PrivateRoute>} />
              <Route path="/admin/listings" element={<PrivateRoute adminOnly={true}><ListingsManagement /></PrivateRoute>} />
              <Route path="/admin/bookings" element={<PrivateRoute adminOnly={true}><BookingsManagement /></PrivateRoute>} />
              <Route path="/admin/reviews" element={<PrivateRoute adminOnly={true}><ReviewsManagement /></PrivateRoute>} />
              <Route path="/admin/transactions" element={<PrivateRoute adminOnly={true}><AdminTransactions /></PrivateRoute>} />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <ToastContainer />
        </Router>
      </AuthProvider>
    </SocketProvider>
  );
}

export default App;
