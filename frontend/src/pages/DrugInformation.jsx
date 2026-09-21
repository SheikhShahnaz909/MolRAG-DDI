import { useState } from "react";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";

const FIELDS = [
  "Generic / Active Ingredient",
  "Common Brand Names",
  "Drug Class",
  "Common Uses",
  "Common Side Effects",
  "Important Warnings",
  "Known Interaction Information",
];

export default function DrugInformation() {
  const [drugs, setDrugs] = useState([""]);
  const selected = drugs[0]?.trim();

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        Drug Information
      </h1>
      <p className="text-clinical-muted mb-8">
        Select or upload a medicine to view its information.
      </p>

      <div className="card p-8">
        <DrugInputSelector drugs={drugs} onChange={setDrugs} multi={false} />
      </div>

      {selected && (
        <div className="card p-6 mt-6">
          <h2 className="font-display font-semibold text-lg text-clinical-navy mb-4">
            {selected}
          </h2>
          {/* TODO: replace this placeholder with a real lookup against
              DrugBank/RxNorm/your project's molecular dataset. */}
          <dl className="divide-y divide-clinical-border">
            {FIELDS.map((f) => (
              <div key={f} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                <dt className="text-sm font-medium text-clinical-text">{f}</dt>
                <dd className="text-sm text-clinical-muted sm:text-right">
                  Not available — connect a drug database to populate this.
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
