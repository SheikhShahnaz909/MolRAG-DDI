import { Link } from "react-router-dom";
import {
  UserCircle,
  Mail,
  CalendarDays,
  LogOut,
  ArrowRight,
} from "lucide-react";
import BackArrow from "../components/BackArrow";

export default function Profile() {
  const savedUser = localStorage.getItem("user");

  const user = savedUser
    ? JSON.parse(savedUser)
    : {
        name: "User",
        email: "user@example.com",
      };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 sm:py-12">

      <BackArrow to="/" label="Home" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-clinical-navy">
          My Profile
        </h1>

        <p className="text-clinical-muted mt-2">
          Manage your account information.
        </p>
      </div>

      {/* Profile card */}
      <div className="card overflow-hidden">

        {/* Profile header */}
        <div className="bg-clinical-navy px-6 py-8 sm:px-8 flex flex-col sm:flex-row items-center sm:items-start gap-5">

          <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <UserCircle className="w-12 h-12 text-white" />
          </div>

          <div className="text-center sm:text-left">
            <h2 className="font-display text-2xl font-semibold text-white">
              {user.name}
            </h2>

            <p className="text-slate-300 mt-1">
              {user.email}
            </p>
          </div>

        </div>

        {/* Account information */}
        <div className="p-6 sm:p-8">

          <h3 className="font-display font-semibold text-lg text-clinical-navy mb-5">
            Account Information
          </h3>

          <div className="space-y-4">

            <div className="flex items-center gap-4 p-4 rounded-lg bg-clinical-bg">
              <UserCircle className="w-5 h-5 text-clinical-teal shrink-0" />

              <div>
                <p className="text-xs text-clinical-muted">
                  Full Name
                </p>
                <p className="text-sm font-medium text-clinical-text mt-1">
                  {user.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-clinical-bg">
              <Mail className="w-5 h-5 text-clinical-teal shrink-0" />

              <div>
                <p className="text-xs text-clinical-muted">
                  Email Address
                </p>
                <p className="text-sm font-medium text-clinical-text mt-1">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-clinical-bg">
              <CalendarDays className="w-5 h-5 text-clinical-teal shrink-0" />

              <div>
                <p className="text-xs text-clinical-muted">
                  Account
                </p>
                <p className="text-sm font-medium text-clinical-text mt-1">
                  Member
                </p>
              </div>
            </div>

          </div>

          {/* History */}
          <Link
            to="/history"
            className="mt-6 flex items-center justify-between p-4 rounded-lg border border-clinical-border hover:border-clinical-teal hover:bg-clinical-bg transition-colors"
          >
            <div>
              <p className="font-medium text-clinical-navy">
                View My History
              </p>

              <p className="text-xs text-clinical-muted mt-1">
                View your interaction checks, drug searches, and comparisons.
              </p>
            </div>

            <ArrowRight className="w-5 h-5 text-clinical-teal shrink-0" />
          </Link>

          {/* Logout */}
          <Link
            to="/logout"
            className="mt-4 flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg border border-clinical-border text-clinical-text font-medium hover:border-severity-severe hover:text-severity-severe transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Link>

        </div>

      </div>

    </div>
  );
}