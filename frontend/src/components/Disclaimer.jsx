import { Info } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="flex items-start gap-2 text-xs text-clinical-muted bg-white
                     border border-clinical-border rounded-lg px-4 py-3 mt-8">
      <Info className="w-4 h-4 shrink-0 mt-0.5 text-clinical-teal" />
      <p>
        This system is intended for educational and decision-support purposes only
        and should not replace professional medical advice.
      </p>
    </div>
  );
}
