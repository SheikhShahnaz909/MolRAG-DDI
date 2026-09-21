import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import BackArrow from "../components/BackArrow";

// Placeholder history — replace with real records once the Prediction
// History Database (see report, Fig 3.1) is connected.
const DUMMY_HISTORY = [
  { id: 1, drugA: "Warfarin", drugB: "Aspirin", severity: "moderate", date: "2026-07-20" },
  { id: 2, drugA: "Ibuprofen", drugB: "Paracetamol", severity: "safe", date: "2026-07-18" },
  { id: 3, drugA: "Simvastatin", drugB: "Clarithromycin", severity: "severe", date: "2026-07-15" },
];

const SEVERITY_CONFIG = {
  safe: { label: "Safe", icon: ShieldCheck, text: "text-severity-safe", bg: "bg-severity-safeBg" },
  moderate: { label: "Moderate", icon: AlertTriangle, text: "text-severity-moderate", bg: "bg-severity-moderateBg" },
  severe: { label: "Severe", icon: ShieldAlert, text: "text-severity-severe", bg: "bg-severity-severeBg" },
};

export default function History() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        Prediction History
      </h1>
      <p className="text-clinical-muted mb-8">Past drug pair checks and their results.</p>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-clinical-navy text-white text-left">
              <th className="px-5 py-3 font-medium">Drug Pair</th>
              <th className="px-5 py-3 font-medium">Severity</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_HISTORY.map((row) => {
              const s = SEVERITY_CONFIG[row.severity];
              const Icon = s.icon;
              return (
                <tr key={row.id} className="border-t border-clinical-border">
                  <td className="px-5 py-4 font-mono">{row.drugA} × {row.drugB}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                      <Icon className="w-3.5 h-3.5" /> {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-clinical-muted">{row.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
