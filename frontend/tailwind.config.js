/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        clinical: {
          bg: v("bg"),
          navy: v("navy"),          // backgrounds, gradients, table headers
          navyLight: v("navy-light"),
          ink: v("ink"),            // headings and text that used to be navy
          teal: v("teal"),
          tealLight: v("teal-light"),
          text: v("text"),
          muted: v("muted"),
          border: v("border"),
          cloud: v("cloud"),
          mist: v("mist"),
          sky: v("sky"),
        },
        surface: v("surface"),      // cards, inputs, dropdowns
        severity: {
          safe: v("safe"),
          safeBg: v("safe-bg"),
          moderate: v("moderate"),
          moderateBg: v("moderate-bg"),
          severe: v("severe"),
          severeBg: v("severe-bg"),
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
