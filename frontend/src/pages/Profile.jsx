import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, CalendarDays, LogOut, ArrowRight, UserCircle } from "lucide-react";
import BackArrow from "../components/BackArrow";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

function readUser() {
  try {
    const saved = localStorage.getItem("user");
    if (saved) return JSON.parse(saved);
  } catch {
    /* fall through to the default */
  }
  return { name: "User", email: "user@example.com" };
}

export default function Profile() {
  const user = readUser();
  const initials =
    (user.name || "U").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "U";

  const rows = [
    { icon: UserCircle, label: "Full Name", value: user.name },
    { icon: Mail, label: "Email Address", value: user.email },
    { icon: CalendarDays, label: "Account", value: "Member" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 sm:py-12">
      <BackArrow />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Hero */}
        <motion.div
          variants={item}
          className="relative overflow-hidden rounded-[2rem] px-6 py-9 sm:px-10 text-white shadow-lift
                     bg-gradient-to-br from-clinical-navy via-clinical-navyLight to-clinical-teal
                     flex flex-col sm:flex-row items-center gap-6"
        >
          <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 15, delay: 0.2 }}
            className="relative w-24 h-24 rounded-full bg-white/15 border border-white/30 backdrop-blur
                       flex items-center justify-center font-display font-semibold text-3xl shrink-0"
          >
            {initials}
          </motion.div>
          <div className="relative text-center sm:text-left min-w-0">
            <p className="text-sm text-slate-200">My Profile</p>
            <h1 className="text-3xl sm:text-4xl font-semibold break-words">{user.name}</h1>
            <p className="text-slate-200 mt-1 break-all">{user.email}</p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Account information */}
          <motion.div variants={item} className="card p-6 sm:p-8">
            <h2 className="font-semibold text-xl text-clinical-navy mb-5">Account Information</h2>
            <div className="space-y-3">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4 p-4 rounded-xl bg-clinical-cloud">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-clinical-teal" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-clinical-muted">{label}</p>
                    <p className="text-sm font-medium text-clinical-text mt-0.5 break-all">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div variants={item} className="space-y-4">
            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Link
                to="/history"
                className="group card flex items-center justify-between gap-4 p-6 hover:shadow-lift hover:border-clinical-teal transition-all"
              >
                <div>
                  <p className="font-semibold text-lg text-clinical-navy">View My History</p>
                  <p className="text-sm text-clinical-muted mt-1">
                    View your interaction checks, drug searches, and comparisons.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-clinical-teal shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            <Link
              to="/logout"
              className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-full border border-clinical-border
                         bg-white/60 text-clinical-text font-medium transition-colors
                         hover:border-severity-severe hover:text-severity-severe hover:bg-severity-severeBg"
            >
              <LogOut className="w-4 h-4" /> Logout
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}