import { useState, useRef, useEffect } from "react";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";

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
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === 0 || value === 1) return value === 1 ? "Yes" : "No";
  return String(value);
}

export default function DrugInformation() {
  const [drugs, setDrugs] = useState([""]);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = drugs[0]?.trim();
  // Tracks the most recent input value -- a response is only applied if it's
  // still the answer to the CURRENT input, discarding stale/out-of-order
  // responses from earlier keystrokes (e.g. "ketamin" resolving after
  // "ketamine" already did).
  const latestQueryRef = useRef("");
  const debounceRef = useRef(null);
  // Full catalog, not just predictable drugs -- this page only needs catalog
  // data, so it can validly suggest a wider set than Prediction does.
  const [catalogDrugs, setCatalogDrugs] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/drugs?page_size=5000")
      .then((res) => res.json())
      .then((data) => setCatalogDrugs((data.drugs || []).map((d) => d.drug_name)))
      .catch(() => {});
  }, []);

  async function handleLookup(name) {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/drugs/${encodeURIComponent(name)}`
      );
      const data = await response.json();

      if (latestQueryRef.current !== name) return; // a newer keystroke has since fired -- ignore this stale result

      if (!response.ok) {
        setInfo(null);
        throw new Error(data.detail || "Drug not found.");
      }

      setInfo(data);
    } catch (err) {
      if (latestQueryRef.current === name) {
        setError(err.message || "Unable to reach the server.");
      }
    } finally {
      if (latestQueryRef.current === name) {
        setLoading(false);
      }
    }
  }

  function handleDrugsChange(newDrugs) {
    setDrugs(newDrugs);
    const name = newDrugs[0]?.trim();

    latestQueryRef.current = name;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!name) {
      setInfo(null);
      setError("");
      setLoading(false);
      return;
    }

    // Wait for a short pause in typing before actually firing the request,
    // instead of hitting the API on every single keystroke.
    debounceRef.current = setTimeout(() => handleLookup(name), 400);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        Drug Information
      </h1>
      <p className="text-clinical-muted mb-8">
        Select or upload a medicine to view its information.
      </p>

      <div className="card p-8">
        <DrugInputSelector drugs={drugs} onChange={handleDrugsChange} multi={false} drugList={catalogDrugs} />
      </div>

      {loading && <p className="text-sm text-clinical-muted mt-6">Looking up {selected}...</p>}

      {error && <p className="text-sm text-severity-severe mt-6">{error}</p>}

      {info && (
        <div className="card p-6 mt-6">
          <h2 className="font-display font-semibold text-lg text-clinical-navy mb-4">
            {info.drug_name}
          </h2>
          <dl className="divide-y divide-clinical-border">
            {FIELDS.map(({ label, key }) => (
              <div key={key} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                <dt className="text-sm font-medium text-clinical-text">{label}</dt>
                <dd className="text-sm text-clinical-muted sm:text-right">
                  {formatValue(info[key])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}