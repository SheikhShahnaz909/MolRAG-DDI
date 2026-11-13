import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Type, Image as ImageIcon, Plus, X } from "lucide-react";
import MultiDrugNameInput from "./MultiDrugNameInput";
import DrugAutocomplete from "./DrugAutocomplete";
import ImageUploadInput from "./ImageUploadInput";

const METHODS = [
  { id: "name", label: "Drug Name", icon: Type },
  { id: "image", label: "Medicine Image", icon: ImageIcon },
];

// Lets the user pick ONE of two input methods: type a drug name, or upload a photo of the medicine.
// drugList: optional set of names to suggest from (see DrugAutocomplete).
export default function DrugInputSelector({ drugs, onChange, multi = true, minDrugs = 2, maxDrugs = 10, drugList }) {
  const [method, setMethod] = useState("name");
  const uid = useId();

  return (
    <div>
      {/* segmented switch: the active pill slides between options */}
      <div className="inline-flex flex-wrap gap-1 p-1 mb-5 rounded-full bg-clinical-mist border border-clinical-border">
        {METHODS.map(({ id, label, icon: Icon }) => {
          const active = method === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMethod(id)}
              aria-pressed={active}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-clinical-teal
                          ${active ? "text-white" : "text-clinical-text hover:text-clinical-teal"}`}
            >
              {active && (
                <motion.span
                  layoutId={`method-pill-${uid}`}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-clinical-navy to-clinical-teal shadow-glass"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-4 h-4" /> {label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={method}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
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
                <div className="flex flex-wrap items-center gap-3">
                  {drugs.length < maxDrugs && (
                    <button
                      type="button"
                      onClick={() => onChange([...drugs, ""])}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-dashed border-clinical-teal/50
                                 text-sm font-medium text-clinical-teal hover:bg-clinical-teal/5 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add another drug
                      <span className="text-xs font-normal text-clinical-muted">({drugs.length} of {maxDrugs})</span>
                    </button>
                  )}
                  {drugs.length > minDrugs && (
                    <button
                      type="button"
                      onClick={() => onChange(drugs.slice(0, -1))}
                      className="flex items-center gap-1.5 text-sm font-medium text-clinical-muted hover:text-severity-severe transition-colors"
                    >
                      <X className="w-4 h-4" /> Remove last drug
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <ImageUploadInput onDetected={(name) => onChange([name])} />
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}