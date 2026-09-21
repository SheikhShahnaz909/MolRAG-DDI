/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        clinical: {
          bg: "#F7F9FB",
          navy: "#0F2A43",
          navyLight: "#1B3B5C",
          teal: "#0E7C86",
          tealLight: "#12A2AE",
          text: "#1E293B",
          muted: "#64748B",
          border: "#E2E8F0",
        },
        severity: {
          safe: "#1F9D55",
          safeBg: "#E7F7EE",
          moderate: "#D97706",
          moderateBg: "#FEF3E2",
          severe: "#DC2626",
          severeBg: "#FDECEC",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
