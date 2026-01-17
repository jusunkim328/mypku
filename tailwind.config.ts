import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/konsta/react/**/*.{js,ts,jsx,tsx,mjs}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // PKU 테마 색상
        pku: {
          primary: "#6366f1",    // 인디고
          secondary: "#8b5cf6",  // 바이올렛
          warning: "#f59e0b",    // 경고 (페닐알라닌 주의)
          danger: "#ef4444",     // 위험 (한도 초과)
          success: "#10b981",    // 안전
        },
        // Konsta 기본 색상
        "ios-light-surface": "#efeff4",
        "ios-dark-surface": "#000000",
        primary: "#007aff",
      },
    },
  },
  plugins: [],
};

export default config;
