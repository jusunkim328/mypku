import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary - Sage Green (건강, 신뢰)
        primary: {
          50: "var(--pku-primary-50)",
          100: "var(--pku-primary-100)",
          200: "var(--pku-primary-200)",
          300: "var(--pku-primary-300)",
          400: "var(--pku-primary-400)",
          500: "var(--pku-primary-500)",
          600: "var(--pku-primary-600)",
          700: "var(--pku-primary-700)",
          DEFAULT: "var(--pku-primary-500)",
        },
        // Accent - Warm Coral (활력, 따뜻함)
        accent: {
          50: "var(--pku-accent-50)",
          100: "var(--pku-accent-100)",
          200: "var(--pku-accent-200)",
          300: "var(--pku-accent-300)",
          400: "var(--pku-accent-400)",
          500: "var(--pku-accent-500)",
          600: "var(--pku-accent-600)",
          700: "var(--pku-accent-700)",
          DEFAULT: "var(--pku-accent-500)",
        },
        // Surface & Background
        surface: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(0, 0, 0, 0.06)",
        "soft-lg": "0 4px 16px rgba(0, 0, 0, 0.08)",
        "elevated": "0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.04), 0 12px 24px rgba(0, 0, 0, 0.06)",
        "glow-primary": "0 0 20px rgba(34, 197, 94, 0.3)",
        "glow-accent": "0 0 20px rgba(249, 115, 22, 0.3)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      zIndex: {
        nav: "40",
        banner: "55",
        toast: "50",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "fade-in-up": "fadeInUp 0.3s ease-out",
        "fade-in-down": "fadeInDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "bounce-in": "bounceIn 0.3s ease-out",
        "flame": "flame 1s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
