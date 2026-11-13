import { API_URL } from "../config";
import { authHeader } from "../lib/authHeader";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Loader2 } from "lucide-react";
import BackArrow from "../components/BackArrow";
import DrugInputSelector from "../components/DrugInputSelector";
import Disclaimer from "../components/Disclaimer";
import PredictionProgress from "../components/PredictionProgress";
import MultiPairResults from "../components/MultiPairResults";
import { usePredictableDrugs } from "../hooks/useDrugNames";

const MAX_DRUGS = 6; // 6 drugs = 15 pairs. Keep in step with MAX_MULTI_DRUGS in routers/prediction.py

export default function Prediction() {
  const navigate = useNavigate();
  const [drugs, setDrugs] = useState(["", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyPair, setBusyPair] = useState(null); // [a, b] while one pair's full result is being made
  const [pairCount, setPairCount] = useState(0); // pairs being checked in a 3+ drug overview
  const [multi, setMulti] = useState(null); // overview result for 3+ drugs
  const [stage, setStage] = useState(null); // real stage index from the server, when it sends one
  const [live, setLive] = useState(false);
  // Only suggest drugs the model can actually predict with -- not the full
  // browsing catalog -- so a suggested drug can never 404 on submit.
  const predictableDrugs = usePredictableDrugs();

  const filled = drugs.map((d) => d.trim()).filter(Boolean);
  const pairsForFilled = (filled.length * (filled.length - 1)) / 2;

  // Preferred path: the server streams one JSON object per line:
  //   {"type":"stage","stage":0..3}   progress
  //   {"type":"result","data":{...}}  the same object /api/predict/ddi returns
  //   {"type":"error","detail":"..."} a failure
  // Returns null when the server has no streaming endpoint (so we use the old one).
  async function predictStreaming(headers, body) {
    const response = await fetch(`${API_URL}/api/predict/ddi/stream`, { method: "POST", headers, body });

    if (response.status === 404 || response.status === 405) return null;

    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.json()).detail;
      } catch {
        /* no JSON body */
      }
      throw new Error(detail || "Unable to get a prediction for these drugs.");
    }
    if (!response.body) throw new Error("The server did not send a readable response.");

    function handle(line) {
      if (!line.trim()) return undefined;
      const evt = JSON.parse(line);
      if (evt.type === "stage") {
        setLive(true);
        setStage(evt.stage);
      } else if (evt.type === "error") {
        throw new Error(evt.detail || "Unable to get a prediction for these drugs.");
      } else if (evt.type === "result") {
        return evt.data;
      }
      return undefined;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        const result = handle(line);
        if (result) return result;
      }
    }
    const last = handle(buffer);
    if (last) return last;
    throw new Error("The server closed the connection before sending a result.");
  }

  // Full prediction for ONE pair (stream if available, otherwise the single-response route).
  async function runPair(drug1, drug2) {
    const token = localStorage.getItem("authToken");
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const body = JSON.stringify({ drug1, drug2 });

    let data = await predictStreaming(headers, body);

    if (!data) {
      // Server has no streaming endpoint: original single-response request.
      const response = await fetch(`${API_URL}/api/predict/ddi`, { method: "POST", headers, body });
      data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to get a prediction for these drugs.");
      }
    }
    return data;
  }

  async function openPair(drug1, drug2) {
    setError("");
    setStage(null);
    setLive(false);
    setBusyPair([drug1, drug2]);
    setLoading(true);
    try {
      const data = await runPair(drug1, drug2);
      navigate("/results", { state: { result: data, drugs: [data.drug1 || drug1, data.drug2 || drug2] } });
    } catch (err) {
      setError(err.message || "Unable to reach the prediction server. Make sure the backend is running.");
    } finally {
      setLoading(false);
      setBusyPair(null);
    }
  }

  async function handlePredict(e) {
    e.preventDefault();
    if (filled.length < 2) {
      setError("Please enter at least two drugs to check for an interaction.");
      return;
    }

    setError("");
    setMulti(null);
    setStage(null);
    setLive(false);
    setLoading(true);

    try {
      if (filled.length === 2) {
        setBusyPair(filled);
        const data = await runPair(filled[0], filled[1]);
        navigate("/results", { state: { result: data, drugs: [data.drug1 || filled[0], data.drug2 || filled[1]] } });
      } else {
        // 3 or more drugs: quick overview of every pair; "Full result" opens one pair in detail.
        setPairCount(pairsForFilled);
        const response = await fetch(`${API_URL}/api/predict/multi`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ drugs: filled }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to check these drugs.");
        }
        setMulti(data);
      }
    } catch (err) {
      setError(
        err.message ||
        "Unable to reach the prediction server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
      setBusyPair(null);
      setPairCount(0);
    }
  }

  const showForm = !loading && !multi;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-ink mb-2">
        Check Drug Interactions
      </h1>
      <p className="text-clinical-muted mb-8">
        Choose one way to provide your drugs (up to {MAX_DRUGS}), then run the check. With more than two
        drugs, every pair is checked.
      </p>

      {/* The form stays mounted (hidden) so the chosen input method and entries are kept when results are closed. */}
      <form onSubmit={handlePredict} className={showForm ? "card p-8" : "hidden"}>
        <DrugInputSelector drugs={drugs} onChange={setDrugs} multi minDrugs={2} maxDrugs={MAX_DRUGS} drugList={predictableDrugs} />

        {filled.length > 2 && (
          <p className="text-xs text-clinical-muted mt-4">
            {filled.length} drugs means {pairsForFilled} pairs. Each pair is checked on its own.
          </p>
        )}

        {error && <p className="text-sm text-severity-severe mt-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {filled.length > 2 ? `Check ${pairsForFilled} pairs` : "Predict"} <Send className="w-4 h-4" />
        </button>
      </form>

      {loading && busyPair && (
        <PredictionProgress drugs={busyPair} stage={stage} live={live} />
      )}

      {loading && !busyPair && (
        <div className="card p-8 flex items-center gap-4" role="status" aria-live="polite">
          <Loader2 className="w-6 h-6 animate-spin text-clinical-teal shrink-0" />
          <div>
            <p className="font-medium text-clinical-ink">Checking {pairCount} pairs...</p>
            <p className="text-sm text-clinical-muted">This can take a few seconds.</p>
          </div>
        </div>
      )}

      {!loading && multi && (
        <MultiPairResults result={multi} onOpenPair={openPair} onReset={() => { setMulti(null); setError(""); }} error={error} />
      )}

      <Disclaimer />
    </div>
  );
}