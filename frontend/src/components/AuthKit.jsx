import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

// Input with a leading icon, animated focus state and (for passwords) a show/hide toggle.
export function AuthInput({ icon: Icon, label, type = "text", right, className = "", ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPw = type === "password";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="text-sm font-medium text-clinical-text">{label}</label>
        {right}
      </div>
      <div className="group relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-clinical-muted pointer-events-none
                           transition-colors group-focus-within:text-clinical-teal" />
        )}
        <input
          id={id}
          type={isPw && show ? "text" : type}
          {...props}
          className={`w-full ${Icon ? "pl-11" : "pl-4"} ${isPw ? "pr-11" : "pr-4"} py-3.5 rounded-xl text-sm
                      border border-clinical-border bg-white/70 placeholder:text-slate-400
                      transition-all duration-200 hover:border-clinical-tealLight/70
                      focus:outline-none focus:bg-white focus:border-clinical-teal focus:ring-4 focus:ring-clinical-teal/10
                      ${className}`}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-clinical-muted
                       hover:text-clinical-teal hover:bg-clinical-mist transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// Advisory strength meter (the form itself still only requires 8+ characters).
export function PasswordStrength({ value }) {
  if (!value) return null;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const meta = [
    { l: "Too weak", c: "#DC2626" },
    { l: "Weak", c: "#DC2626" },
    { l: "Fair", c: "#D97706" },
    { l: "Good", c: "#1F9D55" },
    { l: "Strong", c: "#1F9D55" },
  ][score];

  return (
    <div className="-mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            initial={false}
            animate={{ backgroundColor: i < score ? meta.c : "#E2E8F0" }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
      <p className="text-xs mt-1.5" style={{ color: meta.c }}>
        Password strength: {meta.l}
      </p>
    </div>
  );
}

// Error shakes in once; success slides in.
export function AuthMessage({ error, note }) {
  return (
    <AnimatePresence mode="popLayout">
      {error && (
        <motion.div
          key={error}
          role="alert"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start gap-2 rounded-xl bg-severity-severeBg text-severity-severe text-sm px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </motion.div>
      )}
      {!error && note && (
        <motion.div
          key={note}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-start gap-2 rounded-xl bg-severity-safeBg text-severity-safe text-sm px-4 py-3"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {note}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AuthButton({ loading, loadingText = "Please wait...", children, ...props }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      {...props}
    >
      {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> {loadingText}</>) : children}
    </button>
  );
}