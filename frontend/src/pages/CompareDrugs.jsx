import { useState } from "react";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";

const FIELDS = [
  "Generic / Active Ingredient",
  "Drug Class",
  "Uses",
  "Side Effects",
  "Warnings",
  "Interaction Risk",
];

export default function CompareDrugs() {
  const [drugs, setDrugs] = useState(["", ""]);
  const filled = drugs.map((d) => d.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        Compare Drugs
      </h1>
      <p className="text-clinical-muted mb-8">
        Add two or more medicines to compare their profiles side by side.
      </p>

      <div className="card p-8 mb-8">
        <DrugInputSelector drugs={drugs} onChange={setDrugs} multi minDrugs={2} maxDrugs={6} />
      </div>

      {filled.length >= 2 && (
        // TODO: replace placeholder cells with real data — normalize brand
        // names to active ingredients first (see report section on RAG/GNN).
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-clinical-navy text-white text-left">
                <th className="px-4 py-3 font-medium">Field</th>
                {filled.map((d) => (
                  <th key={d} className="px-4 py-3 font-medium font-mono">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f} className="border-t border-clinical-border">
                  <td className="px-4 py-3 font-medium text-clinical-navy">{f}</td>
                  {filled.map((d) => (
                    <td key={d + f} className="px-4 py-3 text-clinical-muted">
                      Not available yet
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
