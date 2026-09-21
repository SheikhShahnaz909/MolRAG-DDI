import { useLocation, Link } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import BackArrow from "../components/BackArrow";
import SeverityIndicator from "../components/SeverityIndicator";
import Disclaimer from "../components/Disclaimer";

// Placeholder result — replace with the real API response
// once Rafa's backend endpoint is wired in.
const DEMO_RESULT = {
  severity: "moderate",
  explanation:
    "Combining these drugs may increase bleeding risk. The interaction affects blood clotting pathways, so monitoring is recommended if co-prescribed.",
  evidence: [
    { source: "DrugBank", note: "Documented interaction entry for this drug pair." },
    { source: "PubMed", note: "Clinical study noting increased bleeding risk in combined use." },
  ],
};

export default function Results() {
  const { state } = useLocation();
  const drugs = state?.drugs?.length ? state.drugs : ["Warfarin", "Aspirin"];
  const result = DEMO_RESULT; // TODO: replace with the real prediction from the API

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <BackArrow />
      <p className="font-mono text-sm text-clinical-muted mb-2">Prediction Result</p>
      <h1 className="font-display text-2xl font-semibold text-clinical-navy mb-8">
        {drugs.join(" × ")}
      </h1>

      {/* Severity shown as a coloured circle + text — never colour alone. */}
      <div className="card p-6 flex items-center gap-3 mb-6">
        <SeverityIndicator severity={result.severity} size="lg" />
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-display font-semibold text-clinical-navy mb-3">Medical Explanation</h2>
        <p className="text-sm text-clinical-text leading-relaxed">{result.explanation}</p>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-display font-semibold text-clinical-navy mb-4">Supporting Evidence</h2>
        <ul className="space-y-3">
          {result.evidence.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <FileText className="w-4 h-4 text-clinical-teal mt-0.5 shrink-0" />
              <span>
                <span className="font-medium text-clinical-navy">{item.source}</span>
                {" — "}{item.note}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Link to="/prediction" className="text-clinical-teal text-sm font-medium inline-flex items-center gap-1">
        Run another prediction <ExternalLink className="w-3.5 h-3.5" />
      </Link>

      <Disclaimer />
    </div>
  );
}
