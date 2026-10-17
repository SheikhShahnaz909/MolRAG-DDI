import BackArrow from "../components/BackArrow";

// NOTE: roles below are carried over from the previous version of this page.
// Please confirm they match what each member actually worked on.
const TEAM = [
  { name: "Rafa", role: "API Integration" },
  { name: "Rehmat Fatima B Kulkarni", role: "Model Development" },
  { name: "Sheikh Shahnaz", role: "Biomedical Retrieval" },
  { name: "Uzma", role: "Frontend UI" },
];

const TECH = [
  { layer: "Prediction model", tool: "PyTorch, ResNet50 fusion CNN, CORAL ordinal head", purpose: "Predicts Safe / Moderate / Severe from molecular images and chemical features" },
  { layer: "Chemistry", tool: "RDKit", purpose: "Molecule images, Lipinski descriptors and Morgan fingerprints" },
  { layer: "Explainability", tool: "Grad-CAM", purpose: "Heatmaps showing influential regions of each molecule" },
  { layer: "Evidence and explanation", tool: "Sentence-BERT, FAISS, FLAN-T5", purpose: "Retrieves interaction evidence and writes a plain-language explanation" },
  { layer: "Drug identification", tool: "EasyOCR, RapidFuzz", purpose: "Reads medicine photos and prescriptions and matches drug names" },
  { layer: "Backend", tool: "FastAPI, Node.js (Express)", purpose: "Prediction APIs; OTP, login and password reset" },
  { layer: "Database", tool: "MongoDB Atlas", purpose: "Users, drug catalogue, evidence and prediction history" },
  { layer: "Frontend", tool: "React (Vite), Tailwind CSS, Lucide React", purpose: "Responsive web interface" },
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
        prediction. It turns each drug into a molecular image with chemical
        descriptors, predicts the severity of an interaction as Safe, Moderate or
        Severe, and shows which parts of the molecules influenced the result.
        The prediction is supported by evidence retrieved from a large collection
        of interaction records and by a plain-language explanation. It is meant
        for education and decision support and does not replace professional
        medical advice.
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
        Technology
      </h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="bg-clinical-navy text-white text-left">
              <th className="px-5 py-3 font-medium">Layer</th>
              <th className="px-5 py-3 font-medium">Tools</th>
              <th className="px-5 py-3 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {TECH.map((t) => (
              <tr key={t.layer} className="border-t border-clinical-border align-top">
                <td className="px-5 py-3 font-medium text-clinical-navy">{t.layer}</td>
                <td className="px-5 py-3 text-clinical-text">{t.tool}</td>
                <td className="px-5 py-3 text-clinical-muted">{t.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}