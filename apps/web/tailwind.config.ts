import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        omni: {
          bg: "#090D14",
          surface: "#111824",
          surfaceHover: "#172033",
          border: "#273244",
          borderHover: "#3B4A63",
          primary: "#65E6D3",
          primaryHover: "#52D1BE",
          secondary: "#9E91FF",
          secondaryHover: "#8B7DFF",
          text: "#EDF3FF",
          muted: "#9AA8BC",
          danger: "#FF6B6B",
          warning: "#FDCB6E",
          success: "#00B894",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
