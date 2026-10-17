import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const STATES = [
  { label: "Safe", color: "#1F9D55" },
  { label: "Moderate", color: "#D97706" },
  { label: "Severe", color: "#DC2626" },
];

function Molecule({ cx, cy, tint, delay, reduce }) {
  const v = (k, r = 46) => {
    const a = (Math.PI / 180) * (60 * k - 30);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ring = [0, 1, 2, 3, 4, 5].map((k) => v(k).join(",")).join(" ");

  return (
    <motion.g
      animate={reduce ? undefined : { y: [0, -9, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {[0, 2, 4].map((k) => {
        const [x1, y1] = v(k);
        const [x2, y2] = v(k, 82);
        return (
          <g key={k}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tint} strokeWidth="2" />
            <circle cx={x2} cy={y2} r="8" fill="white" stroke={tint} strokeWidth="2" />
          </g>
        );
      })}
      <polygon points={ring} fill="rgba(255,255,255,0.7)" stroke="#0F2A43" strokeWidth="2.5" strokeLinejoin="round" />
      {[1, 3, 5].map((k) => {
        const [x, y] = v(k);
        return <circle key={k} cx={x} cy={y} r="6" fill={tint} />;
      })}
    </motion.g>
  );
}

// Illustrative only: two molecules, a bond that carries a pulse, and a
// severity chip cycling through the three outcomes the system can return.
export default function MoleculeHero() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(1);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % STATES.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  const s = STATES[i];

  return (
    <div>
      <div className="relative rounded-[2rem] overflow-hidden border border-clinical-border shadow-lift
                      bg-gradient-to-br from-white via-clinical-sky to-clinical-mist">
        <svg viewBox="0 0 520 420" className="w-full h-auto block" role="img"
             aria-label="Illustration of two molecules and an interaction between them">
          <Molecule cx={150} cy={190} tint="#0E7C86" delay={0} reduce={reduce} />
          <Molecule cx={370} cy={190} tint="#1B3B5C" delay={1.2} reduce={reduce} />

          <motion.line
            x1="192" y1="190" x2="328" y2="190"
            strokeWidth="3" strokeDasharray="6 8" strokeLinecap="round"
            animate={{ stroke: s.color, ...(reduce ? {} : { strokeDashoffset: [0, -28] }) }}
            transition={{ stroke: { duration: 0.5 }, strokeDashoffset: { duration: 1.4, repeat: Infinity, ease: "linear" } }}
          />
          {!reduce && (
            <motion.circle
              r="6" cy="190" fill={s.color}
              animate={{ cx: [192, 328], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </svg>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full
                        bg-white/90 backdrop-blur border border-clinical-border px-4 py-2 shadow-glass whitespace-nowrap">
          <span className="font-mono text-xs text-clinical-muted">Drug A × Drug B</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={s.label}
              role="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 font-display font-semibold text-sm"
              style={{ color: s.color }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <p className="text-xs text-clinical-muted mt-3 text-center">
        Illustration of the three severity levels. Not a real prediction.
      </p>
    </div>
  );
}