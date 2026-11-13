import { ExternalLink, TriangleAlert } from "lucide-react";

// What the FDA label says about a drug: what it is used for, class, routes, boxed warning.
// info = { product, pharm_class: [], routes: [], indications, boxed_warning, source, source_url }
export default function DrugLabelInfo({ info }) {
  const rows = [];
  if (info.indications) rows.push({ label: "Used for", value: info.indications });

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <p className="text-xs font-medium text-clinical-muted mb-1">{r.label}</p>
          <p className="text-sm text-clinical-text leading-relaxed">{r.value}</p>
        </div>
      ))}

      {info.pharm_class?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-clinical-muted mb-1.5">Drug class</p>
          <ul className="flex flex-wrap gap-2">
            {info.pharm_class.map((c) => (
              <li key={c} className="px-3 py-1 rounded-full bg-clinical-cloud border border-clinical-border text-xs text-clinical-text">{c}</li>
            ))}
          </ul>
        </div>
      )}

      {info.routes?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-clinical-muted mb-1.5">Given by</p>
          <ul className="flex flex-wrap gap-2">
            {info.routes.map((r) => (
              <li key={r} className="px-3 py-1 rounded-full bg-clinical-teal/10 text-xs text-clinical-teal font-medium">{r}</li>
            ))}
          </ul>
        </div>
      )}

      {info.boxed_warning && (
        <div className="rounded-xl bg-severity-severeBg p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-severity-severe mb-1">
            <TriangleAlert className="w-4 h-4" /> Boxed warning
          </p>
          <p className="text-sm text-clinical-text leading-relaxed">{info.boxed_warning}</p>
        </div>
      )}

      <p className="text-xs text-clinical-muted">
        Source: {info.source}
        {info.product ? ` (${info.product})` : ""}
        {info.source_url && (
          <>
            {" · "}
            <a href={info.source_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-clinical-teal hover:underline">
              View full label <ExternalLink className="w-3 h-3" />
            </a>
          </>
        )}
      </p>
    </div>
  );
}