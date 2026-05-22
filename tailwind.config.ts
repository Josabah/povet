import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#feffff",
        ink: "#1d4351",
        sky: "#a9d4e4",
        moss: "#5d873a",
        mist: "#cedfe4",
        soot: "#0c1418",
        slate: {
          50: "#f6f8f9",
          100: "#e9eef1",
          200: "#cedfe4",
          300: "#a9d4e4",
          400: "#7aa6b5",
          500: "#4f7d8e",
          600: "#34626f",
          700: "#1d4351",
          800: "#152f39",
          900: "#0c1418"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"]
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 5vw + 1rem, 4.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2rem, 3vw + 1rem, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.5rem, 1.5vw + 1rem, 2rem)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "caption": ["0.9375rem", { lineHeight: "1.65", letterSpacing: "0" }],
        "meta": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.08em" }]
      },
      letterSpacing: {
        wider: "0.06em",
        widest: "0.18em"
      },
      maxWidth: {
        prose: "62ch",
        feed: "1400px"
      },
      transitionTimingFunction: {
        "ease-quiet": "cubic-bezier(0.22, 0.61, 0.36, 1)"
      },
      animation: {
        "fade-up": "fadeUp 700ms cubic-bezier(0.22, 0.61, 0.36, 1) both"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
