import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";

export default function Logout() {
  useEffect(() => {
    // Temporary frontend logout cleanup.
    // Later this will also call your friend's logout/session API.
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }, []);

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="card w-full max-w-md p-8 sm:p-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.15 }}
          className="w-20 h-20 mx-auto rounded-full bg-severity-safeBg flex items-center justify-center mb-6"
        >
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-severity-safe" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                         transition={{ delay: 0.4, duration: 0.5 }} />
          </svg>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-clinical-ink">You've been logged out</h1>
        <p className="text-clinical-muted text-sm mt-3 leading-relaxed">
          Your session has been cleared. You can log in again whenever you're ready.
        </p>

        <Link to="/login" className="btn-primary w-full justify-center mt-7">
          <LogIn className="w-4 h-4" /> Login Again
        </Link>
        <Link to="/" className="block text-sm text-clinical-teal font-medium mt-4 hover:underline">
          Return to Home
        </Link>
      </motion.div>
    </div>
  );
}