import { API_URL } from "../config";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, ShieldAlert, Lock } from "lucide-react";
import BackArrow from "../components/BackArrow";

const SEVERITY_CONFIG = {
  safe: { label: "Safe", icon: ShieldCheck, text: "text-severity-safe", bg: "bg-severity-safeBg" },
  moderate: { label: "Moderate", icon: AlertTriangle, text: "text-severity-moderate", bg: "bg-severity-moderateBg" },
  severe: { label: "Severe", icon: ShieldAlert, text: "text-severity-severe", bg: "bg-severity-severeBg" },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "safe", label: "Safe" },
  { id: "moderate", label: "Moderate" },
  { id: "severe", label: "Severe" },
];

// Unknown severities are shown as Moderate (same as before).
const keyOf = (row) => {
  const k = (row.severity || "").toLowerCase();
  return SEVERITY_CONFIG[k] ? k : "moderate";
};

export default function History() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setError("not-logged-in");
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/predict/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to load history.");
        }
        setHistory(data.history || []);
      })
      .catch((err) => setError(err.message || "Unable to load history."))
      .finally(() => setLoading(false));
  }, []);

  const counts = { all: history?.length || 0, safe: 0, moderate: 0, severe: 0 };
  history?.forEach((r) => { counts[keyOf(r)] += 1; });
  const rows = history ? history.filter((r) => filter === "all" || keyOf(r) === filter) : [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <BackArrow />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-clinical-navy mb-2">
        Prediction History
      </h1>
      <p className="text-clinical-muted mb-8">Past drug pair checks and their results.</p>

      {loading && (
        <div className="card p-6 space-y-4" role="status" aria-label="Loading history">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-6">
              <div className="h-5 flex-1 rounded bg-clinical-mist" />
              <div className="h-7 w-24 rounded-full bg-clinical-mist" />
              <div className="h-5 w-24 rounded bg-clinical-mist" />
            </div>
          ))}
        </div>
      )}

      {error === "not-logged-in" && (
        <div className="card p-6 text-sm text-clinical-text flex items-center gap-3">
          <Lock className="w-5 h-5 text-clinical-teal shrink-0" />
          <p>
            Please{" "}
            <Link to="/login" className="text-clinical-teal font-medium hover:underline">log in</Link>{" "}
            to view your prediction history.
          </p>
        </div>
      )}

      {error && error !== "not-logged-in" && (
        <p className="text-sm text-severity-severe">{error}</p>
      )}

      {history && history.length === 0 && (
        <p className="text-sm text-clinical-muted">
          No predictions yet —{" "}
          <Link to="/prediction" className="text-clinical-teal font-medium hover:underline">run your first check</Link>.
        </p>
      )}

      {history && history.length > 0 && (
        <>
          {/* Severity filter */}
          <div className="inline-flex flex-wrap gap-1 p-1 mb-5 rounded-full bg-clinical-mist border border-clinical-border">
            {FILTERS.map(({ id, label }) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  aria-pressed={active}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors
                              focus:outline-none focus-visible:ring-2 focus-visible:ring-clinical-teal
                              ${active ? "text-white" : "text-clinical-text hover:text-clinical-teal"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="history-filter"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-clinical-navy to-clinical-teal"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                  <span className="relative z-10">{label} ({counts[id]})</span>
                </button>
              );
            })}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-clinical-navy text-white text-left">
                  <th className="px-5 py-3 font-medium">Drug Pair</th>
                  <th className="px-5 py-3 font-medium">Severity</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-clinical-muted">
                      No {filter} results yet.
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => {
                  const s = SEVERITY_CONFIG[keyOf(row)];
                  const Icon = s.icon;
                  const date = row.timestamp ? new Date(row.timestamp).toLocaleDateString() : "—";
                  return (
                    <motion.tr
                      key={`${filter}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03 }}
                      className="border-t border-clinical-border hover:bg-clinical-cloud/70 transition-colors"
                    >
                      <td className="px-5 py-4 font-mono">{row.drug1} × {row.drug2}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                          <Icon className="w-3.5 h-3.5" /> {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-clinical-muted">{date}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}