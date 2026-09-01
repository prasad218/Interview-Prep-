/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#08090D",
          900: "#0F1117",
          850: "#12141C",
          800: "#171A24",
          700: "#1E222E",
          600: "#2A2F3D",
          500: "#3A4155",
        },
        ink: {
          100: "#F3F4F8",
          300: "#BCC1D1",
          500: "#8B90A6",
        },
        accent: {
          DEFAULT: "#7C5CFF",
          soft: "#9B85FF",
          dim: "#4B3AA8",
          pink: "#F857A6",
          blue: "#4FA6FF",
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
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #7C5CFF 0%, #9B6CFF 45%, #F857A6 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(124,92,255,0.18) 0%, rgba(248,87,166,0.12) 100%)",
        "aurora": "radial-gradient(60% 60% at 20% 15%, rgba(124,92,255,0.20) 0%, rgba(124,92,255,0) 60%), radial-gradient(50% 50% at 85% 25%, rgba(79,166,255,0.16) 0%, rgba(79,166,255,0) 60%), radial-gradient(55% 55% at 60% 90%, rgba(248,87,166,0.14) 0%, rgba(248,87,166,0) 60%)",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset",
        glow: "0 0 0 1px rgba(124,92,255,0.35), 0 8px 30px -8px rgba(124,92,255,0.55)",
        "glow-sm": "0 0 0 1px rgba(124,92,255,0.25), 0 4px 16px -4px rgba(124,92,255,0.4)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.6)",
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
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.25s ease-out",
        pulseDot: "pulseDot 1.2s ease-in-out infinite",
        floatSlow: "floatSlow 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
