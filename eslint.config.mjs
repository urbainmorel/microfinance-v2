import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";

/**
 * Qualité mécanisée (CLAUDE.md § Code quality & maintainability).
 * Gated par le hook pre-commit husky + lint-staged et par la CI.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "src/lib/database.types.ts",
    "supabase/**",
  ]),
  {
    files: ["**/*.{ts,tsx,js,mjs,cjs}"],
    plugins: { import: importPlugin },
    rules: {
      // Taille & forme — fichiers focalisés, petites fonctions à but unique.
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ["error", 12],
      // Hygiène — pas de console.log ; erreurs remontées explicitement.
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Imports ordonnés (CLAUDE.md § Hygiène).
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    // `any` interdit — utiliser `unknown` + narrowing (CLAUDE.md § Types are the contract).
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);

export default eslintConfig;
