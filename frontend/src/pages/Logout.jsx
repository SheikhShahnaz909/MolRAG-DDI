import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, LogIn } from "lucide-react";

export default function Logout() {
  useEffect(() => {
    // Temporary frontend logout cleanup.
    // Later this will also call your friend's logout/session API.
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">

      <div className="card w-full max-w-md p-8 sm:p-10 text-center">

        <div className="w-16 h-16 mx-auto rounded-full bg-severity-safeBg flex items-center justify-center mb-5">
          <CheckCircle className="w-8 h-8 text-severity-safe" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-clinical-navy">
          You've been logged out
        </h1>

        <p className="text-clinical-muted text-sm mt-3 leading-relaxed">
          Your session has been cleared. You can log in again whenever you're
          ready.
        </p>

        <Link
          to="/login"
          className="btn-primary w-full justify-center mt-7"
        >
          <LogIn className="w-4 h-4" />
          Login Again
        </Link>

        <Link
          to="/"
          className="block text-sm text-clinical-teal font-medium mt-4 hover:underline"
        >
          Return to Home
        </Link>

      </div>

    </div>
  );
}