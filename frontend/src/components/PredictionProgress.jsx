import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

// Same stages as the How It Works page.
const STAGES = [
  "Identifying and normalizing the drugs",
  "Analysing molecular structures",
  "Retrieving supporting evidence",
  "Generating the prediction",
];

// The server doesn't report progress, so the stages advance on a timer and
// the last one stays active until the real response arrives.
export default function PredictionProgress({ drugs = [] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, STAGES.length - 1)), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-8"
      role="status"
      aria-live="polite"
    >
      <p className="font-mono text-sm text-clinical-muted mb-1">Checking</p>
      <h2 className="font-semibold text-2xl text-clinical-navy mb-6 break-words">
        {drugs.slice(0, 2).join(" × ")}
      </h2>

      <div className="h-1.5 rounded-full bg-clinical-mist overflow-hidden mb-6">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-clinical-navy to-clinical-teal"
          initial={{ width: "8%" }}
          animate={{ width: `${((active + 1) / STAGES.length) * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <ul className="space-y-3">
        {STAGES.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors
                  ${done ? "bg-clinical-teal text-white" : current ? "bg-clinical-mist text-clinical-teal" : "bg-clinical-cloud text-clinical-muted"}`}
              >
                {done ? <Check className="w-4 h-4" /> : current ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs">{i + 1}</span>}
              </span>
              <span className={`text-sm transition-colors ${current ? "text-clinical-navy font-medium" : done ? "text-clinical-text" : "text-clinical-muted"}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-clinical-muted mt-6">
        These steps are an estimate of progress while the server works. This can take a few moments.
      </p>
    </motion.div>
  );
}