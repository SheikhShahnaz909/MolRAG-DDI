import { Link } from "react-router-dom";
import {
  FlaskConical,
  Info,
  GitCompare,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

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

export default function Home() {
  return (
    <div className="molecular-bg min-h-full">

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 sm:pt-16 pb-12 text-center">

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-clinical-border shadow-sm mb-6">
          <ShieldCheck className="w-4 h-4 text-clinical-teal" />
          <span className="text-sm font-medium text-clinical-teal">
            AI-Powered Medication Safety
          </span>
        </div>

        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-clinical-navy leading-tight">
          Medication Safety,
          <br />
          <span className="text-clinical-teal">
            Made Smarter.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto mt-6 text-base sm:text-lg text-clinical-muted leading-relaxed">
          Check drug interactions, explore medicine information, and compare
          drugs — all in one place with intelligent, evidence-based assistance.
        </p>

      </section>

      {/* Main Features */}
      <section className="max-w-6xl mx-auto px-6 pb-14">

        <div className="grid md:grid-cols-3 gap-6">

          {mainFeatures.map(
            ({ icon: Icon, title, text, button, to }) => (
              <div
                key={title}
                className="card p-7 flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-clinical-teal/10 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-clinical-teal" />
                </div>

                {/* Title */}
                <h2 className="font-display font-semibold text-xl text-clinical-navy mb-3">
                  {title}
                </h2>

                {/* Description */}
                <p className="text-sm text-clinical-muted leading-relaxed flex-1">
                  {text}
                </p>

                {/* Button */}
                <Link
                  to={to}
                  className="btn-primary mt-7 w-fit"
                >
                  {button}
                  <ArrowRight className="w-4 h-4" />
                </Link>

              </div>
            )
          )}

        </div>

      </section>

      {/* Simple CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-16">

        <div className="rounded-2xl bg-clinical-navy px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-6">

          <div className="text-center sm:text-left">
            <h2 className="font-display font-semibold text-2xl text-white">
              Understand your medicines better.
            </h2>

            <p className="text-sm text-slate-300 mt-2">
              Learn how MolRAG-DDI analyzes medicines and explains its results.
            </p>
          </div>

          <Link
            to="/how-it-works"
            className="bg-white text-clinical-navy font-medium px-5 py-3 rounded-lg flex items-center gap-2 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            How It Works
            <ArrowRight className="w-4 h-4" />
          </Link>

        </div>

      </section>

    </div>
  );
}