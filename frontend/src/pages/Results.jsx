import { API_URL } from "../config";
import { useEffect, useState } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { animate, motion, useReducedMotion } from "framer-motion";
import { FileText, ShieldCheck, AlertTriangle, ShieldAlert, Printer, RotateCcw, Sparkles, ExternalLink } from "lucide-react";
import BackArrow from "../components/BackArrow";
import Disclaimer from "../components/Disclaimer";
import SideEffectBlock from "../components/SideEffectsPanel";

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
    if (reduce) { setV(to); return undefined; }
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
        <circle cx="80" cy="80" r={R} fill="none" stroke="currentColor" className="text-clinical-border" strokeWidth="12" />
        <motion.circle
          cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - Math.min(pct, 100) / 100) }}
          transition={{ duration: 1.2, delay: 0.35, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-semibold text-4xl text-clinical-ink">
          <CountUp to={Number(pct)} />%
        </span>
        <span className="text-xs text-clinical-muted mt-1">Confidence</span>
      </div>
    </div>
  );
}

// Probability of each class, always as a labelled number next to the bar.
function ProbabilityBars({ probabilities, predicted }) {
  if (!probabilities) return null;
  const rows = ["safe", "moderate", "severe"].filter((k) => typeof probabilities[k] === "number");
  if (rows.length === 0) return null;
  return (
    <div className="mt-7 text-left">
      <p className="text-xs font-medium text-clinical-muted mb-3">Probability of each level</p>
      <div className="space-y-2.5">
        {rows.map((k) => {
          const pct = Math.max(0, Math.min(100, probabilities[k] * 100));
          const s = SEVERITY[k];
          return (
            <div key={k} className="flex items-center gap-3 text-sm">
              <span className={`w-20 shrink-0 ${k === predicted ? "font-semibold text-clinical-ink" : "text-clinical-muted"}`}>{s.label}</span>
              <div className="flex-1 h-2 rounded-full bg-clinical-mist overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: s.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
                />
              </div>
              <span className="w-14 text-right font-mono text-xs text-clinical-text">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

function EvidenceList({ evidence, sources }) {
  return (
    <motion.ul variants={container} className="space-y-4 mt-3">
      {evidence.length > 0
        ? evidence.map((e, i) => (
            <motion.li key={i} variants={item} className="flex items-start gap-3 text-sm">
              <FileText className="w-4 h-4 text-clinical-teal mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-clinical-ink break-words">{e.drug1} + {e.drug2}</p>
                {e.text && <p className="text-clinical-text leading-relaxed mt-1">{e.text}</p>}
              </div>
            </motion.li>
          ))
        : sources.map((pair, i) => (
            <motion.li key={i} variants={item} className="flex items-start gap-3 text-sm">
              <FileText className="w-4 h-4 text-clinical-teal mt-0.5 shrink-0" />
              <span className="font-mono text-clinical-ink break-words">{pair}</span>
            </motion.li>
          ))}
    </motion.ul>
  );
}

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

  // Newer responses carry the dataset text itself; older saved ones only the pair names.
  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  const evidenceExact = result.evidence_exact !== false; // older records: assume exact
  const aiText = result.explanation_source !== "facts"; // older records have language-model text
  const sideEffects = Array.isArray(result.side_effects) ? result.side_effects : [];
  const labelNotes = result.label_interactions?.notes || [];
  const labelsChecked = result.label_interactions?.labels_checked || [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="print:hidden"><BackArrow /></div>
      <p className="font-mono text-sm text-clinical-muted mb-2">Prediction Result</p>
      <h1 className="text-3xl sm:text-4xl font-semibold text-clinical-ink mb-8 break-words">
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
          <ProbabilityBars probabilities={result.probabilities} predicted={severity} />
        </motion.div>

        <div className="space-y-6">
          <motion.div variants={item} className="card p-7">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="font-semibold text-xl text-clinical-ink">{aiText ? "Medical Explanation" : "Summary"}</h2>
              {aiText && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-clinical-mist text-clinical-muted text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> AI-generated summary
                </span>
              )}
            </div>
            <p className="text-sm text-clinical-text leading-relaxed">
              {result.explanation || "No explanation was returned for this pair."}
            </p>
            <p className="text-xs text-clinical-muted mt-3">
              {aiText
                ? "Written by a language model, so it can be wrong. The evidence below is the source material; check important decisions with a pharmacist or doctor."
                : "Built only from the model's numbers and the evidence dataset. It is a computer estimate, not medical advice."}
            </p>
          </motion.div>

          {(evidence.length > 0 || result.evidence_sources?.length > 0) && (
            <motion.div variants={item} className="card p-7">
              <h2 className="font-semibold text-xl text-clinical-ink mb-2">Supporting Evidence</h2>
              {evidenceExact ? (
                <EvidenceList evidence={evidence} sources={result.evidence_sources || []} />
              ) : (
                <>
                  <p className="text-sm text-clinical-text leading-relaxed">
                    The evidence dataset has no record for this exact pair, so nothing here supports or contradicts
                    this prediction.
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-clinical-teal">
                      Show {evidence.length || result.evidence_sources.length} similar entries (about other drug pairs)
                    </summary>
                    <EvidenceList evidence={evidence} sources={result.evidence_sources || []} />
                  </details>
                </>
              )}
            </motion.div>
          )}

          {labelsChecked.length > 0 && (
            <motion.div variants={item} className="card p-7">
              <h2 className="font-semibold text-xl text-clinical-ink mb-1">What FDA Drug Labels Say About This Combination</h2>
              <p className="text-xs text-clinical-muted mb-4">
                Word-for-word sentences from each drug's FDA label that name the other drug. These are written by the
                manufacturer for prescribers.
              </p>
              {labelNotes.length > 0 ? (
                <div className="space-y-4">
                  {labelNotes.map((n, i) => (
                    <div key={i} className="rounded-xl bg-clinical-cloud border border-clinical-border p-4">
                      <p className="text-sm text-clinical-text leading-relaxed">{n.excerpt}</p>
                      <p className="text-xs text-clinical-muted mt-2">
                        From the FDA label for {n.label_drug}{n.product ? ` (${n.product})` : ""}, which mentions {n.mentions}.
                        {n.source_url && (
                          <>
                            {" "}
                            <a href={n.source_url} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 text-clinical-teal hover:underline">
                              View full label <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-clinical-text leading-relaxed">
                  {labelsChecked.some((c) => c.found)
                    ? "The FDA labels we found do not name the other drug. That does not mean the combination is safe: labels list only some interactions, often by drug class."
                    : "No FDA label could be retrieved for these drugs right now."}
                </p>
              )}
            </motion.div>
          )}

          {sideEffects.length > 0 && (
            <motion.div variants={item} className="card p-7">
              <h2 className="font-semibold text-xl text-clinical-ink mb-1">Commonly Reported Side Effects</h2>
              <p className="text-xs text-clinical-muted mb-4">
                General side effects of each drug taken on its own. They are not necessarily effects of this interaction.
              </p>
              <div className="space-y-5">
                {sideEffects.map((d) => (
                  <SideEffectBlock key={d.drug} record={d} />
                ))}
              </div>
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
          <h2 className="font-semibold text-xl text-clinical-ink mb-2">Grad-CAM Explanation</h2>
          <p className="text-sm text-clinical-muted mb-5">
            Where the image part of the model responded most (red = strongest). This is a rough guide only: it does
            not identify which atoms or groups matter chemically, and the colours are scaled for each image separately.
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
                className="w-full rounded-xl border border-clinical-border bg-surface"
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