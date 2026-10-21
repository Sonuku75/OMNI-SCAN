import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // High-fidelity wooden skeuomorphic workstation palette
        walnut: {
          dark: "#24170F",
          DEFAULT: "#3B281A",
          deep: "#160E09",
          light: "#4A3423",
          border: "#4E3523",
        },
        forest: {
          DEFAULT: "#173D2D",
          highlight: "#315440",
          dark: "#102B20",
          vivid: "#28734A",
          deep: "#0B1E16",
        },
        parchment: {
          DEFAULT: "#D8B98A",
          ivory: "#F0DDB8",
          light: "#FAF1DF",
          muted: "#C9A775",
          dark: "#B89664",
        },
        brass: {
          DEFAULT: "#B58A4C",
          highlight: "#E5C995",
          dark: "#7A5B2E",
          shadow: "#4E3719",
          border: "#9E763B",
        },
        ink: {
          primary: "#302013",
          secondary: "#604A34",
          muted: "#8A6D50",
          subtle: "#A88B6F",
        },
        status: {
          success: "#28734A",
          info: "#245C88",
          warning: "#C97A24",
          error: "#A9362B",
        },
        // Backward-compatibility aliases
        rust: {
          darkWalnut: "#24170F",
          walnutWood: "#3B281A",
          antiqueParchment: "#D8B98A",
          warmIvory: "#F0DDB8",
          antiqueBrass: "#B58A4C",
          brassHighlight: "#E5C995",
          forestGreen: "#173D2D",
          signalGreen: "#28734A",
          steelBlue: "#245C88",
          alertRed: "#A9362B",
        },
        omni: {
          bg: "#24170F",
          shell: "#24170F",
          topbar: "#3B281A",
          surface: "#F0DDB8",
          surfaceHover: "#E5D0A7",
          surfaceMuted: "#D8B98A",
          border: "#B58A4C",
          borderHover: "#E5C995",
          primary: "#173D2D",
          primaryHover: "#1F4E3A",
          secondary: "#3B281A",
          secondaryHover: "#4A3423",
          text: "#302013",
          textLight: "#F0DDB8",
          muted: "#604A34",
          danger: "#A9362B",
          warning: "#C97A24",
          success: "#28734A",
          info: "#245C88",
        },
      },
      boxShadow: {
        "skeuo-raised":
          "0 10px 28px rgba(16, 10, 6, 0.7), 0 3px 8px rgba(16, 10, 6, 0.45), inset 0 1px 0 rgba(229, 201, 149, 0.45)",
        "skeuo-plate":
          "inset 0 1px 2px rgba(255, 255, 255, 0.8), inset 0 -1px 2px rgba(59, 40, 26, 0.15), 0 2px 5px rgba(16, 10, 6, 0.25)",
        "skeuo-recessed":
          "inset 0 3px 8px rgba(26, 16, 10, 0.4), inset 0 1px 3px rgba(26, 16, 10, 0.25), 0 1px 0 rgba(229, 201, 149, 0.7)",
        "skeuo-recessed-deep":
          "inset 0 5px 12px rgba(16, 10, 6, 0.55), inset 0 2px 4px rgba(16, 10, 6, 0.35), 0 1px 0 rgba(229, 201, 149, 0.6)",
        "skeuo-button":
          "0 4px 8px rgba(16, 10, 6, 0.4), 0 1px 2px rgba(16, 10, 6, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.45)",
        "skeuo-button-pressed":
          "inset 0 3px 6px rgba(16, 10, 6, 0.65), 0 1px 0 rgba(229, 201, 149, 0.3)",
        "skeuo-screen":
          "inset 0 5px 16px rgba(0, 0, 0, 0.95), inset 0 0 0 1px rgba(40, 115, 74, 0.4), 0 1px 0 rgba(229, 201, 149, 0.45)",
        "skeuo-brass-bevel":
          "0 2px 4px rgba(18, 11, 7, 0.4), inset 0 1px 0 rgba(229, 201, 149, 0.65), inset 0 -1px 0 rgba(78, 55, 25, 0.7)",
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
