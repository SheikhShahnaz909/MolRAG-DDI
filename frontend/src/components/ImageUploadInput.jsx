import { API_URL } from "../config";
import { authHeader } from "../lib/authHeader";
import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

// Medicine/tablet image upload -> OCR -> fuzzy drug match -> user confirms one.
export default function ImageUploadInput({ onDetected }) {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setMatches(null);
    setSelected("");
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/ocr`, {
        method: "POST",
        headers: authHeader(), // lets the server save the scan to the user's history (no Content-Type: it's a file upload)
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not process this image.");
      }

      setMatches(data.matches || []);
      if (!data.matches?.length) {
        setError("No matching drug name found in this image. Try a clearer photo of the label.");
      }
    } catch (err) {
      setError(err.message || "Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  function confirmMatch(name) {
    setSelected(name);
    onDetected?.(name);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-clinical-text mb-2">
        Upload a photo of the medicine or its packaging
      </label>
      <label className="card flex flex-col items-center justify-center gap-2 py-10 cursor-pointer
                         border-dashed hover:border-clinical-teal transition-colors">
        <Upload className="w-6 h-6 text-clinical-muted" />
        <span className="text-sm text-clinical-muted">Click to upload an image</span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>

      {preview && (
        <div className="mt-4 flex items-start gap-4">
          <img src={preview} alt={fileName} className="w-24 h-24 object-cover rounded-lg border border-clinical-border" />
          <div className="text-sm flex-1">
            <p className="font-medium text-clinical-ink mb-2">{fileName}</p>

            {loading && <p className="text-clinical-muted">Reading image...</p>}

            {error && (
              <p className="text-severity-severe flex items-start gap-1">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </p>
            )}

            {matches?.length > 0 && !selected && (
              <div>
                <p className="text-clinical-muted mb-2">Did we get it right? Select one:</p>
                <div className="flex flex-wrap gap-2">
                  {matches.map((m) => (
                    <button
                      key={m.drug_name}
                      type="button"
                      onClick={() => confirmMatch(m.drug_name)}
                      className="px-3 py-1.5 rounded-lg border border-clinical-border text-xs font-medium
                                 hover:border-clinical-teal hover:bg-clinical-bg transition-colors"
                    >
                      {m.drug_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected && (
              <p className="text-severity-safe flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Using: {selected}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}