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
      fontSize: {
        xs: ['calc(0.75rem * var(--font-scale, 1))', { lineHeight: 'calc(1rem * var(--font-scale, 1))' }],
        sm: ['calc(0.875rem * var(--font-scale, 1))', { lineHeight: 'calc(1.25rem * var(--font-scale, 1))' }],
        base: ['calc(1rem * var(--font-scale, 1))', { lineHeight: 'calc(1.5rem * var(--font-scale, 1))' }],
        lg: ['calc(1.125rem * var(--font-scale, 1))', { lineHeight: 'calc(1.75rem * var(--font-scale, 1))' }],
        xl: ['calc(1.25rem * var(--font-scale, 1))', { lineHeight: 'calc(1.75rem * var(--font-scale, 1))' }],
        '2xl': ['calc(1.5rem * var(--font-scale, 1))', { lineHeight: 'calc(2rem * var(--font-scale, 1))' }],
        '3xl': ['calc(1.875rem * var(--font-scale, 1))', { lineHeight: 'calc(2.25rem * var(--font-scale, 1))' }],
        '4xl': ['calc(2.25rem * var(--font-scale, 1))', { lineHeight: 'calc(2.5rem * var(--font-scale, 1))' }],
        '5xl': ['calc(3rem * var(--font-scale, 1))', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};
export default config;
