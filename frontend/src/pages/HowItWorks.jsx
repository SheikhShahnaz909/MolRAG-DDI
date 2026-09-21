import { LogIn, Type, Repeat, FlaskConical, BookOpenText, ShieldCheck, MonitorCheck } from "lucide-react";
import BackArrow from "../components/BackArrow";

const STEPS = [
  { icon: LogIn, title: "Login / Register", text: "Create an account or log in to get started." },
  { icon: Type, title: "Provide Your Drugs", text: "Enter drug names, upload a medicine image, or upload a prescription — pick whichever is easiest." },
  { icon: Repeat, title: "Identify & Normalize", text: "Medicines are identified and brand names normalized to active ingredients." },
  { icon: FlaskConical, title: "Analyse Interactions", text: "The system analyses molecular structures for potential interactions." },
  { icon: BookOpenText, title: "Retrieve Evidence", text: "Supporting biomedical evidence is pulled from trusted sources like DrugBank and PubMed." },
  { icon: ShieldCheck, title: "Generate Prediction", text: "An interaction severity prediction (Safe / Moderate / Severe) is generated." },
  { icon: MonitorCheck, title: "View Results", text: "Severity, explanation, and supporting drug information are displayed clearly." },
];

export default function HowItWorks() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-2">
        How Our Website Works
      </h1>
      <p className="text-clinical-muted mb-10">From login to interaction result, step by step.</p>

      <div className="space-y-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-severity-safeBg flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-clinical-teal" />
            </div>
            <div>
              <p className="text-xs font-mono text-clinical-muted mb-1">Step {i + 1}</p>
              <h3 className="font-display font-semibold text-clinical-navy">{title}</h3>
              <p className="text-sm text-clinical-muted mt-1">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
