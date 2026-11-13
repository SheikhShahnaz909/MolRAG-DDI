import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FlaskConical, Info, GitCompare, ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";

const mainFeatures = [
  {
    icon: FlaskConical,
    title: "Check Interactions",
    text: "Analyze medicines for potential drug-drug interactions and understand their severity.",
    button: "Start Prediction",
    to: "/prediction",
  },
  {
    icon: Info,
    title: "Drug Information",
    text: "Explore important information about medicines, including uses, warnings, and safety details.",
    button: "Search Medicine",
    to: "/drug-info",
  },
  {
    icon: GitCompare,
    title: "Compare Drugs",
    text: "Compare medicines side-by-side to understand their similarities, differences, and safety considerations.",
    button: "Compare Drugs",
    to: "/compare",
  },
];

const MARQUEE = [
  "Check Interactions",
  "Drug Information",
  "Compare Drugs",
  "Grad-CAM heatmaps",
  "Evidence retrieval",
  "Explainable results",
];

// The one orchestrated moment on the page: the hero sequence.
const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } };
const ease = [0.22, 1, 0.36, 1];
const slide = { hidden: { y: "110%" }, show: { y: 0, transition: { duration: 0.8, ease } } };
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } };

export default function Home() {
  const [featured, ...rest] = mainFeatures;
  const FeaturedIcon = featured.icon;

  return (
    <div className="molecular-bg min-h-full">
      {/* Hero: type-led, full width */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 pt-14 sm:pt-20 pb-14">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div
            variants={rise}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 border border-clinical-border shadow-sm mb-8"
          >
            <ShieldCheck className="w-4 h-4 text-clinical-teal" />
            <span className="text-sm font-medium text-clinical-teal">AI-Powered Medication Safety</span>
          </motion.div>

          <h1 className="font-bold text-5xl sm:text-7xl lg:text-8xl xl:text-[8.5rem] leading-[0.98] text-clinical-ink">
            <span className="block overflow-hidden pb-[0.08em]">
              <motion.span variants={slide} className="block">Medication safety,</motion.span>
            </span>
            <span className="block overflow-hidden pb-[0.08em]">
              <motion.span variants={slide} className="block text-clinical-muted">made smarter.</motion.span>
            </span>
          </h1>

          <motion.div variants={rise} className="mt-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <p className="max-w-xl text-base sm:text-lg text-clinical-muted leading-relaxed">
              Check drug interactions, explore medicine information, and compare drugs — all in one place
              with intelligent, evidence-based assistance.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/prediction" className="btn-primary">
                Check interactions <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/how-it-works" className="btn-ghost">How it works</Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee */}
      <div className="border-y border-clinical-border/80 bg-surface/50 backdrop-blur overflow-hidden py-5" aria-hidden="true">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center shrink-0">
              {MARQUEE.map((t, idx) => (
                <span key={t} className="flex items-center">
                  <span
                    className={`font-display text-3xl sm:text-5xl font-medium tracking-tight px-6 sm:px-8
                                ${idx % 2 ? "text-clinical-teal" : "text-clinical-ink/80"}`}
                  >
                    {t}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-clinical-tealLight/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Features: one lead card, two supporting */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-16">
        <motion.div
          className="grid md:grid-cols-2 gap-5"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="md:col-span-2">
            <Link
              to={featured.to}
              className="group relative flex flex-col md:flex-row md:items-center justify-between gap-8 overflow-hidden
                         rounded-[2rem] p-8 sm:p-10 text-white shadow-lift
                         bg-gradient-to-br from-clinical-navy via-clinical-navyLight to-clinical-teal"
            >
              <div className="max-w-lg">
                <h2 className="font-semibold text-3xl sm:text-4xl">{featured.title}</h2>
                <p className="mt-3 text-slate-200 leading-relaxed">{featured.text}</p>
                <span className="mt-7 inline-flex items-center gap-2 rounded-full bg-white text-clinical-navy
                                 font-medium px-6 py-3 transition-all group-hover:gap-3">
                  {featured.button} <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-full bg-white/10 border border-white/25
                              backdrop-blur flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                <FeaturedIcon className="w-12 h-12 sm:w-16 sm:h-16" strokeWidth={1.5} />
              </div>
            </Link>
          </motion.div>

          {rest.map(({ icon: Icon, title, text, button, to }) => (
            <motion.div key={title} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
              <Link
                to={to}
                className="group card h-full p-7 flex flex-col rounded-[1.75rem] hover:shadow-lift transition-shadow"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-clinical-mist flex items-center justify-center">
                    <Icon className="w-6 h-6 text-clinical-teal" />
                  </div>
                  <span className="w-10 h-10 rounded-full border border-clinical-border flex items-center justify-center
                                   transition-all duration-300 group-hover:bg-clinical-navy group-hover:border-clinical-navy
                                   group-hover:text-white group-hover:rotate-45">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
                <h2 className="font-semibold text-2xl text-clinical-ink mb-2">{title}</h2>
                <p className="text-sm text-clinical-muted leading-relaxed flex-1">{text}</p>
                <span className="mt-6 text-sm font-medium text-clinical-teal">{button}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 pb-16">
        <div className="rounded-[2rem] bg-gradient-to-r from-clinical-navy to-clinical-navyLight px-6 sm:px-10 py-9 sm:py-11
                        flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="font-semibold text-2xl sm:text-3xl text-white">Understand your medicines better.</h2>
            <p className="text-sm text-slate-300 mt-2">
              Learn how MolRAG-DDI analyzes medicines and explains its results.
            </p>
          </div>
          <Link
            to="/how-it-works"
            className="group bg-white text-clinical-navy font-medium px-6 py-3 rounded-full flex items-center gap-2
                       hover:gap-3 transition-all whitespace-nowrap"
          >
            How It Works <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}