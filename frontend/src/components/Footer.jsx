import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="px-3 sm:px-6 pb-4 mt-8 print:hidden">
      <div className="max-w-[1400px] mx-auto rounded-3xl border border-clinical-border bg-white/60 backdrop-blur
                      px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-sm text-clinical-muted">
        <span>© 2026 MolRAG-DDI. All rights reserved.</span>
        <nav className="flex gap-5">
          <Link to="/how-it-works" className="hover:text-clinical-teal transition-colors">How it works</Link>
          <Link to="/about" className="hover:text-clinical-teal transition-colors">About</Link>
        </nav>
      </div>
    </footer>
  );
}