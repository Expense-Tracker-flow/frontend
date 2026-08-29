import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        "surface-border": "var(--surface-border)",
        primary: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          DEFAULT: "#4F46E5",
        },
        emerald: {
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        rose: {
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
