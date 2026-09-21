import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Atom,
  UserCircle,
  Menu,
  X,
  History,
  HelpCircle,
  LogIn,
  UserPlus,
  LogOut,
  User,
} from "lucide-react";

const featureLinks = [
  { to: "/prediction", label: "Check Interactions" },
  { to: "/drug-info", label: "Drug Information" },
  { to: "/compare", label: "Compare Drugs" },
];

export default function Navbar() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Check whether the user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem("authToken"));
  });

  // Update navbar when login/logout happens
  useEffect(() => {
    function checkAuth() {
      setIsLoggedIn(Boolean(localStorage.getItem("authToken")));
    }

    window.addEventListener("authChanged", checkAuth);

    return () => {
      window.removeEventListener("authChanged", checkAuth);
    };
  }, []);

  function closeMenus() {
    setMenuOpen(false);
    setProfileOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    setIsLoggedIn(false);

    window.dispatchEvent(new Event("authChanged"));

    closeMenus();

    navigate("/logout");
  }

  return (
    <header className="sticky top-0 z-50 bg-clinical-navy border-b border-white/10">

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        <div className="h-16 flex items-center justify-between">

          {/* LOGO */}
          <Link
            to="/"
            onClick={closeMenus}
            className="flex items-center gap-2.5 text-white shrink-0"
          >
            <div className="w-9 h-9 rounded-lg bg-clinical-teal flex items-center justify-center">
              <Atom className="w-5 h-5" />
            </div>

            <span className="font-display font-semibold text-lg">
              MolRAG-DDI
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden lg:flex items-center gap-1 ml-8">

            {featureLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-clinical-teal text-white"
                      : "text-slate-300 hover:text-white hover:bg-clinical-navyLight"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2 ml-auto">

            {/* PROFILE */}
            <div className="relative">

              <button
                type="button"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setMenuOpen(false);
                }}
                aria-label="Profile"
                aria-expanded={profileOpen}
                className="w-10 h-10 rounded-lg flex items-center justify-center
                           text-slate-300 hover:text-white hover:bg-clinical-navyLight
                           transition-colors"
              >
                <UserCircle className="w-6 h-6" />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-12 w-52 bg-white rounded-xl
                             border border-clinical-border shadow-lg overflow-hidden"
                >

                  {isLoggedIn ? (
                    <>
                      {/* LOGGED IN */}
                      <Link
                        to="/profile"
                        onClick={closeMenus}
                        className="flex items-center gap-3 px-4 py-3 text-sm
                                   text-clinical-text hover:bg-clinical-bg"
                      >
                        <User className="w-4 h-4 text-clinical-teal" />
                        My Profile
                      </Link>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3
                                   text-sm text-clinical-text hover:bg-clinical-bg"
                      >
                        <LogOut className="w-4 h-4 text-severity-severe" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      {/* LOGGED OUT */}
                      <Link
                        to="/login"
                        onClick={closeMenus}
                        className="flex items-center gap-3 px-4 py-3 text-sm
                                   text-clinical-text hover:bg-clinical-bg"
                      >
                        <LogIn className="w-4 h-4 text-clinical-teal" />
                        Login
                      </Link>

                      <Link
                        to="/register"
                        onClick={closeMenus}
                        className="flex items-center gap-3 px-4 py-3 text-sm
                                   text-clinical-text hover:bg-clinical-bg"
                      >
                        <UserPlus className="w-4 h-4 text-clinical-teal" />
                        Register
                      </Link>
                    </>
                  )}

                </div>
              )}

            </div>

            {/* MENU BUTTON */}
            <div className="relative">

              <button
                type="button"
                onClick={() => {
                  setMenuOpen((open) => !open);
                  setProfileOpen(false);
                }}
                aria-label="Open navigation"
                aria-expanded={menuOpen}
                className="w-10 h-10 rounded-lg flex items-center justify-center
                           text-slate-300 hover:text-white hover:bg-clinical-navyLight
                           transition-colors"
              >
                {menuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-12 w-60 bg-white rounded-xl
                             border border-clinical-border shadow-lg overflow-hidden"
                >

                  <div className="p-2">

                    <Link
                      to="/how-it-works"
                      onClick={closeMenus}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg
                                 text-sm text-clinical-text hover:bg-clinical-bg"
                    >
                      <HelpCircle className="w-5 h-5 text-clinical-teal" />
                      How It Works
                    </Link>

                    <Link
                      to="/history"
                      onClick={closeMenus}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg
                                 text-sm text-clinical-text hover:bg-clinical-bg"
                    >
                      <History className="w-5 h-5 text-clinical-teal" />
                      History
                    </Link>

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* MOBILE FEATURE NAV */}
      <div className="lg:hidden border-t border-white/10">

        <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto">

          {featureLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive
                    ? "bg-clinical-teal text-white"
                    : "text-slate-300 hover:bg-clinical-navyLight"
                }`
              }
            >
              {label}
            </NavLink>
          ))}

        </div>

      </div>

    </header>
  );
}