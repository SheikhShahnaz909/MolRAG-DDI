import { Plus } from "lucide-react";
import DrugAutocomplete from "./DrugAutocomplete";

// List of drug-name fields with add/remove, each backed by DrugAutocomplete.
// drugList: optional override, passed through to each DrugAutocomplete (see
// that component for why -- lets a page suggest from a different set, e.g.
// only predictable drugs, instead of the default static list).
export default function MultiDrugNameInput({ drugs, onChange, minDrugs = 2, maxDrugs = 10, drugList }) {
  function updateDrug(i, val) {
    const next = [...drugs];
    next[i] = val;
    onChange(next);
  }
  function addDrug() {
    if (drugs.length < maxDrugs) onChange([...drugs, ""]);
  }
  function removeDrug(i) {
    if (drugs.length <= minDrugs) return;
    onChange(drugs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {drugs.map((d, i) => (
        <div key={i}>
          <label className="block text-xs font-medium text-clinical-muted mb-1">
            Drug {i + 1}
          </label>
          <DrugAutocomplete
            value={d}
            onChange={(val) => updateDrug(i, val)}
            onRemove={drugs.length > minDrugs ? () => removeDrug(i) : undefined}
            drugList={drugList}
          />
        </div>
      ))}
      {drugs.length < maxDrugs && (
        <button
          type="button"
          onClick={addDrug}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-dashed border-clinical-teal/50
                     text-sm font-medium text-clinical-teal hover:bg-clinical-teal/5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add another drug
          <span className="text-xs font-normal text-clinical-muted">({drugs.length} of {maxDrugs})</span>
        </button>
      )}
    </div>
  );
}