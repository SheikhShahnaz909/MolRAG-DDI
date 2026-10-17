import { useState, useEffect } from "react";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";

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
  const filled = drugs.map((d) => d.trim()).filter(Boolean);
  // Full catalog, not just predictable drugs -- Compare only needs catalog
  // data, not a prediction, so it can validly suggest a wider set.
  const [catalogDrugs, setCatalogDrugs] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/drugs?page_size=5000")
      .then((res) => res.json())
      .then((data) => setCatalogDrugs((data.drugs || []).map((d) => d.drug_name)))
      .catch(() => {});
  }, []);

  async function handleCompare() {
    setError("");
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drug_names: filled }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to compare these drugs.");
      }

      setResults(data.drugs);
    } catch (err) {
      setError(
        err.message ||
        "Unable to reach the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        Compare Drugs
      </h1>
      <p className="text-clinical-muted mb-8">
        Add two or more medicines to compare their profiles side by side.
      </p>

      <div className="card p-8 mb-8">
        <DrugInputSelector drugs={drugs} onChange={setDrugs} multi minDrugs={2} maxDrugs={6} drugList={catalogDrugs} />

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

      {results && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-clinical-navy text-white text-left">
                <th className="px-4 py-3 font-medium">Field</th>
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
              {FIELDS.map(({ label, key }) => (
                <tr key={key} className="border-t border-clinical-border">
                  <td className="px-4 py-3 font-medium text-clinical-navy">{label}</td>
                  {results.map((d, i) => (
                    <td key={i} className="px-4 py-3 text-clinical-muted">
                      {d.found ? formatValue(d[key]) : "Not found"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}