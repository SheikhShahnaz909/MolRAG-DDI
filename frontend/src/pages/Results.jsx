import { API_URL } from "../config";
import { useEffect, useState } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { animate, motion, useReducedMotion } from "framer-motion";
import { FileText, ShieldCheck, AlertTriangle, ShieldAlert, Printer, RotateCcw } from "lucide-react";
import BackArrow from "../components/BackArrow";
import Disclaimer from "../components/Disclaimer";

// Severity is always shown as colour + icon + text, never colour alone.
const SEVERITY = {
  safe: { label: "Safe", icon: ShieldCheck, color: "#1F9D55", bg: "bg-severity-safeBg", text: "text-severity-safe" },
  moderate: { label: "Moderate", icon: AlertTriangle, color: "#D97706", bg: "bg-severity-moderateBg", text: "text-severity-moderate" },
  severe: { label: "Severe", icon: ShieldAlert, color: "#DC2626", bg: "bg-severity-severeBg", text: "text-severity-severe" },
};

function CountUp({ to }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) { setV(to); return; }
    const controls = animate(0, to, { duration: 1.2, delay: 0.35, ease: "easeOut", onUpdate: setV });
    return () => controls.stop();
  }, [to, reduce]);

  return <>{v.toFixed(1)}</>;
}

const R = 64;
const C = 2 * Math.PI * R;

function ConfidenceRing({ pct, color }) {
  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#E8EEF4" strokeWidth="12" />
        <motion.circle
          cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - Math.min(pct, 100) / 100) }}
          transition={{ duration: 1.2, delay: 0.35, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-semibold text-4xl text-clinical-navy">
          <CountUp to={Number(pct)} />%
        </span>
        <span className="text-xs text-clinical-muted mt-1">Confidence</span>
      </div>
    </div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

export default function Results() {
  const { state } = useLocation();
  const result = state?.result;
  const drugs = state?.drugs?.length ? state.drugs : [];

  // No prediction in state (e.g. user navigated here directly) — send them
  // back to run one instead of silently showing fake data.
  if (!result) {
    return <Navigate to="/prediction" replace />;
  }

  const severity = (result.severity || "").toLowerCase();
  const s = SEVERITY[severity] || SEVERITY.moderate;
  const Icon = s.icon;
  const confidencePct =
    typeof result.confidence === "number"
      ? (result.confidence <= 1 ? result.confidence * 100 : result.confidence).toFixed(1)
      : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="print:hidden"><BackArrow /></div>
      <p className="font-mono text-sm text-clinical-muted mb-2">Prediction Result</p>
      <h1 className="text-3xl sm:text-4xl font-semibold text-clinical-navy mb-8 break-words">
        {(drugs.length ? drugs : [result.drug1, result.drug2]).join(" × ")}
      </h1>

      <motion.div variants={container} initial="hidden" animate="show" className="grid lg:grid-cols-[22rem_1fr] gap-6 items-start">
        {/* Severity + confidence */}
        <motion.div variants={item} className="card relative overflow-hidden p-8 text-center lg:sticky lg:top-28">
          <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: s.color }} />
          {confidencePct !== null ? (
            <ConfidenceRing pct={confidencePct} color={s.color} />
          ) : (
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${s.bg}`}>
              <Icon className={`w-12 h-12 ${s.text}`} />
            </div>
          )}
          <motion.div
            role="status"
            aria-label={`Severity: ${s.label}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.7 }}
            className={`mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-display font-semibold text-xl ${s.bg} ${s.text}`}
          >
            <Icon className="w-5 h-5" /> {s.label}
          </motion.div>
          <p className="text-xs text-clinical-muted mt-3">Predicted interaction severity</p>
        </motion.div>

        <div className="space-y-6">
          <motion.div variants={item} className="card p-7">
            <h2 className="font-semibold text-xl text-clinical-navy mb-3">Medical Explanation</h2>
            <p className="text-sm text-clinical-text leading-relaxed">
              {result.explanation || "No explanation was returned for this pair."}
            </p>
          </motion.div>

          {result.evidence_sources?.length > 0 && (
            <motion.div variants={item} className="card p-7">
              <h2 className="font-semibold text-xl text-clinical-navy mb-4">Supporting Evidence</h2>
              <motion.ul variants={container} className="space-y-3">
                {result.evidence_sources.map((pair, i) => (
                  <motion.li key={i} variants={item} className="flex items-start gap-3 text-sm">
                    <FileText className="w-4 h-4 text-clinical-teal mt-0.5 shrink-0" />
                    <span className="font-mono text-clinical-navy break-words">{pair}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          )}
        </div>
      </motion.div>

      {result.gradcam?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="card p-7 mt-6"
        >
          <h2 className="font-semibold text-xl text-clinical-navy mb-2">Grad-CAM Explanation</h2>
          <p className="text-sm text-clinical-muted mb-5">
            Highlighted regions show which parts of each molecule most influenced the prediction.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {result.gradcam.map((path, i) => (
              <motion.img
                key={i}
                src={`${API_URL}/${path}`}
                alt={`Grad-CAM heatmap ${i + 1}`}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="w-full rounded-xl border border-clinical-border bg-white"
              />
            ))}
          </div>
        </motion.div>
      )}

      <div className="mt-8 flex flex-wrap gap-3 print:hidden">
        <Link to="/prediction" className="btn-primary">
          <RotateCcw className="w-4 h-4" /> Run another prediction
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-ghost">
          <Printer className="w-4 h-4" /> Print or save as PDF
        </button>
      </div>

      <Disclaimer />
    </div>
  );
}