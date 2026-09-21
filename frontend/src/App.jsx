import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";

import Home from "./pages/Home.jsx";
import Prediction from "./pages/Prediction.jsx";
import Results from "./pages/Results.jsx";
import HistoryPage from "./pages/History.jsx";
import About from "./pages/About.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import OTPVerification from "./pages/OTPVerification.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import DrugInformation from "./pages/DrugInformation.jsx";
import CompareDrugs from "./pages/CompareDrugs.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";

// We'll create these two pages next.
import Profile from "./pages/Profile.jsx";
import Logout from "./pages/Logout.jsx";

// Navbar is hidden on authentication pages.
const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
];

export default function App() {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">

      {!isAuthPage && <Navbar />}

      <main className="flex-1">
        <Routes>

          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Main features */}
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/drug-info" element={<DrugInformation />} />
          <Route path="/compare" element={<CompareDrugs />} />

          {/* Results */}
          <Route path="/results" element={<Results />} />

          {/* Secondary pages */}
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          {/* Account */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/logout" element={<Logout />} />

        </Routes>
      </main>

      <Footer />

    </div>
  );
}