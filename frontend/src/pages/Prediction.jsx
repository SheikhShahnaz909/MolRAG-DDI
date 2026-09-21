import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";

export default function Prediction() {
  const navigate = useNavigate();
  const [drugs, setDrugs] = useState(["", ""]);
  const [error, setError] = useState("");

  function handlePredict(e) {
    e.preventDefault();
    const filled = drugs.map((d) => d.trim()).filter(Boolean);
    if (filled.length < 2) {
      setError("Please enter at least two drugs to check for an interaction.");
      return;
    }
    setError("");
    // TODO: replace with a real API call once the backend endpoint is ready.
    // e.g. fetch("/api/predict", { method: "POST", body: JSON.stringify({ drugs: filled }) })
    navigate("/results", { state: { drugs: filled } });
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        Check Drug Interactions
      </h1>
      <p className="text-clinical-muted mb-8">
        Choose one way to provide your drugs, then run the check.
      </p>

      <form onSubmit={handlePredict} className="card p-8">
        <DrugInputSelector drugs={drugs} onChange={setDrugs} multi minDrugs={2} />

        {error && <p className="text-sm text-severity-severe mt-4">{error}</p>}

        <button type="submit" className="btn-primary w-full justify-center mt-6">
          Predict <Send className="w-4 h-4" />
        </button>
      </form>

      <Disclaimer />
    </div>
  );
}
