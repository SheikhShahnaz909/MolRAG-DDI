import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserCircle, Menu, X, History, HelpCircle, Info,
  LogIn, UserPlus, LogOut, User,
} from "lucide-react";

const featureLinks = [
  { to: "/prediction", label: "Check Interactions" },
  { to: "/drug-info", label: "Drug Information" },
  { to: "/compare", label: "Compare Drugs" },
];

const panelMotion = {
  initial: { opacity: 0, y: -8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.97 },
  transition: { duration: 0.16, ease: "easeOut" },
};

// Link whose active state is a pill that slides between items.
function PillLink({ to, label, layoutId, small }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative whitespace-nowrap rounded-full font-medium transition-colors
         ${small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
         ${isActive ? "text-white" : "text-clinical-text hover:text-clinical-teal"}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-clinical-navy to-clinical-teal"
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </>
      )}
    </NavLink>
  );
}

const iconBtn =
  "w-10 h-10 rounded-full flex items-center justify-center text-clinical-navy " +
  "hover:bg-clinical-mist transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-clinical-teal";

const itemCls =
  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-clinical-text hover:bg-clinical-cloud transition-colors";

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem("authToken")));

  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(Boolean(localStorage.getItem("authToken")));
    window.addEventListener("authChanged", checkAuth);
    return () => window.removeEventListener("authChanged", checkAuth);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    <header className="sticky top-0 z-50 px-3 sm:px-6 pt-3 print:hidden">
      {/* click-away layer for the dropdowns */}
      {(menuOpen || profileOpen) && (
        <div className="fixed inset-0 z-40" onClick={closeMenus} aria-hidden="true" />
      )}

      <div
        className={`relative z-50 max-w-[1400px] mx-auto rounded-[1.75rem] border border-white/80 ring-1 ring-clinical-border/60
                    backdrop-blur-xl transition-all duration-300
                    ${scrolled ? "bg-white/85 shadow-lift" : "bg-white/60 shadow-glass"}`}
      >
        <div className="h-14 px-3 sm:px-4 flex items-center justify-between">
          {/* LOGO */}
          <Link to="/" onClick={closeMenus} className="flex items-center gap-2.5 shrink-0">
            <motion.img
              src="/logo.png"
              alt=""
              whileHover={{ scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="w-10 h-10 object-contain"
            />
            <span className="font-display font-semibold text-lg text-clinical-navy">MolRAG-DDI</span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden lg:flex items-center gap-1">
            {featureLinks.map((l) => (
              <PillLink key={l.to} {...l} layoutId="nav-pill-desktop" />
            ))}
          </nav>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => { setProfileOpen((o) => !o); setMenuOpen(false); }}
                aria-label="Profile"
                aria-expanded={profileOpen}
                className={iconBtn}
              >
                <UserCircle className="w-6 h-6" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    {...panelMotion}
                    className="absolute right-0 top-12 w-52 p-2 bg-white rounded-2xl border border-clinical-border shadow-lift origin-top-right"
                  >
                    {isLoggedIn ? (
                      <>
                        <Link to="/profile" onClick={closeMenus} className={itemCls}>
                          <User className="w-4 h-4 text-clinical-teal" /> My Profile
                        </Link>
                        <button type="button" onClick={handleLogout} className={itemCls}>
                          <LogOut className="w-4 h-4 text-severity-severe" /> Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/login" onClick={closeMenus} className={itemCls}>
                          <LogIn className="w-4 h-4 text-clinical-teal" /> Login
                        </Link>
                        <Link to="/register" onClick={closeMenus} className={itemCls}>
                          <UserPlus className="w-4 h-4 text-clinical-teal" /> Register
                        </Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setMenuOpen((o) => !o); setProfileOpen(false); }}
                aria-label="Open navigation"
                aria-expanded={menuOpen}
                className={iconBtn}
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    {...panelMotion}
                    className="absolute right-0 top-12 w-60 p-2 bg-white rounded-2xl border border-clinical-border shadow-lift origin-top-right"
                  >
                    <Link to="/how-it-works" onClick={closeMenus} className={itemCls}>
                      <HelpCircle className="w-5 h-5 text-clinical-teal" /> How It Works
                    </Link>
                    <Link to="/history" onClick={closeMenus} className={itemCls}>
                      <History className="w-5 h-5 text-clinical-teal" /> History
                    </Link>
                    <Link to="/about" onClick={closeMenus} className={itemCls}>
                      <Info className="w-5 h-5 text-clinical-teal" /> About
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* MOBILE FEATURE NAV */}
        <div className="lg:hidden border-t border-clinical-border/70 px-3 py-2 flex gap-1 overflow-x-auto">
          {featureLinks.map((l) => (
            <PillLink key={l.to} {...l} layoutId="nav-pill-mobile" small />
          ))}
        </div>
      </div>
    </header>
  );
}