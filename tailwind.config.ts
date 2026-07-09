import tailwindcssAnimate from "tailwindcss-animate";

import type { Config } from "tailwindcss";

/**
 * Tokens du design system — DESIGN.md §4.3 (mapping Shadcn) et §4.1 (palette).
 * Toutes les couleurs sont référencées via `hsl(var(--token))` ; aucun hex en dur
 * dans les composants (CLAUDE.md § Code quality, DESIGN §3). Rouge Shadcn neutralisé
 * en encre (`--destructive`) car la palette proscrit le rouge (PRD §3, DESIGN §4.2).
 */
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
        // Palette de marque (DESIGN §4.1) exposée en tokens.
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
        "2xl": "1.5rem",
        xl: "1.125rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Instrument Sans = texte courant ; Sora = titres/montants (DESIGN §5).
        sans: ["var(--font-instrument)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // DESIGN §7 — ombres discrètes, jamais de halo dur.
        hero: "0 18px 40px -18px rgba(11,43,30,0.55)",
        card: "0 1px 2px rgba(20,30,25,0.03)",
      },
      backgroundImage: {
        "radial-app":
          "radial-gradient(1200px 600px at 50% -10%, hsl(var(--background-radial)) 0%, hsl(var(--app-bg)) 60%)",
        "hero-green":
          "linear-gradient(160deg, hsl(var(--brand-green-mid)) 0%, hsl(var(--brand-green-deep)) 100%)",
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
