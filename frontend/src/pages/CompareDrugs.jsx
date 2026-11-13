import { API_URL } from "../config";
import { authHeader } from "../lib/authHeader";
import { useState } from "react";
import { motion } from "framer-motion";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";
import { useCatalogDrugs } from "../hooks/useDrugNames";

// These match what's actually in the drug_catalog collection -- no invented fields.
const FIELDS = [
  { label: "Drug Class", key: "drug_class" },
  { label: "Molecular Weight", key: "molecular_weight" },
  { label: "LogP", key: "logp" },
  { label: "Approval Year", key: "approval_year" },
  { label: "Oral", key: "oral" },
  { label: "Parenteral (Injectable)", key: "parenteral" },
  { label: "Topical", key: "topical" },
  { label: "Black Box Warning", key: "has_black_box_warning" },
];

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === 0 || value === 1) return value === 1 ? "Yes" : "No"; // has_black_box_warning is 0/1
  return String(value);
}

export default function CompareDrugs() {
  const [drugs, setDrugs] = useState(["", ""]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const filled = drugs.map((d) => d.trim()).filter(Boolean);
  // Full catalog, not just predictable drugs -- Compare only needs catalog
  // data, not a prediction, so it can validly suggest a wider set.
  const catalogDrugs = useCatalogDrugs();

  async function handleCompare() {
    setError("");
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch(`${API_URL}/api/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ drug_names: filled }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to compare these drugs.");
      }

      setResults(data.drugs);
    } catch (err) {
      setError(err.message || "Unable to reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  // A row "differs" when the drugs that were found don't all share the same value.
  const found = results ? results.filter((d) => d.found) : [];
  const rows = FIELDS.map((f) => ({
    ...f,
    differs: found.length > 1 && new Set(found.map((d) => formatValue(d[f.key]))).size > 1,
  }));
  const visible = onlyDiff ? rows.filter((r) => r.differs) : rows;
  const diffCount = rows.filter((r) => r.differs).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-clinical-ink mb-2">
        Compare Drugs
      </h1>
      <p className="text-clinical-muted mb-8">
        Add two or more medicines to compare their profiles side by side.
      </p>

      <div className="card p-8 mb-8 max-w-3xl">
        <DrugInputSelector drugs={drugs} onChange={setDrugs} multi minDrugs={2} maxDrugs={8} drugList={catalogDrugs} />

        <button
          type="button"
          onClick={handleCompare}
          disabled={filled.length < 2 || loading}
          className="btn-primary w-full justify-center mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>

        {error && <p className="text-sm text-severity-severe mt-4">{error}</p>}
      </div>

      {loading && (
        <div className="card p-6" role="status" aria-label="Comparing drugs">
          <div className="animate-pulse space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex gap-6">
                <div className="h-4 w-40 rounded bg-clinical-mist" />
                <div className="h-4 flex-1 rounded bg-clinical-mist" />
                <div className="h-4 flex-1 rounded bg-clinical-mist" />
              </div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Difference toggle */}
          {found.length > 1 && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                type="button"
                role="switch"
                aria-checked={onlyDiff}
                onClick={() => setOnlyDiff((v) => !v)}
                className="flex items-center gap-3 text-sm font-medium text-clinical-text"
              >
                <span
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${onlyDiff ? "bg-clinical-teal" : "bg-clinical-border"}`}
                >
                  <motion.span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ x: onlyDiff ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                </span>
                Show only differences
              </button>
              <span className="text-xs text-clinical-muted">
                {diffCount} of {FIELDS.length} fields differ
              </span>
            </div>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-clinical-navy text-white text-left">
                  <th className="px-4 py-3 font-medium sticky left-0 bg-clinical-navy z-10">Field</th>
                  {results.map((d, i) => (
                    <th key={i} className="px-4 py-3 font-medium font-mono">
                      {d.drug_name}
                      {!d.found && d.suggestion && (
                        <span className="block text-xs font-normal text-slate-300 mt-1">
                          Did you mean {d.suggestion}?
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={results.length + 1} className="px-4 py-8 text-center text-clinical-muted">
                      These drugs have the same values for every field.
                    </td>
                  </tr>
                )}
                {visible.map(({ label, key, differs }, ri) => (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: ri * 0.03 }}
                    className={`border-t border-clinical-border ${differs ? "bg-clinical-teal/[0.06]" : ""}`}
                  >
                    <td className={`px-4 py-3 font-medium text-clinical-ink sticky left-0 z-10 ${differs ? "bg-clinical-mist" : "bg-surface"}`}>
                      {label}
                      {differs && (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-clinical-teal/10 text-clinical-teal text-[11px] font-medium">
                          differs
                        </span>
                      )}
                    </td>
                    {results.map((d, i) => (
                      <td key={i} className="px-4 py-3 text-clinical-muted">
                        {d.found ? formatValue(d[key]) : "Not found"}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      <Disclaimer />
    </div>
  );
}