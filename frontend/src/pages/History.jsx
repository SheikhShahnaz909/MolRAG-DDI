import { API_URL } from "../config";
import { authHeader } from "../lib/authHeader";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck, AlertTriangle, ShieldAlert, Lock, Eye,
  FlaskConical, Layers, Info, GitCompare, Image as ImageIcon,
} from "lucide-react";
import BackArrow from "../components/BackArrow";

const SEVERITY_CONFIG = {
  safe: { label: "Safe", icon: ShieldCheck, text: "text-severity-safe", bg: "bg-severity-safeBg" },
  moderate: { label: "Moderate", icon: AlertTriangle, text: "text-severity-moderate", bg: "bg-severity-moderateBg" },
  severe: { label: "Severe", icon: ShieldAlert, text: "text-severity-severe", bg: "bg-severity-severeBg" },
};

// Everything a logged-in user does is saved. Unknown kinds from a newer server still show up under "Other".
const KINDS = {
  prediction: { label: "Predictions", icon: FlaskConical },
  multi_check: { label: "Multi-drug checks", icon: Layers },
  drug_info: { label: "Drug information", icon: Info },
  compare: { label: "Comparisons", icon: GitCompare },
  image_scan: { label: "Photo scans", icon: ImageIcon },
};

const kindOf = (item) => (KINDS[item.kind] ? item.kind : "other");

// Older records come back without a timezone; treat those as UTC (that is what the server stored).
function toDate(ts) {
  if (!ts) return null;
  const text = String(ts);
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text);
  const d = new Date(hasZone ? text : `${text}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function Details({ item }) {
  if (item.kind === "prediction") {
    const record = item.record || {};
    const key = (record.severity || "").toLowerCase();
    const s = SEVERITY_CONFIG[key] || SEVERITY_CONFIG.moderate;
    const Icon = s.icon;
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
          <Icon className="w-3.5 h-3.5" /> {s.label}
        </span>
        {typeof record.confidence === "number" && (
          <span className="text-xs text-clinical-muted">{record.confidence.toFixed(1)}% confidence</span>
        )}
      </span>
    );
  }
  const data = item.data || {};
  if (item.kind === "multi_check") {
    return (
      <span className="text-xs text-clinical-muted break-words">
        {(data.drugs || []).join(", ")}
        {data.highest ? ` · Highest: ${data.highest}` : ""}
      </span>
    );
  }
  if (item.kind === "compare") {
    return <span className="text-xs text-clinical-muted break-words">{(data.drugs || []).join(", ")}</span>;
  }
  if (item.kind === "image_scan") {
    return <span className="text-xs text-clinical-muted break-words">Detected: {(data.matches || []).join(", ")}</span>;
  }
  return null;
}

export default function History() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!localStorage.getItem("authToken")) {
      setError("not-logged-in");
      setLoading(false);
      return;
    }

    async function load() {
      const response = await fetch(`${API_URL}/api/activity`, { headers: authHeader() });

      if (response.status === 404 || response.status === 405) {
        // Older server without /api/activity: predictions only.
        const old = await fetch(`${API_URL}/api/predict/history`, { headers: authHeader() });
        const data = await old.json();
        if (!old.ok) throw new Error(data.detail || "Unable to load history.");
        setItems(
          (data.history || []).map((record) => ({
            kind: "prediction",
            timestamp: record.timestamp,
            title: `${record.drug1} × ${record.drug2}`,
            record,
          }))
        );
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load history.");
      setItems(data.items || []);
    }

    load()
      .catch((err) => setError(err.message || "Unable to load history."))
      .finally(() => setLoading(false));
  }, []);

  const counts = { all: items?.length || 0 };
  items?.forEach((it) => { counts[kindOf(it)] = (counts[kindOf(it)] || 0) + 1; });
  const tabs = [{ id: "all", label: "All" }]
    .concat(Object.entries(KINDS).filter(([id]) => counts[id] > 0).map(([id, k]) => ({ id, label: k.label })))
    .concat(counts.other > 0 ? [{ id: "other", label: "Other" }] : []);
  const rows = items ? items.filter((it) => filter === "all" || kindOf(it) === filter) : [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
      <BackArrow />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-clinical-ink mb-2">
        Your History
      </h1>
      <p className="text-clinical-muted mb-8">
        Everything you do while logged in: predictions, multi-drug checks, drug lookups, comparisons and photo scans.
      </p>

      {loading && (
        <div className="card p-6 space-y-4" role="status" aria-label="Loading history">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-clinical-mist" />
              <div className="h-5 flex-1 rounded bg-clinical-mist" />
              <div className="h-5 w-28 rounded bg-clinical-mist" />
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
            to see your history. Nothing is saved when you are not logged in.
          </p>
        </div>
      )}

      {error && error !== "not-logged-in" && (
        <p className="text-sm text-severity-severe">{error}</p>
      )}

      {items && items.length === 0 && (
        <p className="text-sm text-clinical-muted">
          Nothing yet —{" "}
          <Link to="/prediction" className="text-clinical-teal font-medium hover:underline">run your first check</Link>.
        </p>
      )}

      {items && items.length > 0 && (
        <>
          <div className="inline-flex flex-wrap gap-1 p-1 mb-5 rounded-full bg-clinical-mist border border-clinical-border">
            {tabs.map(({ id, label }) => {
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
                  <span className="relative z-10">{label} ({counts[id] || 0})</span>
                </button>
              );
            })}
          </div>

          <ul className="space-y-3">
            {rows.map((item, i) => {
              const Icon = (KINDS[item.kind] || { icon: Info }).icon;
              const parsed = toDate(item.timestamp);
              const when = parsed ? parsed.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
              return (
                <motion.li
                  key={`${filter}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03 }}
                  className="card p-4 flex flex-wrap items-center gap-4 hover:shadow-lift transition-shadow"
                >
                  <span className="w-10 h-10 rounded-full bg-clinical-mist flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-clinical-teal" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-clinical-ink break-words mb-1">{item.title}</p>
                    <Details item={item} />
                  </div>
                  <span className="text-xs text-clinical-muted">{when}</span>
                  {item.kind === "prediction" && item.record && (
                    <button
                      type="button"
                      onClick={() => navigate("/results", { state: { result: item.record, drugs: [item.record.drug1, item.record.drug2] } })}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-clinical-teal hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}