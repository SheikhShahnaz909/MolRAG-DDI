import { API_URL } from "../config";
import { authHeader } from "../lib/authHeader";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";
import SideEffectBlock from "../components/SideEffectsPanel";
import DrugLabelInfo from "../components/DrugLabelInfo";
import { useCatalogDrugs } from "../hooks/useDrugNames";

const MAX_DRUGS = 6;

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

// Yes/No values become small labelled chips (the text is always shown, never colour alone).
function ValueChip({ text, warn }) {
  const cls =
    text === "Yes"
      ? warn ? "bg-severity-severeBg text-severity-severe" : "bg-clinical-teal/10 text-clinical-teal"
      : warn ? "bg-severity-safeBg text-severity-safe" : "bg-clinical-cloud text-clinical-muted";
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${cls}`}>{text}</span>;
}

const keyOf = (name) => name.trim().toLowerCase();

// One drug's information card: catalog details, FDA label information and side effects.
// The label and side effects load a moment later because they come from an outside source.
// If the drug is not in the local catalog, the FDA label alone can still fill the card.
function DrugCard({ name, entry, onCheckExternal }) {
  const status = entry?.status || "loading"; // no entry yet = request about to start
  const info = entry?.info;
  const labelPending = entry?.labelState === "loading";
  const label = entry?.labelState === "done" ? entry.label : null;
  const fx = entry?.fxState === "done" ? entry.fx : null;
  const fxHasData = Boolean(fx && (fx.effects?.length > 0 || fx.label?.excerpt));
  const pending = labelPending || entry?.fxState === "loading";
  const externalOnly = status === "error" && Boolean(label || fxHasData);

  const skeleton = (aria) => (
    <div className="p-6" role="status" aria-label={aria}>
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-1/3 rounded bg-clinical-mist" />
        {FIELDS.map((f) => (
          <div key={f.key} className="flex justify-between gap-6">
            <div className="h-4 w-32 rounded bg-clinical-mist" />
            <div className="h-4 w-24 rounded bg-clinical-mist" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="card overflow-hidden"
    >
      {status === "loading" && skeleton(`Looking up ${name}`)}

      {status === "error" && !externalOnly && pending && skeleton(`Checking the FDA label for ${name}`)}

      {status === "error" && !externalOnly && !pending && (
        <div className="p-6">
          <p className="font-mono text-sm text-clinical-ink mb-1 break-words">{name}</p>
          <p className="text-sm text-severity-severe">{entry.error}</p>
          {entry.labelState === "idle" ? (
            <button
              type="button"
              onClick={() => onCheckExternal(name)}
              className="mt-3 text-sm font-medium text-clinical-teal hover:underline"
            >
              Not in our catalog? Look it up in FDA labels
            </button>
          ) : (
            <p className="text-xs text-clinical-muted mt-2">No FDA label information was found for it either.</p>
          )}
        </div>
      )}

      {(status === "done" || externalOnly) && (
        <>
          <div className="px-6 py-5 bg-gradient-to-r from-clinical-navy to-clinical-teal">
            <p className="text-xs text-slate-200 mb-0.5">{externalOnly ? "Not in the local catalog" : "Drug"}</p>
            <h2 className="font-display font-semibold text-2xl text-white break-words">
              {info ? info.drug_name : name}
            </h2>
          </div>

          {info && (
            <dl className="divide-y divide-clinical-border px-6">
              {FIELDS.map(({ label: fieldLabel, key }) => {
                const text = formatValue(info[key]);
                const isFlag = text === "Yes" || text === "No";
                return (
                  <div key={key} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <dt className="text-sm font-medium text-clinical-text">{fieldLabel}</dt>
                    <dd className="text-sm text-clinical-muted sm:text-right">
                      {isFlag ? <ValueChip text={text} warn={key === "has_black_box_warning"} /> : text}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          <div className="px-6 py-5 border-t border-clinical-border">
            <h3 className="font-semibold text-lg text-clinical-ink mb-1">From the FDA label</h3>
            <p className="text-xs text-clinical-muted mb-3">
              Short word-for-word excerpts. US labels, so some drugs sold elsewhere will not appear.
            </p>
            {labelPending && (
              <div className="animate-pulse space-y-3" role="status" aria-label="Loading FDA label information">
                <div className="h-4 w-2/3 rounded bg-clinical-mist" />
                <div className="h-4 w-1/2 rounded bg-clinical-mist" />
              </div>
            )}
            {entry.labelState === "error" && (
              <p className="text-sm text-clinical-muted">FDA label information could not be loaded right now.</p>
            )}
            {entry.labelState === "done" && label && <DrugLabelInfo info={label} />}
            {entry.labelState === "done" && !label && (
              <p className="text-sm text-clinical-muted">No FDA label was found for this drug.</p>
            )}
          </div>

          <div className="px-6 py-5 border-t border-clinical-border">
            <h3 className="font-semibold text-lg text-clinical-ink mb-1">Side Effects</h3>
            <p className="text-xs text-clinical-muted mb-3">
              General side effects reported for this drug. Check the source before relying on them.
            </p>
            {entry.fxState === "loading" && (
              <div className="animate-pulse space-y-3" role="status" aria-label="Loading side effects">
                <div className="h-4 w-2/3 rounded bg-clinical-mist" />
                <div className="h-4 w-1/2 rounded bg-clinical-mist" />
              </div>
            )}
            {entry.fxState === "error" && (
              <p className="text-sm text-clinical-muted">Side-effect information could not be loaded right now.</p>
            )}
            {entry.fxState === "done" && fx && <SideEffectBlock record={fx} showName={false} />}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function DrugInformation() {
  const [drugs, setDrugs] = useState([""]);
  // Everything we have looked up, keyed by the lower-cased name that was typed.
  // Because results are stored per name and only the names currently typed are shown,
  // a late answer for "ketamin" can never overwrite the answer for "ketamine".
  const [results, setResults] = useState({});
  const requestedRef = useRef(new Set());
  const debounceRef = useRef(null);
  // Full catalog, not just predictable drugs -- this page only needs catalog
  // data, so it can validly suggest a wider set than Prediction does.
  const catalogDrugs = useCatalogDrugs();

  function patch(key, data) {
    setResults((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...data } }));
  }

  async function loadSideEffects(key, drugName) {
    patch(key, { fxState: "loading" });
    try {
      const response = await fetch(
        `${API_URL}/api/drugs/${encodeURIComponent(drugName)}/side-effects?external=always`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load side effects.");
      patch(key, { fx: data, fxState: "done" });
    } catch {
      patch(key, { fxState: "error" });
    }
  }

  async function loadLabel(key, drugName) {
    patch(key, { labelState: "loading" });
    try {
      const response = await fetch(`${API_URL}/api/drugs/${encodeURIComponent(drugName)}/label`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load label information.");
      patch(key, { label: data.info, labelState: "done" });
    } catch {
      patch(key, { labelState: "error" });
    }
  }

  async function lookup(name) {
    const key = keyOf(name);
    patch(key, { status: "loading", error: "", fxState: "idle", labelState: "idle" });
    try {
      // The login token (if any) lets the server save this lookup to the user's history.
      const response = await fetch(`${API_URL}/api/drugs/${encodeURIComponent(name)}`, { headers: authHeader() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Drug not found.");
      patch(key, { status: "done", info: data });
      loadLabel(key, data.drug_name);
      loadSideEffects(key, data.drug_name);
    } catch (err) {
      requestedRef.current.delete(key); // allow a retry if the same name is typed again later
      patch(key, { status: "error", error: err.message || "Unable to reach the server." });
    }
  }

  // Only on request: typing passes through many half-written names, and each outside lookup counts
  // against the FDA service's daily limit.
  function checkExternal(name) {
    const key = keyOf(name);
    loadLabel(key, name);
    loadSideEffects(key, name);
  }

  function handleDrugsChange(newDrugs) {
    setDrugs(newDrugs);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Wait for a short pause in typing before asking the server, instead of on every keystroke.
    debounceRef.current = setTimeout(() => {
      newDrugs
        .map((n) => n.trim())
        .filter(Boolean)
        .forEach((name) => {
          const key = keyOf(name);
          if (requestedRef.current.has(key)) return;
          requestedRef.current.add(key);
          lookup(name);
        });
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Names currently typed, without repeats.
  const names = [];
  drugs.forEach((n) => {
    const name = n.trim();
    if (name && !names.some((x) => keyOf(x) === keyOf(name))) names.push(name);
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-clinical-ink mb-2">
        Drug Information
      </h1>
      <p className="text-clinical-muted mb-8">
        Select or upload a medicine to view its information. You can add up to {MAX_DRUGS} drugs to see them side by side.
      </p>

      <div className="card p-8 max-w-3xl">
        <DrugInputSelector
          drugs={drugs}
          onChange={handleDrugsChange}
          multi
          minDrugs={1}
          maxDrugs={MAX_DRUGS}
          drugList={catalogDrugs}
        />
      </div>

      {names.length > 0 && (
        <div className={`grid gap-6 mt-6 ${names.length > 1 ? "md:grid-cols-2" : "max-w-3xl"}`}>
          {names.map((name) => (
            <DrugCard key={keyOf(name)} name={name} entry={results[keyOf(name)]} onCheckExternal={checkExternal} />
          ))}
        </div>
      )}

      <div className="max-w-3xl">
        <Disclaimer />
      </div>
    </div>
  );
}