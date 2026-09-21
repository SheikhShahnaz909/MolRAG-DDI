import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import BackArrow from "../components/BackArrow";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  
async function handleSubmit(e) {
  e.preventDefault();

  if (
    !form.name ||
    !form.email ||
    !form.password ||
    !form.confirm
  ) {
    setError("Please fill in all fields.");
    return;
  }

  if (form.password !== form.confirm) {
    setError("Passwords do not match.");
    return;
  }

  if (form.password.length < 6) {
    setError("Password must contain at least 6 characters.");
    return;
  }

  setError("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/otp/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to send OTP."
      );
    }

    navigate("/verify-otp", {
      state: {
        name: form.name,
        email: form.email,
        password: form.password,
      },
    });

  } catch (error) {
    setError(
      error.message ||
      "Unable to send verification code. Please try again."
    );
  }
}



  return (
    <div className="max-w-md mx-auto px-6 py-12">

      <BackArrow to="/" label="Home" />

      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        Create Account
      </h1>

      <p className="text-clinical-muted mb-8">
        Create an account to save your predictions, searches, and comparisons.
      </p>

      <form
        onSubmit={handleSubmit}
        className="card p-8 space-y-5"
      >

        {/* NAME */}
        <div>
          <label className="block text-sm font-medium text-clinical-text mb-2">
            Full Name
          </label>

          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
            className="w-full px-4 py-3 rounded-lg border border-clinical-border
                       focus:outline-none focus:ring-2 focus:ring-clinical-teal
                       text-sm"
          />
        </div>

        {/* EMAIL */}
        <div>
          <label className="block text-sm font-medium text-clinical-text mb-2">
            Email
          </label>

          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            className="w-full px-4 py-3 rounded-lg border border-clinical-border
                       focus:outline-none focus:ring-2 focus:ring-clinical-teal
                       text-sm"
          />
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-sm font-medium text-clinical-text mb-2">
            Password
          </label>

          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-lg border border-clinical-border
                       focus:outline-none focus:ring-2 focus:ring-clinical-teal
                       text-sm"
          />
        </div>

        {/* CONFIRM PASSWORD */}
        <div>
          <label className="block text-sm font-medium text-clinical-text mb-2">
            Confirm Password
          </label>

          <input
            type="password"
            value={form.confirm}
            onChange={(e) => update("confirm", e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-lg border border-clinical-border
                       focus:outline-none focus:ring-2 focus:ring-clinical-teal
                       text-sm"
          />
        </div>

        {/* ERROR */}
        {error && (
          <p className="text-sm text-severity-severe">
            {error}
          </p>
        )}

        {/* REGISTER */}
        <button
          type="submit"
          className="btn-primary w-full justify-center"
        >
          Continue to Email Verification
          <UserPlus className="w-4 h-4" />
        </button>

        <p className="text-sm text-center text-clinical-muted">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-clinical-teal font-medium"
          >
            Log in
          </Link>
        </p>

      </form>

    </div>
  );
}