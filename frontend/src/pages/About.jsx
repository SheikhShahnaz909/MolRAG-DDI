import BackArrow from "../components/BackArrow";

const TEAM = [
  { name: "Rafa", role: "API Integration" },
  { name: "Rehmat Fatima B Kulkarni", role: "Model Development" },
  { name: "Sheikh Shahnaz", role: "Biomedical Retrieval" },
  { name: "Uzma", role: "Frontend UI" },
];

const TOOLS = [
  { tool: "React (via Vite)", purpose: "Project setup / build tooling" },
  { tool: "Tailwind CSS", purpose: "Styling and layout" },
  { tool: "Lucide React", purpose: "Icons" },
];

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <BackArrow />
      <h1 className="font-display text-3xl font-semibold text-clinical-navy mb-4">
        About MolRAG-DDI
      </h1>
      <p className="text-clinical-text leading-relaxed mb-10">
        MolRAG-DDI is a retrieval-augmented framework for drug-drug interaction
        prediction, combining Graph Neural Networks, Large Language Models, and
        Retrieval-Augmented Generation to give healthcare professionals
        accurate, explainable predictions backed by real biomedical evidence
        from sources like DrugBank and PubMed.
      </p>

      <h2 className="font-display font-semibold text-xl text-clinical-navy mb-4">Team</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {TEAM.map((m) => (
          <div key={m.name} className="card p-4">
            <p className="font-medium text-clinical-navy">{m.name}</p>
            <p className="text-sm text-clinical-muted">{m.role}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display font-semibold text-xl text-clinical-navy mb-4">
        Frontend Tools
      </h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-clinical-navy text-white text-left">
              <th className="px-5 py-3 font-medium">Tool</th>
              <th className="px-5 py-3 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((t) => (
              <tr key={t.tool} className="border-t border-clinical-border">
                <td className="px-5 py-3 font-medium text-clinical-navy">{t.tool}</td>
                <td className="px-5 py-3 text-clinical-muted">{t.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
