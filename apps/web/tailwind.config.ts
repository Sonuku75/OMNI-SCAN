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
        // Exact rustic forensic workstation palette
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
          text: "#24170F",
          textLight: "#F0DDB8",
          muted: "#664830",
          danger: "#A9362B",
          warning: "#C97A24",
          success: "#28734A",
          info: "#245C88",

          jelly: {
            success: "#28734A",
            info: "#245C88",
            warning: "#C97A24",
            danger: "#A9362B",
            brass: "#B58A4C",
          },
        },
      },
      boxShadow: {
        "skeuo-raised": "0 8px 24px rgba(18, 11, 7, 0.6), 0 2px 6px rgba(18, 11, 7, 0.4), inset 0 1px 0 rgba(229, 201, 149, 0.35)",
        "skeuo-plate": "inset 0 1px 3px rgba(59, 40, 26, 0.15), inset 0 0 0 1px rgba(240, 221, 184, 0.6), 0 1px 2px rgba(0, 0, 0, 0.1)",
        "skeuo-recessed": "inset 0 3px 6px rgba(36, 23, 15, 0.35), inset 0 1px 2px rgba(36, 23, 15, 0.25), 0 1px 0 rgba(229, 201, 149, 0.5)",
        "skeuo-button": "0 4px 8px rgba(24, 15, 10, 0.35), 0 1px 2px rgba(24, 15, 10, 0.25), inset 0 1px 0 rgba(229, 201, 149, 0.5)",
        "skeuo-button-pressed": "inset 0 2px 5px rgba(24, 15, 10, 0.6), 0 1px 0 rgba(229, 201, 149, 0.4)",
        "skeuo-screen": "inset 0 4px 14px rgba(10, 16, 12, 0.85), inset 0 0 0 1px rgba(40, 115, 74, 0.35), 0 1px 0 rgba(229, 201, 149, 0.4)",
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
