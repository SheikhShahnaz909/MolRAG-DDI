import { motion } from "framer-motion";
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
  { tool: "Framer Motion", purpose: "Animations and page transitions" },
];

const initialsOf = (name) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } } };

export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
      <BackArrow />

      {/* Intro */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center mb-14">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-clinical-ink mb-5">
            About MolRAG-DDI
          </h1>
          <p className="text-clinical-text leading-relaxed max-w-3xl text-lg">
            MolRAG-DDI is a retrieval-augmented framework that predicts how severe a drug-drug
            interaction is (Safe, Moderate or Severe). It reads the molecule images and chemical
            properties of both drugs with a ResNet50-based network and an ordinal classifier, shows
            Grad-CAM heatmaps of what influenced the result, retrieves matching evidence from an
            interaction dataset, and uses a small language model to write the explanation. It is a
            student project for education and decision support, not medical advice.
          </p>
        </div>
        <img src="/logo.png" alt="MolRAG-DDI logo" className="hidden lg:block w-48 h-48 object-contain" />
      </div>

      {/* Team */}
      <h2 className="font-display font-semibold text-2xl text-clinical-ink mb-5">Team</h2>
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14"
      >
        {TEAM.map((m) => (
          <motion.div
            key={m.name}
            variants={item}
            whileHover={{ y: -4 }}
            className="card p-6 hover:shadow-lift transition-shadow"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-clinical-navy to-clinical-teal text-white
                            flex items-center justify-center font-display font-semibold text-lg mb-4">
              {initialsOf(m.name)}
            </div>
            <p className="font-medium text-clinical-ink">{m.name}</p>
            <p className="text-sm text-clinical-muted mt-0.5">{m.role}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tools */}
      <h2 className="font-display font-semibold text-2xl text-clinical-ink mb-5">Frontend Tools</h2>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="card overflow-hidden"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-clinical-navy text-white text-left">
              <th className="px-5 py-3 font-medium">Tool</th>
              <th className="px-5 py-3 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((t) => (
              <tr key={t.tool} className="border-t border-clinical-border hover:bg-clinical-cloud/70 transition-colors">
                <td className="px-5 py-3 font-medium text-clinical-ink">{t.tool}</td>
                <td className="px-5 py-3 text-clinical-muted">{t.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}