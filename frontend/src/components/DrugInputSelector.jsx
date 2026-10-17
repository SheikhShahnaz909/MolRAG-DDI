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
export default function DrugInputSelector({ drugs, onChange, multi = true, minDrugs = 2, maxDrugs = 10, drugList }) {
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
          <MultiDrugNameInput drugs={drugs} onChange={onChange} minDrugs={minDrugs} maxDrugs={maxDrugs} drugList={drugList} />
        ) : (
          <DrugAutocomplete value={drugs[0] || ""} onChange={(val) => onChange([val])} drugList={drugList} />
        )
      )}
      {method === "image" && (
        multi ? (
          <div className="space-y-6">
            {drugs.map((_, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-clinical-text mb-2">Drug {i + 1}</p>
                <ImageUploadInput
                  onDetected={(name) => {
                    const updated = [...drugs];
                    updated[i] = name;
                    onChange(updated);
                  }}
                />
              </div>
            ))}
            {drugs.length < maxDrugs && (
              <button
                type="button"
                onClick={() => onChange([...drugs, ""])}
                className="text-sm text-clinical-teal font-medium"
              >
                + Add Another Drug
              </button>
            )}
          </div>
        ) : (
          <ImageUploadInput onDetected={(name) => onChange([name])} />
        )
      )}
      {method === "prescription" && (
        <PrescriptionUploadInput
          maxDrugs={multi ? maxDrugs : 1}
          onDetected={(names) => onChange(names)} // prescription can list several drugs
        />
      )}
    </div>
  );
}