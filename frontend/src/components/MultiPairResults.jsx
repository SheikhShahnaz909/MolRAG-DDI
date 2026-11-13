import { motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import SeverityIndicator from "./SeverityIndicator";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } };

const CHIPS = [
  { key: "severe", label: "Severe", cls: "bg-severity-severeBg text-severity-severe" },
  { key: "moderate", label: "Moderate", cls: "bg-severity-moderateBg text-severity-moderate" },
  { key: "safe", label: "Safe", cls: "bg-severity-safeBg text-severity-safe" },
];

// Overview of every pair among 3 or more drugs, worst first.
// result = { drugs: [], pairs: [{drug1, drug2, severity, confidence}], counts: {safe, moderate, severe} }
export default function MultiPairResults({ result, onOpenPair, onReset, error }) {
  const { drugs, pairs, counts } = result;
  const top = pairs[0];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="card p-6 mb-5">
        <p className="font-mono text-sm text-clinical-muted mb-1">
          {drugs.length} drugs, {pairs.length} pairs checked
        </p>
        <h2 className="font-semibold text-2xl text-clinical-ink break-words">{drugs.join(" · ")}</h2>

        <div className="flex flex-wrap gap-2 mt-4">
          {CHIPS.map(({ key, label, cls }) => (
            <span key={key} className={`px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
              {counts?.[key] || 0} {label}
            </span>
          ))}
        </div>

        {top && (
          <p className="text-sm text-clinical-text mt-4">
            Highest predicted severity:{" "}
            <span className="font-mono text-clinical-ink">{top.drug1} × {top.drug2}</span>{" "}
            ({top.severity}, {Number(top.confidence).toFixed(1)}% confidence).
          </p>
        )}
      </motion.div>

      <ul className="space-y-3">
        {pairs.map((p) => (
          <motion.li
            key={`${p.drug1}|${p.drug2}`}
            variants={item}
            className="card p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <p className="font-mono text-sm text-clinical-ink break-words">{p.drug1} × {p.drug2}</p>
            <div className="flex flex-wrap items-center gap-4">
              <SeverityIndicator severity={p.severity.toLowerCase()} />
              <span className="text-sm text-clinical-muted">{Number(p.confidence).toFixed(1)}%</span>
              <button
                type="button"
                onClick={() => onOpenPair(p.drug1, p.drug2)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-clinical-teal hover:underline"
              >
                Full result <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.li>
        ))}
      </ul>

      {error && <p className="text-sm text-severity-severe mt-4">{error}</p>}

      <p className="text-xs text-clinical-muted mt-5">
        Each pair is checked on its own. The model does not predict what happens when three or more drugs are taken
        together. “Full result” opens the explanation, evidence, side effects and heatmaps for that pair and saves it
        to your history.
      </p>

      <button type="button" onClick={onReset} className="btn-ghost mt-6">
        <RotateCcw className="w-4 h-4" /> Check different drugs
      </button>
    </motion.div>
  );
}