import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";

export default function Prediction() {
  const navigate = useNavigate();
  const [drugs, setDrugs] = useState(["", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Only suggest drugs the model can actually predict with -- not the full
  // browsing catalog -- so a suggested drug can never 404 on submit.
  const [predictableDrugs, setPredictableDrugs] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/predictable-drugs")
      .then((res) => res.json())
      .then((data) => setPredictableDrugs(data.drugs || []))
      .catch(() => {}); // autocomplete just falls back to the static list on failure
  }, []);

  async function handlePredict(e) {
    e.preventDefault();
    const filled = drugs.map((d) => d.trim()).filter(Boolean);
    if (filled.length < 2) {
      setError("Please enter at least two drugs to check for an interaction.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("http://127.0.0.1:8000/api/predict/ddi", {
        method: "POST",
        headers,
        body: JSON.stringify({
          drug1: filled[0],
          drug2: filled[1],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to get a prediction for these drugs.");
      }

      navigate("/results", { state: { result: data, drugs: filled } });
    } catch (err) {
      setError(
        err.message ||
        "Unable to reach the prediction server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
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
        {/* Capped at 2 drugs: the current model predicts one pair at a time. */}
        <DrugInputSelector drugs={drugs} onChange={setDrugs} multi minDrugs={2} maxDrugs={2} drugList={predictableDrugs} />

        {error && <p className="text-sm text-severity-severe mt-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Predicting..." : "Predict"} <Send className="w-4 h-4" />
        </button>
      </form>

      <Disclaimer />
    </div>
  );
}