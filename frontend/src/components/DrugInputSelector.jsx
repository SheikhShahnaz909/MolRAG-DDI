import { useState } from "react";
import { Type, Image as ImageIcon, FileText } from "lucide-react";
import MultiDrugNameInput from "./MultiDrugNameInput";
import DrugAutocomplete from "./DrugAutocomplete";
import ImageUploadInput from "./ImageUploadInput";
import PrescriptionUploadInput from "./PrescriptionUploadInput";

const METHODS = [
  { id: "name", label: "Drug Name", icon: Type },
  { id: "image", label: "Medicine Image", icon: ImageIcon },
  { id: "prescription", label: "Prescription", icon: FileText },
];

// Lets the user pick ONE of three input methods (not all three).
// Only the "name" method feeds real drug data back to the parent right now —
// image/prescription need OCR wired up before they can produce a drug name.
export default function DrugInputSelector({ drugs, onChange, multi = true, minDrugs = 2, maxDrugs = 10 }) {
  const [method, setMethod] = useState("name");

  return (
    <div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors
              ${method === id
                ? "bg-clinical-teal text-white border-clinical-teal"
                : "bg-white text-clinical-text border-clinical-border hover:border-clinical-teal"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {method === "name" && (
        multi ? (
          <MultiDrugNameInput drugs={drugs} onChange={onChange} minDrugs={minDrugs} maxDrugs={maxDrugs} />
        ) : (
          <DrugAutocomplete value={drugs[0] || ""} onChange={(val) => onChange([val])} />
        )
      )}
      {method === "image" && <ImageUploadInput />}
      {method === "prescription" && <PrescriptionUploadInput />}
    </div>
  );
}
