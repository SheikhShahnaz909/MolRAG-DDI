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
          // new soft surface tones (blue-gray, from the reference)
          cloud: "#F1F4F8",
          mist: "#E8EEF4",
          sky: "#DCE8F2",
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
      boxShadow: {
        glass: "0 8px 30px -14px rgba(15,42,67,0.22)",
        lift: "0 22px 44px -22px rgba(15,42,67,0.4)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 45s linear infinite",
      },
    },
  },
  plugins: [],
};