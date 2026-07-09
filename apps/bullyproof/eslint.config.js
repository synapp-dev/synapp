import { nextJsConfig } from "@workspace/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    ignores: [
      "drizzle/schema.ts",
      "drizzle/relations.ts",
      "drizzle/**/*.ts",
      // Vendored/minified static assets (e.g. pdf.js worker) are not our source.
      "public/**",
    ],
  },
  {
    // Node CLI scripts run outside Next; give them Node globals so `process`
    // etc. are not flagged as undefined.
    files: ["scripts/**/*.{js,mjs,ts}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
  },
  {
    files: [
      "entities/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*"],
              message:
                "Do not import server modules in client code. Use @/lib/, @/types/, or entity model types.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      // Allow an underscore prefix to mark an intentionally-unused binding
      // (e.g. a parameter kept for a shared signature/API contract). Genuinely
      // dead imports and locals must still be removed, not underscored.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // styled-jsx (built into Next.js) uses `<style jsx>` / `<style jsx global>`;
      // these are valid props, not unknown DOM attributes.
      "react/no-unknown-property": ["warn", { ignore: ["jsx", "global"] }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
];
