import { AUTH_URL } from "../config";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, RefreshCw } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { AuthMessage, AuthButton } from "../components/AuthKit";

export default function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputsRef = useRef([]);

  // Start on the first box.
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  /*
    Countdown for OTP expiry/resend.

    The actual OTP expiration will ultimately be controlled
    by your OTP backend.
  */
  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  function handleChange(index, value) {
    // Allow only one digit.
    const digit = value.replace(/\D/g, "").slice(-1);

    const updated = [...otp];
    updated[index] = digit;

    setOtp(updated);
    setError("");
    setMessage("");

    // Move to next box automatically.
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();

    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (!pasted) return;

    const updated = ["", "", "", "", "", ""];

    pasted.split("").forEach((digit, index) => {
      updated[index] = digit;
    });

    setOtp(updated);

    const nextIndex = Math.min(pasted.length, 5);
    inputsRef.current[nextIndex]?.focus();
  }

  async function handleVerify(e) {
    e.preventDefault();

    const enteredOTP = otp.join("");

    if (enteredOTP.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    if (!email) {
      setError("Email information is missing. Please register again.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${AUTH_URL}/api/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: enteredOTP }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed.");
      }

      if (data.verified) {
        const password = location.state?.password;
        const name = location.state?.name || "";

        if (!password) {
          setError("Registration details are missing. Please register again.");
          setLoading(false);
          return;
        }

        const registerResponse = await fetch(`${AUTH_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok || !registerData.success) {
          throw new Error(registerData.message || "Account creation failed.");
        }

        localStorage.setItem("user", JSON.stringify(registerData.user));
        localStorage.setItem("authToken", registerData.token);
        window.dispatchEvent(new Event("authChanged"));

        // Brief success moment before moving on.
        setVerified(true);
        await new Promise((resolve) => setTimeout(resolve, 1100));
        navigate("/profile", { replace: true });
      }
    } catch (error) {
      setError(error.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (seconds > 0 || !email) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${AUTH_URL}/api/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to resend OTP.");
      }

      setSeconds(60);
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      setMessage("A new OTP has been sent to your email.");
    } catch (error) {
      setError(error.message || "Unable to resend OTP. Please try again.");
    }
  }

  return (
    <AuthLayout
      back
      heading="One last step."
      blurb="Confirm your email to finish creating your account."
      title="Verify your email"
      subtitle={
        <>
          We sent a 6-digit code to{" "}
          <span className="font-medium text-clinical-navy break-all">{email || "your email address"}</span>.
        </>
      }
    >
      <div className="card p-7 sm:p-9">
        {verified ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
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
            <p className="font-display font-semibold text-xl text-clinical-navy mt-5">Email verified</p>
            <p className="text-sm text-clinical-muted mt-1" role="status">Setting up your account...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleVerify}>
            {/* OTP boxes: shake as a group when there's an error */}
            <motion.div
              key={error || "ok"}
              animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex justify-center gap-2 sm:gap-3"
              onPaste={handlePaste}
            >
              {otp.map((digit, index) => (
                <motion.input
                  key={index}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  animate={digit ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  aria-label={`OTP digit ${index + 1}`}
                  className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-xl font-semibold font-mono rounded-xl border
                              text-clinical-navy transition-colors duration-200
                              focus:outline-none focus:border-clinical-teal focus:ring-4 focus:ring-clinical-teal/10
                              ${error ? "border-severity-severe bg-severity-severeBg/40"
                                : digit ? "border-clinical-teal bg-clinical-teal/5"
                                : "border-clinical-border bg-white/70 hover:border-clinical-tealLight/70"}`}
                />
              ))}
            </motion.div>

            <div className="mt-5 space-y-5">
              <AuthMessage error={error} note={message} />

              <AuthButton loading={loading} loadingText="Verifying...">
                Verify OTP <CheckCircle className="w-4 h-4" />
              </AuthButton>
            </div>

            {/* Resend */}
            <div className="text-center mt-6">
              {seconds > 0 ? (
                <p className="text-sm text-clinical-muted">
                  Resend OTP in{" "}
                  <span className="font-mono font-medium text-clinical-navy">
                    00:{String(seconds).padStart(2, "0")}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="inline-flex items-center gap-2 text-sm text-clinical-teal font-medium hover:underline"
                >
                  <RefreshCw className="w-4 h-4" /> Resend OTP
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}