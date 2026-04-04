/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        marker: ["Permanent Marker", "cursive"],
        tech: ["Orbitron", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 3s ease-in-out infinite",
        shake: "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
        "pop-in": "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "fade-out-up": "fadeOutUp 1.2s ease-out forwards",
        "glitch-snap": "glitchSnap 0.3s linear forwards",
        "scanline-wipe": "scanlineWipe 0.4s linear forwards",
        "slide-in-up": "slideInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "flash-fade": "flashFade 0.4s ease-out forwards",
        glitch: "glitch 0.3s ease-in-out infinite alternate-reverse",
      },
      keyframes: {
        flashFade: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shake: {
          "10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
          "20%, 80%": { transform: "translate3d(2px, 0, 0)" },
          "30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
          "40%, 60%": { transform: "translate3d(4px, 0, 0)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "70%": { opacity: "1", transform: "scale(1.1)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        fadeOutUp: {
          "0%": { opacity: "0.6", transform: "translateY(0) scale(0.9)" },
          "100%": { opacity: "0", transform: "translateY(-50px) scale(0.6)" },
        },
        glitchSnap: {
          "0%": { transform: "translateX(0) skew(0)" },
          "20%": { transform: "translateX(-10px) skew(20deg)" },
          "40%": { transform: "translateX(10px) skew(-20deg)" },
          "60%": { transform: "translateX(-5px) skew(5deg)" },
          "100%": { transform: "translateX(0) skew(0)" },
        },
        scanlineWipe: {
          "0%": { top: "-20%", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { top: "120%", opacity: "0" },
        },
        slideInUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
}
