import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackArrow({ className = "" }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Go back"
      className={`inline-flex items-center gap-1.5 text-clinical-navy hover:text-clinical-teal
                  font-medium text-sm mb-6 transition-colors ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
      Back
    </button>
  );
}
