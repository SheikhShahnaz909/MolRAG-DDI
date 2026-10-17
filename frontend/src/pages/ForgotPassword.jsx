import { AUTH_URL } from "../config";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { AuthInput, AuthMessage, AuthButton, PasswordStrength } from "../components/AuthKit";

const STEPS = ["Email", "Verify", "New password"];

function Stepper({ step }) {
  return (
    <div className="flex items-center mb-7">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                  ${done ? "bg-clinical-teal border-clinical-teal text-white"
                    : active ? "border-clinical-teal text-clinical-teal bg-white"
                    : "border-clinical-border text-clinical-muted bg-white"}`}
              >
                {done ? <Check className="w-4 h-4" /> : n}
              </motion.div>
              <span className={`text-xs ${active ? "text-clinical-navy font-medium" : "text-clinical-muted"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 bg-clinical-border mx-2 mb-5 relative overflow-hidden rounded">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-clinical-teal"
                  initial={false}
                  animate={{ width: step > n ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.25, ease: "easeOut" },
};

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      const response = await fetch(`${AUTH_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send OTP.");
      }

      setNote("OTP sent successfully to your email.");
      setStep(2);
    } catch (err) {
      console.error(err);
      setError("Could not send OTP. Make sure your OTP server is running.");
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
      const response = await fetch(`${AUTH_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
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
      const response = await fetch(`${AUTH_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
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
  async function resetPassword(e) {
    e.preventDefault();

    if (!newPass || !confirmPass) {
      setError("Please enter both password fields.");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }
    if (newPass.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), newPassword: newPass }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to reset password.");
      }

      setNote("Password updated successfully. You can now log in.");
      setDone(true);
    } catch (err) {
      setError(err.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    1: ["Reset password", "We'll email you a 6-digit code."],
    2: ["Check your email", `Enter the code we sent to ${email || "your email"}.`],
    3: ["Set a new password", "Choose something you haven't used before."],
  };
  const [title, subtitle] = done ? ["All set", "Your password has been updated."] : titles[step];

  return (
    <AuthLayout
      back
      heading="Back in three quick steps."
      blurb="Confirm your email, enter the code, and choose a new password."
      title={title}
      subtitle={subtitle}
    >
      <div className="card p-7 sm:p-9">
        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="w-20 h-20 mx-auto rounded-full bg-severity-safeBg flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-severity-safe" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                             transition={{ delay: 0.25, duration: 0.5 }} />
              </svg>
            </motion.div>
            <p className="text-sm text-clinical-muted mt-5">{note}</p>
            <Link to="/login" className="btn-primary w-full justify-center mt-6">Go to Log In</Link>
          </motion.div>
        ) : (
          <>
            <Stepper step={step} />
            <AuthMessage error={error} note={note} />

            <AnimatePresence mode="wait" initial={false}>
              {/* STEP 1 */}
              {step === 1 && (
                <motion.form key="s1" {...slide} onSubmit={requestOtp} className="space-y-5 mt-5">
                  <AuthInput
                    icon={Mail}
                    label="Registered Email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <AuthButton loading={loading} loadingText="Sending...">
                    Send OTP <KeyRound className="w-4 h-4" />
                  </AuthButton>
                </motion.form>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <motion.form key="s2" {...slide} onSubmit={verifyOtp} className="space-y-5 mt-5">
                  <AuthInput
                    icon={ShieldCheck}
                    label="Enter OTP"
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                    className="text-center font-mono text-lg tracking-[0.4em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    right={
                      <button
                        type="button"
                        onClick={resendOtp}
                        disabled={loading}
                        className="text-xs text-clinical-teal font-medium hover:underline disabled:opacity-60"
                      >
                        Resend OTP
                      </button>
                    }
                  />
                  <AuthButton loading={loading} loadingText="Verifying...">Verify OTP</AuthButton>
                </motion.form>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <motion.form key="s3" {...slide} onSubmit={resetPassword} className="space-y-5 mt-5">
                  <AuthInput
                    icon={Lock}
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                  <PasswordStrength value={newPass} />
                  <AuthInput
                    icon={ShieldCheck}
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                  />
                  <AuthButton loading={loading} loadingText="Updating...">Update Password</AuthButton>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {!done && (
        <p className="text-sm text-center text-clinical-muted mt-5">
          Remembered it?{" "}
          <Link to="/login" className="text-clinical-teal font-medium hover:underline">Back to log in</Link>
        </p>
      )}
    </AuthLayout>
  );
}