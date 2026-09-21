import { Plus } from "lucide-react";
import DrugAutocomplete from "./DrugAutocomplete";

// List of drug-name fields with add/remove, each backed by DrugAutocomplete.
export default function MultiDrugNameInput({ drugs, onChange, minDrugs = 2, maxDrugs = 10 }) {
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
          />
        </div>
      ))}
      {drugs.length < maxDrugs && (
        <button
          type="button"
          onClick={addDrug}
          className="flex items-center gap-1.5 text-sm font-medium text-clinical-teal hover:text-clinical-tealLight"
        >
          <Plus className="w-4 h-4" /> Add Another Drug
        </button>
      )}
    </div>
  );
}
