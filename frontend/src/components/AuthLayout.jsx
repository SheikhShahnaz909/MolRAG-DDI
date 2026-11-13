import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { FlaskConical, History, ShieldCheck } from "lucide-react";
import BackArrow from "./BackArrow";
import ThemeToggle from "./ThemeToggle";

const PERKS = [
  { icon: FlaskConical, text: "Save every interaction check you run" },
  { icon: History, text: "Revisit past searches and comparisons" },
  { icon: ShieldCheck, text: "Evidence retrieved for every pair" },
];

// Split screen: a brand panel whose light follows the cursor, and the form on the right.
export default function AuthLayout({ heading, blurb, title, subtitle, back = false, children }) {
  const mx = useMotionValue(260);
  const my = useMotionValue(200);
  const sx = useSpring(mx, { stiffness: 70, damping: 18 });
  const sy = useSpring(my, { stiffness: 70, damping: 18 });
  const glow = useMotionTemplate`radial-gradient(480px circle at ${sx}px ${sy}px, rgba(255,255,255,0.20), transparent 60%)`;

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 lg:py-5 grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:min-h-[calc(100vh-7rem)]">
      {/* Brand panel */}
      <aside
        onMouseMove={onMove}
        className="relative hidden lg:flex flex-col justify-between overflow-hidden rounded-[2rem] p-10 xl:p-14 text-white
                   bg-gradient-to-br from-clinical-navy via-clinical-navyLight to-clinical-teal"
      >
        <div className="absolute inset-0 opacity-[0.07]"
             style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <motion.div
          className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-clinical-tealLight/40 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 24, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-28 -left-20 w-96 h-96 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, 36, 0], y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div className="absolute inset-0 pointer-events-none" style={{ background: glow }} />

        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lift">
            <img src="/logo.png" alt="MolRAG-DDI logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-semibold text-2xl">MolRAG-DDI</span>
        </div>

        <div className="relative">
          <h2 className="font-bold text-4xl xl:text-5xl leading-[1.05] max-w-md">{heading}</h2>
          <p className="mt-4 text-slate-200 max-w-sm leading-relaxed">{blurb}</p>

          <ul className="mt-9 space-y-3">
            {PERKS.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.5, ease: "easeOut" }}
                whileHover={{ x: 6 }}
                className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur px-4 py-3 max-w-sm"
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm">{text}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-300 max-w-sm">
          For education and decision support only. It does not replace professional medical advice.
        </p>
      </aside>

      {/* Form side */}
      <section className="relative flex items-center justify-center py-6">
        <div className="absolute top-0 right-0">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          {back && <BackArrow />}
          <img src="/logo.png" alt="MolRAG-DDI logo" className="lg:hidden w-16 h-16 object-contain mb-4" />
          <h1 className="font-semibold text-3xl sm:text-4xl text-clinical-ink">{title}</h1>
          {subtitle && <p className="text-clinical-muted mt-2 mb-7">{subtitle}</p>}
          {children}
        </div>
      </section>
    </div>
  );
}