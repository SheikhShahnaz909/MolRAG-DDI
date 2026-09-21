import { useState } from "react";
import { FileUp, AlertCircle } from "lucide-react";

// Prescription image/PDF upload.
// OCR extraction is NOT implemented — see the note shown after upload.
export default function PrescriptionUploadInput() {
  const [fileName, setFileName] = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-clinical-text mb-2">
        Upload a prescription (image or PDF)
      </label>
      <label className="card flex flex-col items-center justify-center gap-2 py-10 cursor-pointer
                         border-dashed hover:border-clinical-teal transition-colors">
        <FileUp className="w-6 h-6 text-clinical-muted" />
        <span className="text-sm text-clinical-muted">Click to upload image or PDF</span>
        <input type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
      </label>

      {fileName && (
        <div className="mt-4 card p-4 text-sm">
          <p className="font-medium text-clinical-navy mb-1">{fileName}</p>
          <p className="text-severity-moderate flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Prescription OCR isn't connected yet — once wired up, detected medicine
            names will appear here for you to confirm before analysis.
          </p>
        </div>
      )}
    </div>
  );
}
