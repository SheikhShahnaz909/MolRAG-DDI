import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import BackArrow from "../components/BackArrow";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // -------------------------
  // SEND OTP
  // -------------------------
  async function requestOtp(e) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your registered email.");
      return;
    }

    setError("");
    setNote("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send OTP.");
      }

      setNote("OTP sent successfully to your email.");
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(
        "Could not send OTP. Make sure your OTP server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // -------------------------
  // VERIFY OTP
  // -------------------------
  async function verifyOtp(e) {
    e.preventDefault();

    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setError("");
    setNote("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP.");
      }

      setNote("Email verified successfully.");
      setStep(3);
    } catch (err) {
      console.error(err);
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------
  // RESEND OTP
  // -------------------------
  async function resendOtp() {
    setError("");
    setNote("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to resend OTP.");
      }

      setNote("A new OTP has been sent to your email.");
      setOtp("");
    } catch (err) {
      console.error(err);
      setError("Could not resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------
  // RESET PASSWORD
  // -------------------------
  function resetPassword(e) {
    e.preventDefault();

    if (!newPass || !confirmPass) {
      setError("Please enter both password fields.");
      return;
    }

    if (newPass !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }

    setError("");

    /*
      IMPORTANT:
      Your OTP backend only verifies the email.
      Your friend's main backend must provide an API
      to actually update the password in MongoDB.

      For now, we will NOT pretend that the password
      has been saved.
    */

    setNote(
      "Email verified. Password update needs to be connected to the main backend."
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <BackArrow />

      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-8">
        Reset Password
      </h1>

      <div className="card p-8 space-y-5">

        {/* SUCCESS / INFORMATION MESSAGE */}
        {note && (
          <p className="text-sm text-severity-moderate">
            {note}
          </p>
        )}

        {/* ERROR */}
        {error && (
          <p className="text-sm text-severity-severe">
            {error}
          </p>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-clinical-text mb-2">
                Registered Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full px-4 py-3 rounded-lg border border-clinical-border
                           focus:outline-none focus:ring-2 focus:ring-clinical-teal text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? "Sending..." : "Send OTP"}
              {!loading && <KeyRound className="w-4 h-4" />}
            </button>

          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={verifyOtp} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-clinical-text mb-2">
                Enter OTP
              </label>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg border border-clinical-border
                           focus:outline-none focus:ring-2 focus:ring-clinical-teal
                           text-sm font-mono"
              />
            </div>

            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="text-xs text-clinical-teal font-medium"
            >
              {loading ? "Sending..." : "Resend OTP"}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={resetPassword} className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-clinical-text mb-2">
                New Password
              </label>

              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-3 rounded-lg border border-clinical-border
                           focus:outline-none focus:ring-2 focus:ring-clinical-teal text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-clinical-text mb-2">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 rounded-lg border border-clinical-border
                           focus:outline-none focus:ring-2 focus:ring-clinical-teal text-sm"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center"
            >
              Update Password
            </button>

          </form>
        )}

      </div>
    </div>
  );
}