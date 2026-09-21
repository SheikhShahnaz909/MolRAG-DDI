const CONFIG = {
  safe: { label: "Safe", dot: "bg-severity-safe", text: "text-severity-safe" },
  moderate: { label: "Moderate", dot: "bg-severity-moderate", text: "text-severity-moderate" },
  severe: { label: "Severe", dot: "bg-severity-severe", text: "text-severity-severe" },
};

// Colour + text severity indicator. Never relies on colour alone —
// the label is always rendered alongside the dot for accessibility.
export default function SeverityIndicator({ severity, size = "md" }) {
  const cfg = CONFIG[severity] || CONFIG.moderate;
  const dotSize = size === "lg" ? "w-4 h-4" : "w-3 h-3";
  const textSize = size === "lg" ? "text-lg" : "text-sm";

  return (
    <span className="inline-flex items-center gap-2" role="status" aria-label={`Severity: ${cfg.label}`}>
      <span className={`${dotSize} rounded-full ${cfg.dot}`} aria-hidden="true" />
      <span className={`font-display font-semibold ${textSize} ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
}
