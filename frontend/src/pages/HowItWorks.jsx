import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { LogIn, Type, Repeat, FlaskConical, BookOpenText, ShieldCheck, MonitorCheck, ArrowRight } from "lucide-react";
import BackArrow from "../components/BackArrow";

const STEPS = [
  { icon: LogIn, title: "Login / Register", text: "Create an account or log in to get started." },
  { icon: Type, title: "Provide Your Drugs", text: "Type drug names or upload a photo of a medicine, whichever is easiest. You can check up to six drugs at once." },
  { icon: Repeat, title: "Identify & Normalize", text: "Medicines are identified and brand names normalized to active ingredients." },
  { icon: FlaskConical, title: "Analyse Interactions", text: "The model analyses the molecule images and chemical properties of both drugs." },
  { icon: BookOpenText, title: "Retrieve Evidence", text: "Supporting evidence for the pair is retrieved from the project's interaction-evidence dataset." },
  { icon: ShieldCheck, title: "Generate Prediction", text: "An interaction severity prediction (Safe / Moderate / Severe) is generated." },
  { icon: MonitorCheck, title: "View Results", text: "Severity, explanation, and supporting drug information are displayed clearly." },
];

export default function HowItWorks() {
  const listRef = useRef(null);
  // The teal line fills as you scroll down the steps.
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 65%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-clinical-ink mb-3">
        How Our Website Works
      </h1>
      <p className="text-clinical-muted text-lg mb-14">From login to interaction result, step by step.</p>

      <ol ref={listRef} className="relative space-y-8 lg:space-y-10">
        {/* track + scroll-driven fill */}
        <div className="absolute top-0 bottom-0 left-5 lg:left-1/2 w-0.5 -translate-x-1/2 bg-clinical-border" aria-hidden="true">
          <motion.div
            className="w-full h-full origin-top bg-gradient-to-b from-clinical-navy to-clinical-teal"
            style={{ scaleY: fill }}
          />
        </div>

        {STEPS.map(({ icon: Icon, title, text }, i) => {
          const right = i % 2 === 1;
          return (
            <li key={title} className="relative pl-16 lg:pl-0 lg:grid lg:grid-cols-2 lg:gap-x-24">
              {/* node lights up when it reaches the middle of the screen */}
              <div className="absolute left-0 lg:left-1/2 lg:-translate-x-1/2 top-5 z-10">
                <motion.div
                  whileInView={{ backgroundColor: "#0E7C86", color: "#ffffff", borderColor: "#0E7C86", scale: [1, 1.2, 1] }}
                  viewport={{ once: true, margin: "-45% 0px -45% 0px" }}
                  transition={{ duration: 0.4 }}
                  className="w-10 h-10 rounded-full border-2 bg-surface text-clinical-muted border-clinical-border flex items-center justify-center"
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: right ? 32 : -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className={`card p-6 ${right ? "lg:col-start-2" : "lg:col-start-1"}`}
              >
                <p className="text-xs font-mono text-clinical-muted mb-1">Step {i + 1}</p>
                <h3 className="font-display font-semibold text-xl text-clinical-ink">{title}</h3>
                <p className="text-sm text-clinical-muted mt-2 leading-relaxed">{text}</p>
              </motion.div>
            </li>
          );
        })}
      </ol>

      <div className="mt-14 flex justify-center">
        <Link to="/prediction" className="btn-primary">
          Try an interaction check <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}