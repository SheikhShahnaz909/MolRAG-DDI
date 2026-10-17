import { API_URL } from "../config";
import { useState } from "react";
import { FileUp, AlertCircle, CheckCircle2 } from "lucide-react";

// Prescription image upload -> OCR -> fuzzy drug matches -> user picks ALL
// that apply (a prescription usually lists more than one drug).
// NOTE: images only -- PDF prescriptions aren't supported yet (would need
// poppler/pdf2image to rasterize pages first).
export default function PrescriptionUploadInput({ onDetected, maxDrugs = Infinity }) {
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [checked, setChecked] = useState([]);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMatches(null);
    setChecked([]);
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/ocr`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Could not process this file. Only image prescriptions are supported right now, not PDFs."
        );
      }

      setMatches(data.matches || []);
      if (!data.matches?.length) {
        setError("No matching drug names found. Try a clearer photo of the prescription.");
      }
    } catch (err) {
      setError(err.message || "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(name) {
    const alreadyChecked = checked.includes(name);
    if (!alreadyChecked && checked.length >= maxDrugs) {
      return; // at the limit -- ignore further selections until one is unchecked
    }
    const updated = alreadyChecked
      ? checked.filter((n) => n !== name)
      : [...checked, name];
    setChecked(updated);
    onDetected?.(updated);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-clinical-text mb-2">
        Upload a prescription (image only, for now)
      </label>
      <label className="card flex flex-col items-center justify-center gap-2 py-10 cursor-pointer
                         border-dashed hover:border-clinical-teal transition-colors">
        <FileUp className="w-6 h-6 text-clinical-muted" />
        <span className="text-sm text-clinical-muted">Click to upload an image</span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      {fileName && (
        <div className="mt-4 card p-4 text-sm">
          <p className="font-medium text-clinical-navy mb-2">{fileName}</p>

          {loading && <p className="text-clinical-muted">Reading prescription...</p>}

          {error && (
            <p className="text-severity-severe flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          {matches?.length > 0 && (
            <div>
              <p className="text-clinical-muted mb-2">
                Select the drugs that apply{Number.isFinite(maxDrugs) ? ` (up to ${maxDrugs})` : ""}:
              </p>
              <div className="space-y-2">
                {matches.map((m) => {
                  const isChecked = checked.includes(m.drug_name);
                  const disabled = !isChecked && checked.length >= maxDrugs;
                  return (
                    <label
                      key={m.drug_name}
                      className={`flex items-center gap-2 ${disabled ? "text-clinical-muted cursor-not-allowed" : "text-clinical-text cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={disabled}
                        onChange={() => toggle(m.drug_name)}
                      />
                      {m.drug_name}
                    </label>
                  );
                })}
              </div>
              {checked.length > 0 && (
                <p className="text-severity-safe flex items-center gap-1.5 font-medium mt-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Using: {checked.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}