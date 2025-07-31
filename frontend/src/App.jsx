import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Pages - Public & Client/Host
import Home from "./pages/Home";
import Listings from "./pages/listings/Listings";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/user/Dashboard";
import Profile from "./pages/user/Profile";
import EditProfile from "./pages/user/EditProfile";
import ChangePassword from "./pages/auth/ChangePassword";
import MyBookings from "./pages/user/MyBookings"; // New combined file
import ListingDetails from "./pages/listings/ListingDetails";
import Notifications from "./pages/user/Notifications";
import NotificationsPage from "./pages/user/NotificationsPage";
import Favorites from "./pages/user/Favorites";
import NotFound from "./pages/NotFound";
import ChatWindow from "./pages/chatbox/ChatWindow";
import Inbox from "./pages/chatbox/Inbox";

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
import Calendar from "./pages/host/Calendar";

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
              <Route path="/chat/:otherUserId" element={<ChatWindow />} />
              <Route path="/inbox" element={<Inbox />} />

              {/* Host Routes with Layout */}
              <Route path="/host-dashboard" element={<PrivateRoute><HostLayout /></PrivateRoute>}>
                <Route index element={<HostDashboard />} />
                <Route path="listings" element={<HostListings />} />
                <Route path="bookings" element={<HostBookings />} />
                <Route path="create-listing" element={<CreateListing />} />
                <Route path="edit-listing/:id" element={<EditListing />} />
                <Route path="calendar" element={<Calendar />} />
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
