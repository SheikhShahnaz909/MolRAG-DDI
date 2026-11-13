import { ExternalLink, Pill } from "lucide-react";

// One drug's side effects. Shows the short list from the local dataset and/or a
// word-for-word excerpt from the FDA label, each with its source.
// record = { drug, effects: [], source, label: { excerpt, source, source_url, product } | null }
export default function SideEffectBlock({ record, showName = true }) {
  const effects = record.effects || [];
  const label = record.label;
  const hasAny = effects.length > 0 || Boolean(label?.excerpt);

  return (
    <div>
      {showName && (
        <p className="flex items-center gap-2 font-medium text-clinical-ink mb-2">
          <Pill className="w-4 h-4 text-clinical-teal" /> {record.drug}
        </p>
      )}

      {effects.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-2">
            {effects.map((fx) => (
              <li key={fx} className="px-3 py-1 rounded-full bg-clinical-cloud border border-clinical-border text-xs text-clinical-text">
                {fx}
              </li>
            ))}
          </ul>
          <p className="text-xs text-clinical-muted mt-2">Source: {record.source || "Local medicine dataset"}</p>
        </>
      )}

      {label?.excerpt && (
        <div className={`rounded-xl bg-clinical-cloud border border-clinical-border p-4 ${effects.length > 0 ? "mt-4" : ""}`}>
          <p className="text-xs font-medium text-clinical-muted mb-1.5">
            Excerpt from the FDA label{label.product ? ` (${label.product})` : ""}
          </p>
          <p className="text-sm text-clinical-text leading-relaxed">{label.excerpt}</p>
          <p className="text-xs text-clinical-muted mt-2">
            Source: {label.source}
            {label.source_url && (
              <>
                {" · "}
                <a
                  href={label.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-clinical-teal hover:underline"
                >
                  View full label <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {!hasAny && (
        <p className="text-sm text-clinical-muted">
          No side-effect information was found for this drug in the sources we check.
        </p>
      )}
    </div>
  );
}
