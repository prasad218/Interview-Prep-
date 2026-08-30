/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0B0D12",
          900: "#12141B",
          800: "#171A21",
          700: "#1E222B",
          600: "#2A2F3A",
          500: "#3A4050",
        },
        ink: {
          100: "#ECEDF1",
          300: "#B8BCC8",
          500: "#8B90A0",
        },
        accent: {
          DEFAULT: "#6C5CE7",
          soft: "#8A7CF0",
          dim: "#4A3FA0",
        },
        signal: {
          teal: "#2DD9C4",
          amber: "#F0A93E",
          rose: "#F0567A",
        },
      },
      fontFamily: {
        display: ["Manrope", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 0.3 },
          "50%": { opacity: 1 },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
        pulseDot: "pulseDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
