import { AUTH_URL } from "../config";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, User, Mail, Lock, ShieldCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { AuthInput, AuthMessage, AuthButton, PasswordStrength } from "../components/AuthKit";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      navigate("/verify-otp", {
        state: { name: form.name, email: form.email, password: form.password },
      });
    } catch (error) {
      setError(error.message || "Unable to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const matches = form.confirm && form.password === form.confirm;

  return (
    <AuthLayout
      back
      heading="Create your account."
      blurb="Save your predictions, searches, and comparisons in one place."
      title="Create Account"
      subtitle="It takes less than a minute."
    >
      <form onSubmit={handleSubmit} className="card p-7 sm:p-9 space-y-5">
        <AuthInput
          icon={User}
          label="Full Name"
          placeholder="Enter your full name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
        <AuthInput
          icon={Mail}
          label="Email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <AuthInput
          icon={Lock}
          label="Password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <PasswordStrength value={form.password} />
        <AuthInput
          icon={ShieldCheck}
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => update("confirm", e.target.value)}
        />
        {form.confirm && (
          <p className={`text-xs -mt-2 ${matches ? "text-severity-safe" : "text-clinical-muted"}`} aria-live="polite">
            {matches ? "Passwords match" : "Passwords don't match yet"}
          </p>
        )}

        <AuthMessage error={error} />

        <AuthButton loading={loading} loadingText="Sending code...">
          Continue to Email Verification <UserPlus className="w-4 h-4" />
        </AuthButton>

        <p className="text-sm text-center text-clinical-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-clinical-teal font-medium hover:underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}