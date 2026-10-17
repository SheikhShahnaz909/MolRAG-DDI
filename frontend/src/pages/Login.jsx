import { AUTH_URL } from "../config";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { AuthInput, AuthMessage, AuthButton } from "../components/AuthKit";

// No back arrow here — this is a landing-style page with nowhere meaningful to go back to.
export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password.");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);
      window.dispatchEvent(new Event("authChanged"));
      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Welcome back."
      blurb="Log in to pick up where you left off."
      title="Log in"
      subtitle="Enter your details to continue."
    >
      <form onSubmit={handleSubmit} className="card p-7 sm:p-9 space-y-5">
        <AuthInput
          icon={Mail}
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <AuthInput
          icon={Lock}
          label="Password"
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          right={
            <Link to="/forgot-password" className="text-xs text-clinical-teal font-medium hover:underline">
              Forgot Password?
            </Link>
          }
        />

        <AuthMessage error={error} />

        <AuthButton loading={loading} loadingText="Logging in...">
          Log In <LogIn className="w-4 h-4" />
        </AuthButton>

        <p className="text-sm text-center text-clinical-muted">
          Don't have an account?{" "}
          <Link to="/register" className="text-clinical-teal font-medium hover:underline">Create one</Link>
        </p>
      </form>
    </AuthLayout>
  );
}