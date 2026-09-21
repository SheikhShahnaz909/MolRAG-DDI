import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Mail, RefreshCw } from "lucide-react";

export default function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef([]);

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

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

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
    const response = await fetch(
      "http://localhost:5000/api/otp/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: enteredOTP,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "OTP verification failed."
      );
    }

    if (data.verified) {
      // Temporary frontend login state.
      // This will later be replaced by your friend's
      // real authentication response.
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: location.state?.name || "",
          email,
        })
      );

      localStorage.setItem(
        "authToken",
        "email-verified"
      );
      window.dispatchEvent(new Event("authChanged"));
      navigate("/profile", {
        replace: true,
      });
    }

  } catch (error) {
    setError(
      error.message ||
      "OTP verification failed. Please try again."
    );
  } finally {
    setLoading(false);
  }
}

async function handleResend() {
  if (seconds > 0 || !email) return;

  setError("");
  setMessage("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/otp/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to resend OTP."
      );
    }

    setSeconds(60);
    setOtp(["", "", "", "", "", ""]);

    inputsRef.current[0]?.focus();

    setMessage("A new OTP has been sent to your email.");

  } catch (error) {
    setError(
      error.message ||
      "Unable to resend OTP. Please try again."
    );
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-clinical-bg">

      <div className="w-full max-w-md">

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/register")}
          className="inline-flex items-center gap-1.5 text-clinical-navy
                     hover:text-clinical-teal font-medium text-sm mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="card p-8 sm:p-10">

          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-clinical-teal/10
                          flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-clinical-teal" />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-semibold
                         text-clinical-navy text-center">
            Verify Your Email
          </h1>

          <p className="text-sm text-clinical-muted text-center mt-3">
            We sent a 6-digit verification code to
          </p>

          <p className="text-sm font-medium text-clinical-navy text-center mt-1 break-all">
            {email || "your email address"}
          </p>

          {/* OTP */}
          <form onSubmit={handleVerify}>

            <div
              className="flex justify-center gap-2 sm:gap-3 mt-8"
              onPaste={handlePaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  value={digit}
                  onChange={(e) =>
                    handleChange(index, e.target.value)
                  }
                  onKeyDown={(e) =>
                    handleKeyDown(index, e)
                  }
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`OTP digit ${index + 1}`}
                  className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg
                             font-semibold rounded-lg border
                             border-clinical-border
                             text-clinical-navy
                             focus:outline-none focus:ring-2
                             focus:ring-clinical-teal"
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-severity-severe text-center mt-4">
                {error}
              </p>
            )}

            {message && (
              <p className="text-sm text-severity-safe text-center mt-4">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-7
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Verifying..."
              ) : (
                <>
                  Verify OTP
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Resend */}
          <div className="text-center mt-6">

            {seconds > 0 ? (
              <p className="text-sm text-clinical-muted">
                Resend OTP in{" "}
                <span className="font-medium text-clinical-navy">
                  00:{String(seconds).padStart(2, "0")}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="inline-flex items-center gap-2 text-sm
                           text-clinical-teal font-medium hover:underline"
              >
                <RefreshCw className="w-4 h-4" />
                Resend OTP
              </button>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}