import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

// No back arrow here — this is a landing-style page with nowhere meaningful to go back to.
export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }
    // TODO: connect to a real /api/login endpoint that verifies credentials
    // and issues a session/JWT. This currently just navigates forward.
    setError("");
    navigate("/");
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2 text-center">
        MolRAG-DDI
      </h1>
      <p className="text-clinical-muted text-center mb-8">Log in to continue</p>

      <form onSubmit={handleSubmit} className="card p-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-clinical-text mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border border-clinical-border
                       focus:outline-none focus:ring-2 focus:ring-clinical-teal text-sm"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-clinical-text">Password</label>
            <Link to="/forgot-password" className="text-xs text-clinical-teal font-medium">
              Forgot Password?
            </Link>
          </div>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border border-clinical-border
                       focus:outline-none focus:ring-2 focus:ring-clinical-teal text-sm"
          />
        </div>

        {error && <p className="text-sm text-severity-severe">{error}</p>}

        <button type="submit" className="btn-primary w-full justify-center">
          Log In <LogIn className="w-4 h-4" />
        </button>

        <p className="text-sm text-center text-clinical-muted">
          Don't have an account?{" "}
          <Link to="/register" className="text-clinical-teal font-medium">Create one</Link>
        </p>
      </form>
    </div>
  );
}
