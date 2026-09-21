import { useState } from "react";
import { Upload, ImageOff } from "lucide-react";

// Medicine/tablet image upload with preview.
// Recognition itself is NOT implemented — see the note shown after upload.
export default function ImageUploadInput() {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
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
          <div className="text-sm">
            <p className="font-medium text-clinical-navy">{fileName}</p>
            <p className="text-severity-moderate flex items-start gap-1 mt-1">
              <ImageOff className="w-4 h-4 shrink-0 mt-0.5" />
              Medicine recognition isn't connected yet — this needs an OCR/image-recognition
              backend before a drug name can be identified automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
