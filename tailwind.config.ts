import tailwindcssAnimate from "tailwindcss-animate";

import type { Config } from "tailwindcss";

/** Tokens du design system fintech. Les composants restent découplés de la palette. */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        separator: "hsl(var(--separator))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        finance: {
          DEFAULT: "hsl(var(--accent))",
          deep: "hsl(var(--accent-deep))",
          ink: "hsl(var(--accent-ink))",
          soft: "hsl(var(--accent-soft))",
        },
        // Alias conservés pour les vues historiques pendant la refonte.
        brand: {
          green: "hsl(var(--brand-green))",
          "green-deep": "hsl(var(--brand-green-deep))",
          "green-mid": "hsl(var(--brand-green-mid))",
          gold: "hsl(var(--gold))",
          "gold-bright": "hsl(var(--gold-bright))",
          blue: "hsl(var(--blue))",
          ink: "hsl(var(--ink))",
        },
        pastel: {
          green: "hsl(var(--pastel-green))",
          gold: "hsl(var(--pastel-gold))",
          blue: "hsl(var(--pastel-blue))",
        },
      },
      borderRadius: {
        pill: "999px",
        "2xl": "1.25rem",
        xl: "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Manrope = texte courant ; DM Sans = titres et montants.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hero: "0 28px 60px -30px rgba(7, 89, 126, 0.65)",
        card: "0 1px 2px rgba(15, 23, 42, 0.035), 0 10px 30px rgba(15, 23, 42, 0.035)",
        lift: "0 20px 55px -28px rgba(15, 23, 42, 0.28)",
      },
      backgroundImage: {
        "radial-app": "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--app-bg)) 100%)",
        "hero-green":
          "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent-deep)) 58%, hsl(var(--accent-ink)) 100%)",
        "balance-gradient":
          "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--accent-deep)) 58%, hsl(var(--accent-ink)) 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
