import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
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
import Profile from "./pages/Profile.jsx";
import Logout from "./pages/Logout.jsx";

const TITLES = {
  "/prediction": "Check Interactions",
  "/results": "Prediction Result",
  "/drug-info": "Drug Information",
  "/compare": "Compare Drugs",
  "/history": "Prediction History",
  "/how-it-works": "How It Works",
  "/about": "About",
  "/login": "Log In",
  "/register": "Create Account",
  "/verify-otp": "Verify Email",
  "/forgot-password": "Reset Password",
  "/profile": "My Profile",
  "/logout": "Logged Out",
};

// Navbar is hidden on authentication pages (verify-otp added: it has its own back button).
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/verify-otp"];

export default function App() {
  const location = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  useEffect(() => {
    const page = TITLES[location.pathname];
    document.title = page ? `${page} | MolRAG-DDI` : "MolRAG-DDI";
  }, [location.pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col">
        {!isAuthPage && <Navbar />}

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            className="flex-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />

              <Route path="/prediction" element={<Prediction />} />
              <Route path="/drug-info" element={<DrugInformation />} />
              <Route path="/compare" element={<CompareDrugs />} />
              <Route path="/results" element={<Results />} />

              <Route path="/history" element={<HistoryPage />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<OTPVerification />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route path="/profile" element={<Profile />} />
              <Route path="/logout" element={<Logout />} />
            </Routes>
          </motion.main>
        </AnimatePresence>

        <Footer />
      </div>
    </MotionConfig>
  );
}